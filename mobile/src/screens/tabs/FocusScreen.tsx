/**
 * GrowCircle — Focus Tab (Digital Wellbeing)
 * Screen time visibility and partner intervention.
 * PRD Screen 12.4
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  RefreshControl,
  Linking,
  AppState,
} from 'react-native';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../theme/tokens';
import { useAuthStore } from '../../stores/authStore';
import ScreenTimeModule, { AppUsageEntry } from '../../native/ScreenTimeModule';
import { api } from '../../services/api';
import { useCircleStore } from '../../stores/circleStore';

type ViewMode = 'own' | 'partner';

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function FocusScreen() {
  const user = useAuthStore((s) => s.user);
  const activeCircleId = useCircleStore((s) => s.activeCircleId);

  const [viewMode, setViewMode] = useState<ViewMode>('own');
  const [hasPermission, setHasPermission] = useState(false);
  const [usageData, setUsageData] = useState<AppUsageEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState(0);

  const appState = useRef(AppState.currentState);

  // Check permission on mount and when app comes back to foreground
  useEffect(() => {
    checkPermission();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came back to foreground — re-check permission
        checkPermission();
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, []);

  const checkPermission = async () => {
    const granted = await ScreenTimeModule.hasPermission();
    setHasPermission(granted);
    // Always fetch usage data (shows mock if native module unavailable)
    fetchUsageData();
  };

  const handleRequestPermission = async () => {
    try {
      // Open Android Usage Access Settings directly
      await Linking.sendIntent('android.settings.USAGE_ACCESS_SETTINGS');
    } catch {
      // Fallback for older Android / if intent fails
      try {
        await Linking.openSettings();
      } catch (e) {
        console.warn('Cannot open settings:', e);
      }
    }
    // AppState listener will re-check when user returns
  };

  const [consentMissing, setConsentMissing] = useState(false);

  const fetchUsageData = useCallback(async () => {
    setIsLoading(true);
    setConsentMissing(false);
    try {
      if (viewMode === 'own') {
        const data = await ScreenTimeModule.getTodayUsage();
        // Sort by usage time descending
        const sorted = data.sort(
          (a, b) => b.totalTimeInForeground - a.totalTimeInForeground,
        );
        setUsageData(sorted);
        setTotalSeconds(
          sorted.reduce((sum, app) => sum + app.totalTimeInForeground, 0),
        );

        // Sync to backend
        if (activeCircleId) {
          const today = new Date().toISOString().split('T')[0];
          await api.post('/screen-time/sync', {
            date: today,
            platform: 'android',
            snapshots: sorted.map((app) => ({
              appPackage: app.packageName,
              appDisplayName: app.appName,
              durationSeconds: Math.round(app.totalTimeInForeground),
              openCount: null,
            })),
          }).catch(() => {}); // Silent fail on sync — offline-first
        }
      } else if (viewMode === 'partner') {
        const activeCircle = useCircleStore.getState().activeCircle;
        const partner = activeCircle?.members?.find((m: any) => m.id !== user?.id);
        if (!partner) {
          setUsageData([]);
          setTotalSeconds(0);
          return;
        }

        const today = new Date().toISOString().split('T')[0];
        try {
          const res: any = await api.get(`/screen-time?user_id=${partner.id}&date=${today}`);
          const apps = res.apps.map((app: any) => ({
            packageName: app.appPackage,
            appName: app.appDisplayName || app.appPackage,
            totalTimeInForeground: app.durationSeconds,
            lastTimeUsed: Date.now(),
          }));
          setUsageData(apps);
          setTotalSeconds(res.totalSeconds);
        } catch (err: any) {
          if (err?.message?.includes('403') || err?.response?.status === 403) {
            setConsentMissing(true);
            setUsageData([]);
            setTotalSeconds(0);
          } else {
            console.error('Failed to fetch partner data:', err);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch usage data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeCircleId, viewMode, user]);

  useEffect(() => {
    fetchUsageData();
  }, [viewMode, fetchUsageData]);

  const handleSendAlert = (app: AppUsageEntry) => {
    Alert.alert(
      'Send Focus Alert',
      `Send a gentle nudge about ${app.appName} to your partner?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Alert',
          onPress: async () => {
            try {
              await api.post('/interventions', {
                targetId: 'partner-id', // In production, selected partner
                circleId: activeCircleId,
                type: 'alert',
                appPackage: app.packageName,
              });
              Alert.alert('Sent!', 'Your partner has been notified.');
            } catch (err) {
              console.error('Alert failed:', err);
            }
          },
        },
      ],
    );
  };

  const handleSetTimeout = (app: AppUsageEntry) => {
    Alert.alert(
      'Set Timeout',
      `Lock ${app.appName} on your partner's device?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '15 min',
          onPress: () => initiateTimeout(app.packageName, 900),
        },
        {
          text: '30 min',
          onPress: () => initiateTimeout(app.packageName, 1800),
        },
        {
          text: '60 min',
          onPress: () => initiateTimeout(app.packageName, 3600),
        },
      ],
    );
  };

  const initiateTimeout = async (appPackage: string, durationSeconds: number) => {
    try {
      await api.post('/interventions', {
        targetId: 'partner-id', // In production, selected partner
        circleId: activeCircleId,
        type: 'timeout',
        appPackage,
        durationSeconds,
      });
      Alert.alert(
        'Timeout Set!',
        `${formatDuration(durationSeconds)} timeout initiated. Your partner will be notified.`,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to set timeout';
      Alert.alert('Error', message);
    }
  };

  // Get the maximum bar width for relative scaling
  const maxDuration = usageData.length > 0 ? usageData[0].totalTimeInForeground : 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchUsageData}
            tintColor={Colors.accentPrimary}
          />
        }
      >
        {/* Header */}
        <Text style={styles.pageTitle}>📱 Focus</Text>

        {/* View mode toggle */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggle, viewMode === 'own' && styles.toggleActive]}
            onPress={() => setViewMode('own')}
          >
            <Text
              style={[
                styles.toggleText,
                viewMode === 'own' && styles.toggleTextActive,
              ]}
            >
              My Screen Time
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggle,
              viewMode === 'partner' && styles.toggleActive,
            ]}
            onPress={() => setViewMode('partner')}
          >
            <Text
              style={[
                styles.toggleText,
                viewMode === 'partner' && styles.toggleTextActive,
              ]}
            >
              Partner's View
            </Text>
          </TouchableOpacity>
        </View>

        {!hasPermission && (
          /* Permission banner — non-blocking */
          <TouchableOpacity
            style={styles.permissionBanner}
            onPress={handleRequestPermission}
            activeOpacity={0.8}
          >
            <Text style={styles.permissionBannerEmoji}>🔒</Text>
            <Text style={styles.permissionBannerText}>
              Enable Screen Time Access for real data — Tap to open Settings
            </Text>
          </TouchableOpacity>
        )}

        {consentMissing ? (
          <View style={styles.consentMissingCard}>
            <Text style={styles.consentMissingEmoji}>🙈</Text>
            <Text style={styles.consentMissingTitle}>Partner Privacy On</Text>
            <Text style={styles.consentMissingText}>
              Your partner has chosen not to share their screen time data.
            </Text>
          </View>
        ) : (
          <>
            {/* Total screen time header */}
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>
                {viewMode === 'own' ? "Today's Screen Time" : "Partner's Screen Time"}
              </Text>
              <Text style={styles.totalValue}>
                {formatDuration(totalSeconds)}
              </Text>
            </View>

            {/* App usage list */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Top Apps</Text>

              {usageData.length === 0 && !isLoading && (
                <Text style={{ color: Colors.textSecondary, textAlign: 'center', marginTop: 20 }}>
                  No screen time data available.
                </Text>
              )}

              {usageData.map((app) => {
                const barWidth = Math.max(
                  (app.totalTimeInForeground / maxDuration) * 100,
                  5,
                );

                return (
                  <TouchableOpacity
                    key={app.packageName}
                    style={styles.appCard}
                    activeOpacity={viewMode === 'partner' ? 0.7 : 1}
                    onPress={
                      viewMode === 'partner'
                        ? () => handleSendAlert(app)
                        : undefined
                    }
                    onLongPress={
                      viewMode === 'partner'
                        ? () => handleSetTimeout(app)
                        : undefined
                    }
                  >
                    <View style={styles.appLeft}>
                      <View style={styles.appIcon}>
                        <Text style={styles.appIconText}>
                          {app.appName[0]}
                        </Text>
                      </View>
                      <View style={styles.appInfo}>
                        <Text style={styles.appName}>{app.appName}</Text>
                        <View style={styles.barContainer}>
                          <View
                            style={[
                              styles.bar,
                              {
                                width: `${barWidth}%`,
                                backgroundColor:
                                  app.totalTimeInForeground > 7200
                                    ? Colors.accentDanger
                                    : app.totalTimeInForeground > 3600
                                    ? Colors.accentWarning
                                    : Colors.accentPrimary,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    </View>
                    <Text style={styles.appDuration}>
                      {formatDuration(app.totalTimeInForeground)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Partner view hint */}
            {viewMode === 'partner' && (
              <View style={styles.hintCard}>
                <Text style={styles.hintEmoji}>💡</Text>
                <Text style={styles.hintText}>
                  Tap an app to send a focus alert.{'\n'}
                  Long press to set a timeout.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingTop: 60,
    paddingHorizontal: Spacing.md,
    paddingBottom: 100,
  },
  pageTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.heading,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: 3,
    marginBottom: Spacing.lg,
  },
  toggle: {
    flex: 1,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: Colors.accentPrimary,
  },
  toggleText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.small,
    color: Colors.textSecondary,
  },
  toggleTextActive: {
    color: Colors.textPrimary,
  },
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    padding: Spacing.sm,
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  permissionBannerEmoji: {
    fontSize: 16,
  },
  permissionBannerText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.small,
    color: Colors.accentWarning,
    flex: 1,
    lineHeight: 18,
  },
  totalCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  totalLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.small,
    color: Colors.textSecondary,
    marginBottom: Spacing.xxs,
  },
  totalValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 36,
    color: Colors.textPrimary,
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
  appCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
    ...Shadows.sm,
  },
  appLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm,
  },
  appIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.surfaceHover,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appIconText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 14,
    color: Colors.accentPrimary,
  },
  appInfo: {
    flex: 1,
    gap: 4,
  },
  appName: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.body,
    color: Colors.textPrimary,
  },
  barContainer: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surfaceHover,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 2,
  },
  appDuration: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.small,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
  },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 92, 252, 0.08)',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(124, 92, 252, 0.15)',
  },
  hintEmoji: {
    fontSize: 18,
  },
  hintText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.small,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  consentMissingCard: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: Spacing.xl,
    marginTop: Spacing.xl,
  },
  consentMissingEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  consentMissingTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.bodyLarge,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  consentMissingText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
