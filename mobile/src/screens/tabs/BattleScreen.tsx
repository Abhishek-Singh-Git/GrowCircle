/**
 * GrowCircle — Battle Tab
 * Challenges, leaderboard, and tug-of-war competitions.
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme/tokens';

import { useChallenges, Challenge } from '../../hooks/useChallenges';
import { useAuthStore } from '../../stores/authStore';
import { useCircleStore } from '../../stores/circleStore';

export default function BattleScreen() {
  const { challenges, fetchChallenges, createChallenge, respondToChallenge } = useChallenges();
  const user = useAuthStore((s) => s.user);
  const activeCircleId = useCircleStore((s) => s.activeCircleId);

  const handleCreateMockChallenge = async () => {
    if (!activeCircleId) return;
    try {
      await createChallenge({
        circleId: activeCircleId,
        title: '7-Day Gym Streak',
        conditionDescription: 'Go to the gym 7 times in a week',
        conditionType: 'custom',
        stakeType: 'iou',
        stakeDescription: 'Loser buys dinner',
        proofRequired: true,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        participantIds: [user?.id, 'partner-id'], // Hardcoded partner for MVP
      });
    } catch (e) {
      console.warn('Cannot create challenge without partner id', e);
    }
  };

  const renderChallenge = (challenge: Challenge) => {
    // Basic logic for progress (placeholder)
    const yourProgress = challenge.status === 'active' ? 4 : 0;
    const partnerProgress = challenge.status === 'active' ? 3 : 0;
    const total = challenge.conditionTarget || 7;
    const isPending = challenge.status === 'pending';

    return (
      <View key={challenge.id} style={styles.challengeCard}>
        <View style={styles.challengeHeader}>
          <Text style={styles.challengeEmoji}>⚔️</Text>
          <View style={styles.challengeInfo}>
            <Text style={styles.challengeTitle}>{challenge.title}</Text>
            <Text style={styles.challengeDeadline}>
              {isPending ? `Proposed by ${challenge.proposer.name}` : 'Deadline: ' + new Date(challenge.deadline).toLocaleDateString()}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              challenge.status === 'active' ? styles.statusActive : styles.statusPending,
            ]}
          >
            <Text style={styles.statusText}>
              {challenge.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {challenge.status === 'active' && (
          <View style={styles.tugOfWar}>
            <Text style={styles.tugLabel}>You: {yourProgress}/{total}</Text>
            <View style={styles.tugBar}>
              <LinearGradient
                colors={Colors.gradientPrimary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.tugFill,
                  { width: `${Math.min((yourProgress / total) * 50, 50)}%` },
                ]}
              />
              <LinearGradient
                colors={Colors.gradientDanger}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.tugFillRight,
                  { width: `${Math.min((partnerProgress / total) * 50, 50)}%` },
                ]}
              />
            </View>
            <Text style={styles.tugLabel}>Partner: {partnerProgress}/{total}</Text>
          </View>
        )}

        {isPending && challenge.proposerId !== user?.id && (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: Colors.accentPrimary, padding: 10, borderRadius: 8, alignItems: 'center' }}
              onPress={() => respondToChallenge(challenge.id, true)}
            >
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: Colors.surfaceHover, padding: 10, borderRadius: 8, alignItems: 'center' }}
              onPress={() => respondToChallenge(challenge.id, false)}
            >
              <Text style={{ color: 'white' }}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>⚔️ Battle Arena</Text>
        <Text style={styles.pageSubtitle}>Challenge your circle. Prove your discipline.</Text>

        {challenges.length === 0 ? (
          <Text style={{ color: Colors.textSecondary, marginBottom: 20 }}>No challenges yet.</Text>
        ) : (
          challenges.map(renderChallenge)
        )}

        {/* Create challenge CTA */}
        <TouchableOpacity activeOpacity={0.8} onPress={handleCreateMockChallenge}>
          <LinearGradient
            colors={Colors.gradientPrimary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.createBtn}
          >
            <Text style={styles.createBtnText}>+ Create Mock Challenge</Text>
          </LinearGradient>
        </TouchableOpacity>
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
    marginBottom: Spacing.xxs,
  },
  pageSubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  challengeCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  challengeEmoji: {
    fontSize: 32,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.body,
    color: Colors.textPrimary,
  },
  challengeDeadline: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.caption,
    color: Colors.textTertiary,
  },
  statusBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  statusActive: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
  },
  statusPending: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
  },
  statusText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 10,
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  tugOfWar: {
    marginTop: Spacing.md,
    gap: Spacing.xxs,
  },
  tugLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.caption,
    color: Colors.textSecondary,
  },
  tugBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceHover,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  tugFill: {
    height: '100%',
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  tugFillRight: {
    height: '100%',
    position: 'absolute',
    right: 0,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  createBtn: {
    height: 52,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  createBtnText: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.body,
    color: Colors.textPrimary,
  },
});
