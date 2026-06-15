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
  Image,
  ActivityIndicator,
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
  const activeCircle = useCircleStore((s) => s.activeCircle);
  const activeCircleId = useCircleStore((s) => s.activeCircleId);

  const [viewMode, setViewMode] = useState<ViewMode>('own');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [usageData, setUsageData] = useState<AppUsageEntry[]>([]);
  const [unlocks, setUnlocks] = useState(0);
  const [weeklyTrend, setWeeklyTrend] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const maxDuration = Math.max(...usageData.map((app) => app.totalTimeInForeground), 1);
  const [isInterventionLoading, setIsInterventionLoading] = useState(false);

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
        const { apps, unlocks: dayUnlocks } = await ScreenTimeModule.getTodayUsage();
        const trend = await ScreenTimeModule.getWeeklyTrend();

        // Sort by usage time descending
        const sorted = apps.sort(
          (a, b) => b.totalTimeInForeground - a.totalTimeInForeground,
        );
        setUsageData(sorted);
        setUnlocks(dayUnlocks);
        setWeeklyTrend(trend);
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
        const partners = activeCircle?.members?.filter((m: any) => m.id !== user?.id) || [];
        const targetPartnerId = selectedPartnerId || (partners.length > 0 ? partners[0].id : null);

        if (!targetPartnerId) {
          setUsageData([]);
          setTotalSeconds(0);
          return;
        }

        const today = new Date().toISOString().split('T')[0];
        try {
          const res: any = await api.get(`/screen-time?user_id=${targetPartnerId}&date=${today}`);
          const apps = res.apps.map((app: any) => ({
            packageName: app.appPackage,
            appName: app.appDisplayName || app.appPackage,
            totalTimeInForeground: app.durationSeconds,
            lastTimeUsed: Date.now(),
          }));
          setUsageData(apps);
          setTotalSeconds(res.totalSeconds);
          setUnlocks(res.unlocks || 0);
          setWeeklyTrend(res.weeklyTrend || [0, 0, 0, 0, 0, 0, 0]);
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
  }, [activeCircleId, viewMode, user, selectedPartnerId]);

  useEffect(() => {
    fetchUsageData();
  }, [viewMode, fetchUsageData]);

  const handleSendAlert = (app: AppUsageEntry) => {
    if (isInterventionLoading) return;
    Alert.alert(
      'Send Focus Alert',
      `Send a gentle nudge about ${app.appName} to your partner?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Alert',
          onPress: async () => {
            let targetId = selectedPartnerId;
            if (!targetId) {
              const partners = activeCircle?.members?.filter((m: any) => m.id !== user?.id) || [];
              if (partners.length === 0) return;
              targetId = partners[0]?.id || null;
              if (targetId) {
                setSelectedPartnerId(targetId);
              }
            }
            if (!targetId) return;

            setIsInterventionLoading(true);
            try {
              await api.post('/interventions', {
                targetId,
                circleId: activeCircleId,
                type: 'alert',
                appPackage: app.packageName,
              });
              Alert.alert('Sent!', 'Your partner has been notified.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to send focus alert.');
            } finally {
              setIsInterventionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleSetTimeout = (app: AppUsageEntry) => {
    if (isInterventionLoading) return;
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
    const targetId = selectedPartnerId || activeCircle?.members?.filter((m: any) => m.id !== user?.id)?.[0]?.id;
    if (!targetId) return;
    setIsInterventionLoading(true);
    try {
      await api.post('/interventions', {
        targetId,
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
    } finally {
      setIsInterventionLoading(false);
    }
  };

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
        <View style={styles.header}>
          <Text style={styles.pageTitle}>📱 Focus</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggle, viewMode === 'own' && styles.toggleActive]}
              onPress={() => setViewMode('own')}
            >
              <Text style={[styles.toggleText, viewMode === 'own' && styles.toggleTextActive]}>Me</Text>
            </TouchableOpacity>
            {(activeCircle?.members?.filter((m: any) => m?.id !== user?.id) || []).map((m: any) => (
              <TouchableOpacity
                key={m.id}
                style={[
                  styles.toggle,
                  viewMode === 'partner' && selectedPartnerId === m.id && styles.toggleActive,
                ]}
                onPress={() => { setViewMode('partner'); setSelectedPartnerId(m.id); }}
              >
                <Text
                  style={[
                    styles.toggleText,
                    viewMode === 'partner' && selectedPartnerId === m.id && styles.toggleTextActive,
                  ]}
                >
                  {m.name ? m.name.split(' ')[0] : 'Partner'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {!hasPermission && (
          <TouchableOpacity
            style={styles.permissionBanner}
            onPress={handleRequestPermission}
            activeOpacity={0.8}
          >
            <Text style={styles.permissionBannerEmoji}>🔒</Text>
            <Text style={styles.permissionBannerText}>
              Enable Screen Time Access for real data
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
            {/* Hero Section */}
            <View style={styles.heroSection}>
              <View style={styles.heroContent}>
                <Text style={styles.heroLabel}>
                  {viewMode === 'own' ? "Today's Screen Time" : "Partner's Screen Time"}
                </Text>
                <Text style={styles.heroValue}>{formatDuration(totalSeconds)}</Text>
                {weeklyTrend.length > 5 && (
                  <View style={styles.heroTrend}>
                    <Text style={styles.heroTrendText}>
                      {totalSeconds > weeklyTrend[5] * 60
                        ? `↑ ${formatDuration(totalSeconds - weeklyTrend[5] * 60)} more than Yesterday`
                        : `↓ ${formatDuration(weeklyTrend[5] * 60 - totalSeconds)} from Yesterday`}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Quick Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>Most Used</Text>
                <Text style={styles.statBoxValue} numberOfLines={1}>
                  {usageData[0]?.appName || 'None'}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>Unlocks</Text>
                <Text style={styles.statBoxValue}>{unlocks}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>Focus Score</Text>
                <Text style={[
                  styles.statBoxValue, 
                  { color: totalSeconds > 18000 ? Colors.accentDanger : totalSeconds > 10800 ? Colors.accentWarning : Colors.accentSuccess }
                ]}>
                   {Math.max(0, 100 - Math.floor(totalSeconds / 360))}
                </Text>
              </View>
            </View>

            {/* Weekly Trend */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Weekly Trend</Text>
              <View style={styles.trendCard}>
                 <View style={styles.trendChart}>
                    {weeklyTrend.map((val, i) => {
                      const maxTrend = Math.max(...weeklyTrend, 1);
                      const barHeight = Math.max((val / maxTrend) * 100, 5);
                      return (
                        <View key={i} style={[styles.trendBar, { height: barHeight, backgroundColor: i === 6 ? Colors.accentPrimary : Colors.surfaceHover }]} />
                      );
                    })}
                 </View>
                 <View style={styles.trendLabels}>
                    {['M','T','W','T','F','S','S'].map((d, i) => <Text key={`${d}-${i}`} style={styles.trendLabelText}>{d}</Text>)}
                 </View>
              </View>
            </View>

            {/* App usage list */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>App Breakdown</Text>

              {usageData.length === 0 && !isLoading && (
                <Text style={{ color: Colors.textSecondary, textAlign: 'center', marginTop: 20 }}>
                  No screen time data available.
                </Text>
              )}

              {usageData.slice(0, 8).map((app) => {
                const barWidth = Math.max((app.totalTimeInForeground / maxDuration) * 100, 5);

                return (
                  <TouchableOpacity
                    key={app.packageName}
                    style={[styles.appCard, isInterventionLoading && { opacity: 0.6 }]}
                    activeOpacity={viewMode === 'partner' ? 0.7 : 1}
                    onPress={
                      viewMode === 'partner' && !isInterventionLoading
                        ? () => handleSendAlert(app)
                        : undefined
                    }
                    onLongPress={
                      viewMode === 'partner' && !isInterventionLoading
                        ? () => handleSetTimeout(app)
                        : undefined
                    }
                    disabled={isInterventionLoading}
                  >
                    <View style={styles.appLeft}>
                      <View style={[styles.appIcon, app.iconBase64 && { backgroundColor: 'transparent' }]}>
                        {app.iconBase64 ? (
                          <Image source={{ uri: `data:image/png;base64,${app.iconBase64}` }} style={{ width: 32, height: 32, borderRadius: 8 }} />
                        ) : (
                          <Text style={styles.appIconText}>
                            {app.appName[0]}
                          </Text>
                        )}
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
    backgroundColor: 'transparent',
  },
  scroll: {
    paddingTop: 60,
    paddingHorizontal: Spacing.md,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  pageTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.heading,
    color: Colors.textPrimary,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    padding: 3,
  },
  toggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    minWidth: 50,
  },
  toggleActive: {
    backgroundColor: Colors.accentPrimary,
  },
  toggleText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 10,
    color: Colors.textSecondary,
  },
  toggleTextActive: {
    color: Colors.textPrimary,
  },
  heroSection: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.small,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  heroValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 48,
    color: Colors.textPrimary,
  },
  heroTrend: {
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginTop: 8,
  },
  heroTrendText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 12,
    color: Colors.accentSuccess,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  statBoxLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 10,
    color: Colors.textTertiary,
    marginBottom: 4,
  },
  statBoxValue: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.bodyLarge,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  trendCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  trendChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 100,
    paddingHorizontal: Spacing.sm,
  },
  trendBar: {
    width: 30,
    borderRadius: 4,
  },
  trendLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: Spacing.sm,
  },
  trendLabelText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 10,
    color: Colors.textTertiary,
    width: 30,
    textAlign: 'center',
  },
  appCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  appLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm,
  },
  appIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.surfaceHover,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appIconText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 12,
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
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.surfaceHover,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
  },
  appDuration: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.small,
    color: Colors.textSecondary,
  },
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    gap: 8,
  },
  permissionBannerEmoji: { fontSize: 16 },
  permissionBannerText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 12,
    color: Colors.accentWarning,
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
  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 92, 252, 0.08)',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(124, 92, 252, 0.15)',
    marginTop: Spacing.md,
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
});
