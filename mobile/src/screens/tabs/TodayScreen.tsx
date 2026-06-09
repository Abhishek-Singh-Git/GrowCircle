/**
 * GrowCircle — Today Tab (Home Screen)
 * The daily accountability dashboard.
 * Shows: Omnipresent Orbit, partner status, today's goal cards, live feed.
 */
import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme/tokens';
import { useAuthStore } from '../../stores/authStore';
import { useCircleStore } from '../../stores/circleStore';
import { useGoalsStore } from '../../stores/goalsStore';
import { useCircleFeed } from '../../hooks/useCircleFeed';
import { useSendNudge } from '../../hooks/useNudges';
import { useFetchTodayGoals, useCompleteGoal } from '../../hooks/useGoals';
import GoalCard from '../../components/GoalCard';
import { Alert } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

export default function TodayScreen() {
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const activeCircle = useCircleStore((s) => s.activeCircle);
  
  const { refetch: refetchGoals } = useFetchTodayGoals();
  const { feed, isLoading: isFeedLoading, refetch: refetchFeed } = useCircleFeed();
  const completeGoal = useCompleteGoal();
  const sendNudge = useSendNudge();
  
  const todayInstances = useGoalsStore((s) => s.todayInstances);
  const isLoading = useGoalsStore((s) => s.isLoading) || isFeedLoading;
  const upLatePartners = useCircleStore((s) => s.upLatePartners);

  const activeGoals = todayInstances.filter((i) => i.status !== 'completed');
  const completedGoals = todayInstances.filter((i) => i.status === 'completed');
  
  const completedCount = completedGoals.length;
  const totalCount = todayInstances.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const partners = feed.filter((m) => m.user.id !== user?.id);

  const handleRefresh = useCallback(() => {
    refetchGoals();
    refetchFeed();
  }, [refetchGoals, refetchFeed]);

  const handleCompleteGoal = async (instanceId: string) => {
    try {
      await completeGoal(instanceId);
    } catch (err) {
      console.log('Error completing goal:', err);
    }
  };

  const handleSendNudge = async (targetId: string, goalId?: string, goalName?: string) => {
    try {
      await sendNudge(targetId, goalId);
      Alert.alert('Nudge sent!', goalName ? `Reminded them about ${goalName}.` : 'General reminder sent.');
    } catch (err: any) {
      Alert.alert('Oops', err.message || 'Failed to send nudge. You might be rate-limited.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={Colors.accentPrimary}
          />
        }
      >
        {/* Header with partner orbit placeholder */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>
                Good {getTimeOfDay()}, {user?.name?.split(' ')[0] || 'there'} 👋
              </Text>
              <Text style={styles.circleLabel}>
                {activeCircle?.name || 'Solo Mode'}
              </Text>
            </View>

            {/* Header Right Actions */}
            <View style={styles.headerRight}>
              <TouchableOpacity 
                style={styles.chatBtn}
                onPress={() => {
                  if (activeCircle) {
                    (navigation as any).navigate('Chat');
                  } else {
                    Alert.alert('Solo Mode', 'Join a circle to use chat.');
                  }
                }}
              >
                <Text style={styles.chatEmoji}>💬</Text>
              </TouchableOpacity>
              
              {/* Streak badge */}
              <View style={styles.streakBadge}>
                <Text style={styles.streakEmoji}>🔥</Text>
                <Text style={styles.streakCount}>
                  {activeCircle?.members?.find((m: any) => m.id === user?.id)?.streak ?? 0}
                </Text>
              </View>
            </View>
          </View>

          {/* Progress ring */}
          <View style={styles.progressContainer}>
            <View style={styles.progressRing}>
              <Text style={styles.progressPercent}>{progressPercent}%</Text>
              <Text style={styles.progressLabel}>
                {completedCount}/{totalCount} done
              </Text>
            </View>
          </View>
        </View>

        {/* Partners strip or Circle Management */}
        {!activeCircle ? (
          <View style={styles.soloModeContainer}>
            <Text style={styles.soloModeTitle}>You're in Solo Mode</Text>
            <Text style={styles.soloModeDesc}>Everything is better together. Create a circle to stay accountable.</Text>
            <TouchableOpacity 
              style={styles.primaryBtn} 
              onPress={() => (navigation as any).navigate('CircleManager')}
            >
              <Text style={styles.primaryBtnText}>Create a Circle</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.secondaryBtn} 
              onPress={() => (navigation as any).navigate('CircleManager')}
            >
              <Text style={styles.secondaryBtnText}>Join with Invite Code</Text>
            </TouchableOpacity>
          </View>
        ) : partners.length === 0 ? (
          <View style={styles.soloModeContainer}>
            <Text style={styles.soloModeTitle}>Circle Created!</Text>
            <Text style={styles.soloModeDesc}>You're the only one here. Invite your partner to start growing together.</Text>
            <TouchableOpacity 
              style={styles.primaryBtn} 
              onPress={() => (navigation as any).navigate('CircleManager')}
            >
              <Text style={styles.primaryBtnText}>View Invite Code</Text>
            </TouchableOpacity>
          </View>
        ) : (
          partners.map((partner) => (
          <View key={partner.user.id} style={styles.partnerContainer}>
            <View style={styles.partnerStrip}>
              <View style={styles.partnerAvatar}>
                <Text style={styles.partnerEmoji}>👤</Text>
                <View style={styles.presenceDot} />
              </View>
              <View style={styles.partnerInfo}>
                <Text style={styles.partnerName}>
                  {partner.user.name}
                  {upLatePartners.includes(partner.user.id) && ' 🦉'}
                </Text>
                <Text style={styles.partnerStatus}>
                  {partner.todaySummary.completed}/{partner.todaySummary.totalGoals} goals done today
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.nudgeBtn}
                onPress={() => handleSendNudge(partner.user.id)}
              >
                <Text style={styles.nudgeEmoji}>🔔</Text>
              </TouchableOpacity>
            </View>

            {/* Partner's incomplete goals */}
            {partner.goalInstances.filter(i => i.status !== 'completed').length > 0 && (
              <View style={styles.partnerGoalsList}>
                {partner.goalInstances
                  .filter(i => i.status !== 'completed')
                  .map(instance => (
                  <View key={instance.id} style={styles.partnerGoalRow}>
                    <Text style={styles.partnerGoalEmoji}>{instance.goal.categoryEmoji || '🎯'}</Text>
                    <Text style={styles.partnerGoalName} numberOfLines={1}>{instance.goal.name}</Text>
                    <TouchableOpacity 
                      style={styles.smallNudgeBtn}
                      onPress={() => handleSendNudge(partner.user.id, instance.goal.id, instance.goal.name)}
                    >
                      <Text style={styles.smallNudgeText}>Nudge</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )))}

        {/* Goal cards */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Goals</Text>
            <TouchableOpacity
              style={styles.addGoalBtn}
              onPress={() => (navigation as any).navigate('AddGoal')}
            >
              <Text style={styles.addGoalBtnText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {isLoading && totalCount === 0 ? (
            <ActivityIndicator size="large" color={Colors.accentPrimary} style={{ marginVertical: 40 }} />
          ) : totalCount === 0 ? (
            <Text style={styles.emptyText}>No goals scheduled for today.</Text>
          ) : activeGoals.length === 0 ? (
            <Text style={styles.emptyText}>All active goals completed!</Text>
          ) : (
            <View style={{ gap: Spacing.sm }}>
              {activeGoals.map((instance) => (
                <Animated.View key={instance.id} layout={LinearTransition}>
                  <GoalCard
                    id={instance.id}
                    name={instance.goal.name}
                    emoji={instance.goal.categoryEmoji || '🎯'}
                    category={instance.goal.category}
                    targetValue={instance.targetValue}
                    unit={instance.goal.targetUnit}
                    status={instance.status}
                    onComplete={handleCompleteGoal}
                  />
                </Animated.View>
              ))}
            </View>
          )}
        </View>

        {completedGoals.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Completed</Text>
            </View>
            <View style={{ gap: Spacing.sm }}>
              {completedGoals.map((instance) => (
                <Animated.View key={instance.id} layout={LinearTransition}>
                  <GoalCard
                    id={instance.id}
                    name={instance.goal.name}
                    emoji={instance.goal.categoryEmoji || '🎯'}
                    category={instance.goal.category}
                    targetValue={instance.targetValue}
                    unit={instance.goal.targetUnit}
                    status={instance.status}
                    onComplete={handleCompleteGoal}
                  />
                </Animated.View>
              ))}
            </View>
          </View>
        )}

        {/* Quick action: Hold to Complete hint */}
        <View style={styles.hintCard}>
          <Text style={styles.hintEmoji}>💡</Text>
          <Text style={styles.hintText}>
            Hold a goal card to complete it with the charge animation
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
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
  header: {
    marginBottom: Spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  chatBtn: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatEmoji: {
    fontSize: 16,
  },
  greeting: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.title,
    color: Colors.textPrimary,
  },
  circleLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.small,
    color: Colors.accentPrimary,
    marginTop: 2,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    gap: 4,
  },
  streakEmoji: {
    fontSize: 16,
  },
  streakCount: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.body,
    color: Colors.accentFire,
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: Colors.accentPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  progressPercent: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.heading,
    color: Colors.textPrimary,
  },
  progressLabel: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.caption,
    color: Colors.textSecondary,
  },
  partnerContainer: {
    marginBottom: Spacing.lg,
  },
  partnerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  partnerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceHover,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  partnerEmoji: {
    fontSize: 20,
  },
  presenceDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.presenceOnline,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  partnerInfo: {
    flex: 1,
  },
  partnerName: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.body,
    color: Colors.textPrimary,
  },
  partnerStatus: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.small,
    color: Colors.textSecondary,
  },
  nudgeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceHover,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nudgeEmoji: {
    fontSize: 18,
  },
  partnerGoalsList: {
    marginTop: Spacing.xs,
    paddingLeft: 60, // Align with the text, leaving space for avatar
    gap: Spacing.xs,
  },
  partnerGoalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    gap: Spacing.sm,
  },
  partnerGoalEmoji: {
    fontSize: 16,
  },
  partnerGoalName: {
    flex: 1,
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.small,
    color: Colors.textSecondary,
  },
  smallNudgeBtn: {
    backgroundColor: Colors.accentPrimary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  smallNudgeText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: 10,
    color: Colors.textPrimary,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.bodyLarge,
    color: Colors.textPrimary,
  },
  addGoalBtn: {
    backgroundColor: Colors.accentPrimary,
    borderRadius: BorderRadius.full,
    paddingVertical: 5,
    paddingHorizontal: 14,
  },
  addGoalBtnText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.small,
    color: Colors.textPrimary,
  },
  emptyText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginVertical: Spacing.xl,
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
  },
  soloModeContainer: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  soloModeTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.bodyLarge,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  soloModeDesc: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.small,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  primaryBtn: {
    backgroundColor: Colors.accentPrimary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: BorderRadius.md,
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  primaryBtnText: {
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
    fontSize: Typography.size.body,
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
    fontSize: Typography.size.body,
  },
});
