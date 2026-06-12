/**
 * GrowCircle — Sync Manager
 * Reads the offline queue from AsyncStorage when network is restored
 * and sequentially attempts to process them.
 */
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, OfflineError } from './api';

export interface QueuedRequest {
  id: string;
  method: 'POST' | 'PUT' | 'DELETE';
  path: string;
  body?: Record<string, unknown>;
  timestamp: number;
}

class SyncManager {
  private isSyncing = false;

  constructor() {
    NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        this.processQueue();
      }
    });
  }

  async processQueue() {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const queueStr = await AsyncStorage.getItem('offlineQueue');
      if (!queueStr) {
        this.isSyncing = false;
        return;
      }

      let queue: QueuedRequest[] = [];
      try {
        queue = JSON.parse(queueStr);
      } catch (parseErr) {
        console.error('[SyncManager] Corrupted offline queue. Clearing storage.', parseErr);
        await AsyncStorage.removeItem('offlineQueue');
        this.isSyncing = false;
        return;
      }
      if (queue.length === 0) {
        this.isSyncing = false;
        return;
      }

      console.log(`[SyncManager] Found ${queue.length} items in offline queue.`);

      const remainingQueue: QueuedRequest[] = [];

      for (const req of queue) {
        try {
          console.log(`[SyncManager] Re-trying ${req.method} ${req.path}`);
          if (req.method === 'POST') {
            await api.post(req.path, req.body);
          } else if (req.method === 'PUT') {
            await api.put(req.path, req.body);
          } else if (req.method === 'DELETE') {
            await api.delete(req.path);
          }
          // Success: don't add to remainingQueue
          console.log(`[SyncManager] Successfully synced ${req.id}`);
        } catch (error: any) {
          if (error instanceof OfflineError || error.message === 'Network request failed' || error.message === 'Failed to fetch') {
            // Still offline, break loop and keep remaining
            console.log(`[SyncManager] Network error during sync, stopping.`);
            remainingQueue.push(req);
            break; 
          } else {
            // A server error or bad request (4xx, 5xx). 
            // In a robust system, maybe retry 5xx. Here we'll just discard it to avoid infinite loops.
            console.warn(`[SyncManager] Unrecoverable error syncing ${req.id}, discarding:`, error.message);
          }
        }
      }

      // If we broke early, append the rest of the original queue
      const processedIndex = queue.length - remainingQueue.length;
      if (processedIndex < queue.length) {
        // Find which items were completely untouched
        for (let i = processedIndex + 1; i < queue.length; i++) {
            remainingQueue.push(queue[i]);
        }
      }

      await AsyncStorage.setItem('offlineQueue', JSON.stringify(remainingQueue));
    } catch (e) {
      console.error('[SyncManager] Error processing queue', e);
    } finally {
      this.isSyncing = false;
    }
  }
}

export const syncManager = new SyncManager();
