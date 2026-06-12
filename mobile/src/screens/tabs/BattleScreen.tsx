/**
 * GrowCircle — Battle Tab
 * Challenges, leaderboard, and tug-of-war competitions.
 */
import React, { useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar, Modal, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme/tokens';

import { useChallenges, Challenge } from '../../hooks/useChallenges';
import { useAuthStore } from '../../stores/authStore';
import { useCircleStore } from '../../stores/circleStore';
import * as Haptics from 'expo-haptics';

export default function BattleScreen() {
  const { challenges, fetchChallenges, createChallenge, respondToChallenge, incrementProgress, resolveChallenge } = useChallenges();
  const user = useAuthStore((s) => s.user);
  const activeCircleId = useCircleStore((s) => s.activeCircleId);

  const [modalVisible, setModalVisible] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsCreating] = useState(false); // Using existing setIsCreating for loading state logic
  const holdTimerRef = useRef<any>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadlineDays, setDeadlineDays] = useState('7');
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'resolved'>('active');
  const [isCreating, setIsCreatingState] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);

  const handleProgressConfirm = (challenge: Challenge) => {
    const yourParticipant = challenge.participants.find((p) => p.userId === user?.id);
    const progress = yourParticipant?.progress || 0;
    const target = challenge.conditionTarget || 7;
    if (progress >= target) {
      alert("You have already reached the target!");
      return;
    }
    setActiveChallenge(challenge);
    setConfirmModalVisible(true);
    setHoldProgress(0);
  };

  const startHold = () => {
    let current = 0;
    const interval = setInterval(() => {
      current += 0.05;
      if (current >= 1) {
        clearInterval(interval);
        handleIncrement();
      }
      setHoldProgress(Math.min(current, 1));
    }, 50);
    return interval;
  };

  const handleIncrement = async () => {
    if (!activeChallenge) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await incrementProgress(activeChallenge.id);
      setConfirmModalVisible(false);
    } catch (e: any) {
      alert(e.message || "Failed to update progress");
      setConfirmModalVisible(false);
    }
  };

  const handleOpenModal = () => {
    if (!activeCircleId) {
      alert('Join or create a circle first!');
      return;
    }
    const partners = useCircleStore.getState().activeCircle?.members?.filter((m: any) => m.id !== user?.id) || [];
    if (partners.length === 0) {
      alert('No partner in your circle yet! Share your invite code first.');
      return;
    }
    if (partners.length === 1) {
      setSelectedPartnerId(partners[0].id);
    }
    setModalVisible(true);
  };

  const handleCreateChallenge = async () => {
    if (!selectedPartnerId) {
      alert('Please select a partner for this challenge.');
      return;
    }

    const deadlineMs = parseInt(deadlineDays, 10) * 24 * 60 * 60 * 1000;
    const deadline = new Date(Date.now() + deadlineMs).toISOString();
    
    setIsCreating(true);
    try {
      await createChallenge({
        circleId: activeCircleId,
        title,
        conditionDescription: description,
        conditionType: 'custom',
        stakeType: 'iou',
        stakeDescription: 'Loser buys dinner',
        proofRequired: true,
        deadline,
        participantIds: [user?.id || '', selectedPartnerId].filter(Boolean),
      });
      setModalVisible(false);
      setTitle('');
      setDescription('');
      setDeadlineDays('7');
      setSelectedPartnerId(null);
      setActiveTab('pending');
    } catch (e: any) {
      console.warn('Cannot create challenge:', e?.message || e);
      alert(e?.message || 'Failed to create challenge');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRespond = async (challengeId: string, accept: boolean) => {
    try {
      await respondToChallenge(challengeId, accept);
      if (accept) {
        setActiveTab('active');
      }
    } catch (err) {
      console.warn('Failed to respond', err);
    }
  };

  const renderChallenge = (challenge: Challenge) => {
    const yourParticipant = challenge.participants.find((p) => p.userId === user?.id);
    const partnerParticipant = challenge.participants.find((p) => p.userId !== user?.id);

    const yourProgress = yourParticipant?.progress || 0;
    const partnerProgress = partnerParticipant?.progress || 0;
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

        {challenge.status === 'active' && yourProgress < total && (
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={styles.checkInBtn}
              onPress={() => handleProgressConfirm(challenge)}
            >
              <LinearGradient
                colors={['#4F46E5', '#7C3AED']}
                style={styles.checkInGradient}
              >
                <Text style={styles.checkInText}>Daily Check-In</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {isPending && challenge.proposerId !== user?.id && (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: Colors.accentPrimary, padding: 10, borderRadius: 8, alignItems: 'center' }}
              onPress={() => handleRespond(challenge.id, true)}
            >
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: Colors.surfaceHover, padding: 10, borderRadius: 8, alignItems: 'center' }}
              onPress={() => handleRespond(challenge.id, false)}
            >
              <Text style={{ color: 'white' }}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const filteredChallenges = useMemo(() => {
    return challenges.filter((c) => c.status === activeTab || (activeTab === 'pending' && c.status === 'proposed'));
  }, [challenges, activeTab]);

  const renderHeader = () => (
    <>
      <Text style={styles.pageTitle}>⚔️ Battle Arena</Text>
      <Text style={styles.pageSubtitle}>Challenge your circle. Prove your discipline.</Text>

      <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'active' && styles.tabActive]}
            onPress={() => setActiveTab('active')}
          >
            <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>Active</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
            onPress={() => setActiveTab('pending')}
          >
            <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>Pending</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'resolved' && styles.tabActive]}
            onPress={() => setActiveTab('resolved')}
          >
            <Text style={[styles.tabText, activeTab === 'resolved' && styles.tabTextActive]}>Resolved</Text>
          </TouchableOpacity>
      </View>
    </>
  );

  const renderEmpty = () => (
    <Text style={{ color: Colors.textSecondary, marginBottom: 20 }}>No {activeTab} challenges.</Text>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <FlatList
        data={filteredChallenges}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderChallenge(item)}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      />

        {/* Create challenge CTA */}
        {activeTab !== 'resolved' && (
          <TouchableOpacity activeOpacity={0.8} onPress={handleOpenModal}>
            <LinearGradient
              colors={Colors.gradientPrimary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.createBtn}
            >
              <Text style={styles.createBtnText}>+ Create Challenge</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
        <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>New Challenge</Text>

              <Text style={styles.inputLabel}>Select Partner</Text>
              <View style={styles.partnerPicker}>
                {useCircleStore.getState().activeCircle?.members?.filter((m: any) => m.id !== user?.id).map((p: any) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.partnerOption, selectedPartnerId === p.id && styles.partnerOptionSelected]}
                    onPress={() => setSelectedPartnerId(p.id)}
                  >
                    <Text style={[styles.partnerOptionText, selectedPartnerId === p.id && styles.partnerOptionTextSelected]}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput placeholder="Title" value={title} onChangeText={setTitle} style={styles.input} placeholderTextColor={Colors.textTertiary} />
              <TextInput placeholder="Description" value={description} onChangeText={setDescription} style={styles.input} placeholderTextColor={Colors.textTertiary} />
              <TextInput placeholder="Deadline (days)" value={deadlineDays} onChangeText={setDeadlineDays} keyboardType="numeric" style={styles.input} placeholderTextColor={Colors.textTertiary} />

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.submitBtn, (!title || !selectedPartnerId) && { opacity: 0.5 }]} onPress={handleCreateChallenge} disabled={isCreating || !title || !selectedPartnerId}>
                  <Text style={styles.submitBtnText}>{isCreating ? "Creating..." : "Create"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Hold-to-Confirm Modal */}
        <Modal visible={confirmModalVisible} transparent animationType="fade">
          <View style={styles.holdOverlay}>
            <View style={styles.holdCard}>
              <Text style={styles.holdTitle}>Hold to Confirm</Text>
              <Text style={styles.holdSubtitle}>Verifying your progress for today</Text>

              <TouchableOpacity
                activeOpacity={1}
                onPressIn={() => {
                  const timer = startHold();
                  holdTimerRef.current = timer;
                }}
                onPressOut={() => {
                  if (holdTimerRef.current) clearInterval(holdTimerRef.current);
                  setHoldProgress(0);
                }}
                style={styles.fingerprintArea}
              >
                <View style={styles.fingerprintCircle}>
                  <Text style={{ fontSize: 40 }}>☝️</Text>
                  <View style={[styles.progressRing, { height: `${holdProgress * 100}%` }]} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.closeHoldBtn} onPress={() => setConfirmModalVisible(false)}>
                <Text style={styles.closeHoldText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
    marginBottom: Spacing.sm,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  tabActive: {
    backgroundColor: Colors.accentPrimary,
  },
  tabText: {
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
    fontSize: Typography.size.small,
  },
  tabTextActive: {
    color: Colors.textPrimary,
    fontFamily: Typography.fontFamily.bold,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  modalTitle: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.heading,
    marginBottom: Spacing.sm,
    color: Colors.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: BorderRadius.sm,
    padding: Spacing.xs,
    marginBottom: Spacing.sm,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textPrimary,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  inputLabel: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.small,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  partnerPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.md,
  },
  partnerOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: 'transparent',
  },
  partnerOptionSelected: {
    backgroundColor: Colors.accentPrimary,
    borderColor: Colors.accentPrimary,
  },
  partnerOptionText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  partnerOptionTextSelected: {
    color: Colors.textPrimary,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceHover,
  },
  cancelBtnText: {
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textSecondary,
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.accentPrimary,
  },
  submitBtnText: {
    fontFamily: Typography.fontFamily.bold,
    color: Colors.textPrimary,
  },
  actionContainer: {
    flexDirection: 'row',
    marginTop: 15,
    gap: 12,
  },
  checkInBtn: {
    flex: 2,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  checkInGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  checkInText: {
    color: 'white',
    fontFamily: Typography.fontFamily.bold,
    fontSize: 14,
  },
  forfeitBtn: {
    flex: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  forfeitText: {
    color: '#EF4444',
    fontFamily: Typography.fontFamily.medium,
    fontSize: 12,
  },
  holdOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  holdCard: {
    width: '80%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  holdTitle: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.heading,
    color: Colors.textPrimary,
  },
  holdSubtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.small,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  fingerprintArea: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.surfaceHover,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.glassBorder,
  },
  fingerprintCircle: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRing: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(124, 58, 237, 0.4)',
  },
  closeHoldBtn: {
    marginTop: Spacing.xl,
  },
  closeHoldText: {
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textTertiary,
  },
});
