/**
 * GrowCircle — Profile Tab
 * User's personal analytics, badges, streaks, and settings.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Switch, Alert, AppState, Image } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme/tokens';
import { useAuthStore } from '../../stores/authStore';
import { useCircleStore } from '../../stores/circleStore';
import { useGoalsStore } from '../../stores/goalsStore';
import { usePreferences } from '../../hooks/usePreferences';
import { api } from '../../services/api';
import Constants from 'expo-constants';
import ScreenTimeModule from '../../native/ScreenTimeModule';

const MOCK_BADGES = [
  { id: '1', emoji: '🔥', name: 'First Streak', earned: true },
  { id: '2', emoji: '🌟', name: 'Circle Founder', earned: true },
  { id: '3', emoji: '💎', name: 'Diamond Hands', earned: false },
  { id: '4', emoji: '🏆', name: 'Challenge Winner', earned: false },
  { id: '5', emoji: '📸', name: 'Proof Master', earned: false },
  { id: '6', emoji: '🌳', name: 'Garden Keeper', earned: false },
];

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { preferences, updatePreference } = usePreferences();
  const activeCircle = useCircleStore((s) => s.activeCircle);
  const todayInstances = useGoalsStore((s) => s.todayInstances);
  const isFocused = useIsFocused();

  const [pushEnabled, setPushEnabled] = useState(false);
  const [screenTimeEnabled, setScreenTimeEnabled] = useState(false);

  const prefsRef = React.useRef(preferences);
  useEffect(() => {
    prefsRef.current = preferences;
  }, [preferences]);

  const checkPermissions = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setPushEnabled(status === 'granted');

      const usageOk = await ScreenTimeModule.hasPermission();
      setScreenTimeEnabled(usageOk);
      
      const currentPrefs = prefsRef.current;
      if (currentPrefs && currentPrefs.screenTimeConsent !== usageOk) {
        updatePreference('screenTimeConsent', usageOk);
      }
    } catch (err) {
      console.warn('Error checking permissions:', err);
    }
  };

  useEffect(() => {
    checkPermissions();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkPermissions();
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (isFocused) {
      checkPermissions();
    }
  }, [isFocused]);

  const handlePushToggle = async (val: boolean) => {
    // Permanent Bypass for OS check as requested
    updatePreference('notifyNudge', val);
    updatePreference('notifyPartnerLog', val);
    updatePreference('notifyChallenge', val);
    setPushEnabled(val);

    if (val) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        try {
          const projectId = Constants.expoConfig?.extra?.eas?.projectId || 'f13f89a3-3e7a-47fa-a6f6-ad7da16ab4b2';
          const pushToken = await Notifications.getExpoPushTokenAsync({ projectId });
          await api.patch('/users/me', { fcmToken: pushToken.data });
        } catch (e) {
          console.warn('Failed to register push token', e);
        }
      }
    } else {
      try {
        await api.patch('/users/me', { fcmToken: null });
      } catch (e) {
        // ignore
      }
    }
  };

  const handleScreenTimeToggle = async (val: boolean) => {
    if (val) {
      const usageOk = await ScreenTimeModule.hasPermission();
      if (!usageOk) {
        try {
          const { Linking } = require('react-native');
          await Linking.sendIntent('android.settings.USAGE_ACCESS_SETTINGS');
        } catch {
          const { Linking } = require('react-native');
          await Linking.openSettings();
        }
        // State will update when the app returns from settings via AppState listener
      } else {
        setScreenTimeEnabled(true);
        updatePreference('screenTimeConsent', true);
      }
    } else {
      setScreenTimeEnabled(false);
      updatePreference('screenTimeConsent', false);
    }
  };

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to change your avatar.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: 'avatar.jpg',
        type: 'image/jpeg'
      } as any);

      try {
        const uploadRes: any = await api.postForm('/uploads/image', formData);
        const avatarUrl = uploadRes.thumbnailUrl || uploadRes.url;
        await api.patch('/users/me', { avatarUrl });
        
        // Update user state locally
        useAuthStore.setState({ user: { ...user!, avatarUrl } });
      } catch (err) {
        console.error('Failed to upload avatar', err);
        Alert.alert('Upload Failed', 'There was an issue uploading your photo. Please try again.');
      }
    }
  };

  // Compute real stats from store
  const completedToday = todayInstances.filter((i) => i.status === 'completed').length;
  const totalToday = todayInstances.length;

  const myCircleMember = activeCircle?.members?.find((m: any) => m.id === user?.id);
  const streak = myCircleMember?.streak ?? 0;
  const totalXp = myCircleMember?.xp ?? 0;
  const level = myCircleMember?.level ?? 0;

  const xpDisplay = `${totalXp} XP`;
  const levelDisplay = activeCircle ? `Level ${level}` : 'Solo';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar & Name */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.avatar} onPress={handlePickAvatar} activeOpacity={0.8}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarEmoji}>
                {user?.name ? user.name[0].toUpperCase() : '?'}
              </Text>
            )}
            <View style={styles.editAvatarBadge}>
              <Text style={styles.editAvatarEmoji}>✏️</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>{user?.name || 'GrowCircle User'}</Text>
          <Text style={styles.email}>{user?.email || ''}</Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{completedToday}/{totalToday}</Text>
            <Text style={styles.statLabel}>Done Today</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{xpDisplay}</Text>
            <Text style={styles.statLabel}>Total XP</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{streak} 🔥</Text>
            <Text style={styles.statLabel}>Current Streak</Text>
          </View>
        </View>

        {/* Score dimensions */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: Spacing.sm }}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Your Scores</Text>
            <Text style={{ fontSize: 12, color: Colors.textTertiary, paddingBottom: 2 }}>(Coming Soon)</Text>
          </View>
          <View style={styles.scoresGrid}>
            {[
              { name: 'Performance', score: 82, color: Colors.accentPrimary },
              { name: 'Consistency', score: 71, color: Colors.accentSecondary },
              { name: 'Growth', score: 65, color: Colors.accentSuccess },
              { name: 'Discipline', score: 88, color: Colors.accentWarning },
              { name: 'Accountability', score: 90, color: Colors.accentFire },
            ].map((dim) => (
              <View key={dim.name} style={styles.scoreItem}>
                <View style={styles.scoreBarBg}>
                  <View
                    style={[
                      styles.scoreBarFill,
                      { width: `${dim.score}%`, backgroundColor: dim.color },
                    ]}
                  />
                </View>
                <View style={styles.scoreLabels}>
                  <Text style={styles.scoreName}>{dim.name}</Text>
                  <Text style={[styles.scoreValue, { color: dim.color }]}>{dim.score}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Badges */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: Spacing.sm }}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Badges</Text>
            <Text style={{ fontSize: 12, color: Colors.textTertiary, paddingBottom: 2 }}>(Coming Soon)</Text>
          </View>
          <View style={styles.badgeGrid}>
            {MOCK_BADGES.map((badge) => (
              <View
                key={badge.id}
                style={[styles.badge, !badge.earned && styles.badgeLocked]}
              >
                <Text style={[styles.badgeEmoji, !badge.earned && styles.badgeEmojiLocked]}>
                  {badge.emoji}
                </Text>
                <Text style={[styles.badgeName, !badge.earned && styles.badgeNameLocked]}>
                  {badge.name}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Permissions</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Share Late Night Activity</Text>
                <Text style={styles.settingDesc}>Let your circle know if you're up past 11:30 PM</Text>
              </View>
              <Switch
                value={preferences?.shareLateNightActivity ?? false}
                onValueChange={(val) => updatePreference('shareLateNightActivity', val)}
                trackColor={{ false: Colors.surfaceHover, true: Colors.accentPrimary }}
                thumbColor={Colors.textPrimary}
              />
            </View>

            <View style={styles.settingDivider} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Timeout Consent</Text>
                <Text style={styles.settingDesc}>Allow partners to lock your distracting apps</Text>
              </View>
              <Switch
                value={preferences?.timeoutConsent ?? false}
                onValueChange={(val) => updatePreference('timeoutConsent', val)}
                trackColor={{ false: Colors.surfaceHover, true: Colors.accentPrimary }}
                thumbColor={Colors.textPrimary}
              />
            </View>

            <View style={styles.settingDivider} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Push Notifications</Text>
                <Text style={styles.settingDesc}>Receive updates from your circle and goals</Text>
              </View>
              <Switch
                value={pushEnabled}
                onValueChange={handlePushToggle}
                trackColor={{ false: Colors.surfaceHover, true: Colors.accentPrimary }}
                thumbColor={Colors.textPrimary}
              />
            </View>

            <View style={styles.settingDivider} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Screen Time Access</Text>
                <Text style={styles.settingDesc}>Enable tracking of your real app usage stats</Text>
              </View>
              <Switch
                value={screenTimeEnabled}
                onValueChange={handleScreenTimeToggle}
                trackColor={{ false: Colors.surfaceHover, true: Colors.accentPrimary }}
                thumbColor={Colors.textPrimary}
              />
            </View>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scroll: {
    paddingTop: 60,
    paddingHorizontal: Spacing.md,
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.accentPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    position: 'relative',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  editAvatarEmoji: {
    fontSize: 10,
  },
  avatarEmoji: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 32,
    color: Colors.textPrimary,
  },
  name: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.title,
    color: Colors.textPrimary,
  },
  email: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.small,
    color: Colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.title,
    color: Colors.textPrimary,
  },
  statLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.caption,
    color: Colors.textSecondary,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.glassBorder,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.bodyLarge,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  scoresGrid: {
    gap: Spacing.sm,
  },
  scoreItem: {
    gap: 4,
  },
  scoreBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.surfaceHover,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  scoreLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scoreName: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.caption,
    color: Colors.textSecondary,
  },
  scoreValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.caption,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  badge: {
    width: '30%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: Spacing.sm,
    alignItems: 'center',
    gap: 4,
  },
  badgeLocked: {
    opacity: 0.4,
  },
  badgeEmoji: {
    fontSize: 28,
  },
  badgeEmojiLocked: {
    filter: 'grayscale(100%)',
  },
  badgeName: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 10,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  badgeNameLocked: {
    color: Colors.textTertiary,
  },
  settingsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
    paddingRight: Spacing.sm,
  },
  settingTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.body,
    color: Colors.textPrimary,
  },
  settingDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.small,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  settingDivider: {
    height: 1,
    backgroundColor: Colors.glassBorder,
    marginLeft: Spacing.md,
  },
  logoutBtn: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  logoutText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.body,
    color: Colors.accentDanger,
  },
});
