/**
 * GrowCircle — API Client
 * Centralized HTTP client with JWT auth, token refresh, and error handling.
 */
import { useAuthStore } from '../stores/authStore';

export const BASE_URL = __DEV__
  ? 'http://10.0.2.2:3001/v1'  // Android emulator → host machine
  : 'https://growcircle-production.up.railway.app/v1'; // Live Railway Backend

interface ApiError {
  code: string;
  message: string;
  field?: string;
}

import AsyncStorage from '@react-native-async-storage/async-storage';

export class OfflineError extends Error {
  constructor() {
    super('Offline - Request Queued');
    this.name = 'OfflineError';
  }
}

interface QueuedRequest {
  id: string;
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  body?: Record<string, unknown>;
  timestamp: number;
}

class ApiClient {
  private async getHeaders(): Promise<Record<string, string>> {
    const token = useAuthStore.getState().accessToken;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 401) {
      // 401 will be handled by the calling method for retry logic
      throw { status: 401 };
    }

    const data = await response.json();

    if (!response.ok) {
      const error = data.error as ApiError;
      throw new Error(error?.message || 'Something went wrong');
    }

    return data as T;
  }

  private async refreshToken(): Promise<boolean> {
    const { refreshToken, setAuth, logout } = useAuthStore.getState();
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        logout();
        return false;
      }

      const data = await res.json();
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        setAuth(currentUser, data.accessToken, data.refreshToken);
      }
      return true;
    } catch {
      logout();
      return false;
    }
  }

  private async executeRequest(method: string, url: string, body?: string): Promise<Response> {
    const headers = await this.getHeaders();
    return fetch(url, {
      method,
      headers,
      ...(body ? { body } : {}),
    });
  }

  private async requestWithRetry<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const url = `${BASE_URL}${path}`;
    const bodyStr = body ? JSON.stringify(body) : undefined;

    let res = await this.executeRequest(method, url, bodyStr);

    if (res.status === 401) {
      const refreshed = await this.refreshToken();
      if (!refreshed) {
        useAuthStore.getState().logout();
        throw new Error('Session expired. Please log in again.');
      }
      // Retry with new token
      res = await this.executeRequest(method, url, bodyStr);
    }

    return this.handleResponse<T>(res);
  }

  async get<T>(path: string): Promise<T> {
    return this.requestWithRetry<T>('GET', path);
  }

  private async queueRequest(method: 'POST' | 'PUT' | 'DELETE' | 'PATCH', path: string, body?: Record<string, unknown>) {
    try {
      const queueStr = await AsyncStorage.getItem('offlineQueue');
      const queue: QueuedRequest[] = queueStr ? JSON.parse(queueStr) : [];
      queue.push({
        id: Math.random().toString(36).substring(2, 15),
        method,
        path,
        body,
        timestamp: Date.now(),
      });
      await AsyncStorage.setItem('offlineQueue', JSON.stringify(queue));
    } catch (e) {
      console.error('Failed to queue request', e);
    }
  }

  async post<T>(path: string, body?: Record<string, unknown>): Promise<T> {
    try {
      return await this.requestWithRetry<T>('POST', path, body);
    } catch (error: any) {
      if (error.message === 'Network request failed' || error.message === 'Failed to fetch') {
        await this.queueRequest('POST', path, body);
        throw new OfflineError();
      }
      throw error;
    }
  }

  async patch<T>(path: string, body?: Record<string, unknown>): Promise<T> {
    try {
      return await this.requestWithRetry<T>('PATCH', path, body);
    } catch (error: any) {
      if (error.message === 'Network request failed' || error.message === 'Failed to fetch') {
        await this.queueRequest('PATCH', path, body);
        throw new OfflineError();
      }
      throw error;
    }
  }

  async put<T>(path: string, body?: Record<string, unknown>): Promise<T> {
    try {
      return await this.requestWithRetry<T>('PUT', path, body);
    } catch (error: any) {
      if (error.message === 'Network request failed' || error.message === 'Failed to fetch') {
        await this.queueRequest('PUT', path, body);
        throw new OfflineError();
      }
      throw error;
    }
  }

  async delete<T>(path: string): Promise<T> {
    try {
      return await this.requestWithRetry<T>('DELETE', path);
    } catch (error: any) {
      if (error.message === 'Network request failed' || error.message === 'Failed to fetch') {
        await this.queueRequest('DELETE', path);
        throw new OfflineError();
      }
      throw error;
    }
  }
}

export const api = new ApiClient();
