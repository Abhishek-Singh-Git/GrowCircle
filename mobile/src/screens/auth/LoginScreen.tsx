/**
 * GrowCircle — Login Screen
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme/tokens';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

import { GoogleSignin } from '@react-native-google-signin/google-signin';

interface LoginScreenProps {
  onLoginSuccess: () => void;
  onSwitchToRegister: () => void;
}

export default function LoginScreen({
  onLoginSuccess,
  onSwitchToRegister,
}: LoginScreenProps) {
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleLogin = async () => {
    if (!credential.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await api.post<{
        user: { id: string; name: string; email: string; timezone: string; plan: string };
        accessToken: string;
        refreshToken: string;
      }>('/auth/login', { credential: credential.trim(), password });

      setAuth(data.user, data.accessToken, data.refreshToken);
      onLoginSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;

      if (!idToken) throw new Error('No ID token from Google');

      const data = await api.post<{
        user: { id: string; name: string; email: string; timezone: string; plan: string };
        accessToken: string;
        refreshToken: string;
      }>('/auth/login', { idToken });

      setAuth(data.user, data.accessToken, data.refreshToken);
      onLoginSuccess();
    } catch (err: any) {
      console.error('Google Signin Error', err);
      Alert.alert('Error', err.message || 'Google Login failed');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.logo}>🌳</Text>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Your circle missed you.</Text>
        </View>

        <View style={styles.form}>
          <TouchableOpacity
            onPress={handleGoogleLogin}
            disabled={isGoogleLoading || isLoading}
            activeOpacity={0.8}
            style={styles.googleBtn}
          >
            {isGoogleLoading ? (
              <ActivityIndicator color={Colors.textPrimary} />
            ) : (
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email or Phone</Text>
            <TextInput
              style={styles.input}
              value={credential}
              onChangeText={setCredential}
              placeholder="you@example.com"
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={Colors.textTertiary}
              secureTextEntry
            />
          </View>

          <TouchableOpacity style={styles.forgotBtn}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogin}
            disabled={isLoading || isGoogleLoading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={Colors.gradientPrimary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.button, isLoading && styles.buttonDisabled]}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.textPrimary} />
              ) : (
                <Text style={styles.buttonText}>Log In</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <TouchableOpacity onPress={onSwitchToRegister}>
            <Text style={styles.footerLink}> Sign up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logo: {
    fontSize: 56,
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.heading,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.body,
    color: Colors.textSecondary,
  },
  form: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  inputContainer: {
    gap: Spacing.xxs,
  },
  label: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.small,
    color: Colors.textSecondary,
    marginLeft: Spacing.xxs,
  },
  input: {
    height: 52,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    paddingHorizontal: Spacing.md,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.body,
    color: Colors.textPrimary,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
  },
  forgotText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.small,
    color: Colors.accentPrimary,
  },
  button: {
    height: 56,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.bodyLarge,
    color: Colors.textPrimary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.body,
    color: Colors.textSecondary,
  },
  footerLink: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.body,
    color: Colors.accentPrimary,
  },
  googleBtn: {
    height: 56,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surfaceHover,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    marginBottom: Spacing.sm,
  },
  googleBtnText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.bodyLarge,
    color: Colors.textPrimary,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.glassBorder,
  },
  dividerText: {
    marginHorizontal: Spacing.sm,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.small,
    color: Colors.textTertiary,
  },
});
