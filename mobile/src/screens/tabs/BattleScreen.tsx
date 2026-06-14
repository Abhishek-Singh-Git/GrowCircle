/**
 * GrowCircle — Battle Arena 2.0
 * Immersive time-bound challenge system with dynamic atmosphere,
 * hold-to-verify victory claims, and battle results.
 */
import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Modal,
  TextInput,
  Animated,
  Dimensions,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme/tokens';
import { useChallenges, Challenge } from '../../hooks/useChallenges';
import { useAuthStore } from '../../stores/authStore';
import { useCircleStore } from '../../stores/circleStore';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Duration Options ─────────────────────────────────────────────────
const DURATION_OPTIONS = [
  { label: '1h', value: 1 },
  { label: '6h', value: 6 },
  { label: '12h', value: 12 },
  { label: '24h', value: 24 },
  { label: '48h', value: 48 },
];

// ── Countdown Hook ───────────────────────────────────────────────────
function useCountdown(deadlineStr: string | null) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!deadlineStr) return;
    const tick = () => {
      const ms = new Date(deadlineStr).getTime() - Date.now();
      setRemaining(Math.max(0, ms));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadlineStr]);
  return remaining;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── Atmosphere Phase ─────────────────────────────────────────────────
function getAtmospherePhase(remainingMs: number, durationHours: number): 'dawn' | 'mid' | 'final' {
  const totalMs = durationHours * 60 * 60 * 1000;
  const elapsed = totalMs - remainingMs;
  const ratio = elapsed / totalMs;
  if (ratio < 0.5) return 'dawn';
  if (ratio < 0.85) return 'mid';
  return 'final';
}

const ATMOSPHERE_COLORS = {
  dawn: { bg: ['#1a1a2e', '#16213e'] as const, accent: Colors.accentPrimary },
  mid: { bg: ['#1a1a2e', '#2d1b3d'] as const, accent: Colors.accentWarning },
  final: { bg: ['#2d1117', '#1a0a0a'] as const, accent: Colors.accentDanger },
};

// ── Avatar Component ─────────────────────────────────────────────────
function UserAvatar({ uri, size = 56, name }: { uri?: string | null; size?: number; name?: string }) {
  const initials = name ? name.substring(0, 2).toUpperCase() : '👤';
  return (
    <View style={[styles.avatarRing, { width: size + 6, height: size + 6 }]}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <View style={[styles.avatarPlaceholder, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={{ fontSize: size * 0.4, color: Colors.textSecondary, fontFamily: Typography.fontFamily.bold }}>{initials}</Text>
        </View>
      )}
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ══════════════════════════════════════════════════════════════════════
export default function BattleScreen() {
  const { challenges, fetchChallenges, createChallenge, respondToChallenge, submitVictory, acceptVictory, rejectVictory, clearHistory } = useChallenges();
  const user = useAuthStore((s) => s.user);
  const activeCircleId = useCircleStore((s) => s.activeCircleId);

  // ── State ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'resolved'>('active');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [victoryModalVisible, setVictoryModalVisible] = useState(false);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);

  // Create form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDuration, setSelectedDuration] = useState(12);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Victory claim state
  const [proofText, setProofText] = useState('');
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<any>(null);
  const [victoryClaimed, setVictoryClaimed] = useState(false);

  // Responsiveness / Loading states
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [clearingId, setClearingId] = useState<string | null>(null);

  // Result display
  const [resultChallenge, setResultChallenge] = useState<Challenge | null>(null);

  // Pulsing animation for Final Hour mode
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ── Filtered Lists ─────────────────────────────────────────────────
  const filteredChallenges = useMemo(() => {
    return challenges.filter((c) => {
      if (activeTab === 'active') return c.status === 'active';
      if (activeTab === 'pending') return c.status === 'pending';
      if (activeTab === 'resolved') return c.status === 'resolved' || c.status === 'expired';
      return false;
    });
  }, [challenges, activeTab]);

  const victories = useMemo(() => filteredChallenges.filter(c => c.status === 'resolved'), [filteredChallenges]);
  const expired = useMemo(() => filteredChallenges.filter(c => c.status === 'expired'), [filteredChallenges]);

  // ── Create Challenge ───────────────────────────────────────────────
  const handleOpenCreate = () => {
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
    setCreateModalVisible(true);
  };

  const handleCreateChallenge = async () => {
    if (!selectedPartnerId || !title) return;
    setIsCreating(true);
    try {
      await createChallenge({
        circleId: activeCircleId,
        title,
        conditionDescription: description || title,
        conditionType: 'custom',
        stakeType: 'iou',
        stakeDescription: '',
        proofRequired: true,
        durationHours: selectedDuration,
        participantIds: [user?.id, selectedPartnerId].filter(Boolean) as string[],
      });
      setCreateModalVisible(false);
      setTitle('');
      setDescription('');
      setSelectedDuration(12);
      setSelectedPartnerId(null);
      setActiveTab('pending');
    } catch (e: any) {
      alert(e?.message || 'Failed to create challenge');
    } finally {
      setIsCreating(false);
    }
  };

  // ── Respond ────────────────────────────────────────────────────────
  const handleRespond = async (challengeId: string, accept: boolean) => {
    if (respondingId) return;
    setRespondingId(challengeId);
    try {
      await respondToChallenge(challengeId, accept);
      if (accept) setActiveTab('active');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to respond to challenge.');
    } finally {
      setRespondingId(null);
    }
  };

  const handleAcceptVictory = async (challengeId: string, participantId: string) => {
    if (reviewingId) return;
    setReviewingId(challengeId);
    try {
      await acceptVictory(challengeId, participantId);
      Alert.alert('Success', 'Victory claim approved.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to accept victory.');
    } finally {
      setReviewingId(null);
    }
  };

  const handleRejectVictory = async (challengeId: string, participantId: string, reason: string) => {
    if (reviewingId) return;
    setReviewingId(challengeId);
    try {
      await rejectVictory(challengeId, participantId, reason);
      Alert.alert('Success', 'Victory claim rejected.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to reject victory.');
    } finally {
      setReviewingId(null);
    }
  };

  const handleClearHistory = async (challengeId: string) => {
    if (clearingId) return;
    Alert.alert(
      'Delete Battle',
      'Are you sure you want to delete this battle from your history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setClearingId(challengeId);
            try {
              await clearHistory(challengeId);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete battle from history.');
            } finally {
              setClearingId(null);
            }
          },
        },
      ]
    );
  };

  // ── Claim Victory ──────────────────────────────────────────────────
  const openVictoryModal = (challenge: Challenge) => {
    const yours = challenge.participants.find(p => p.userId === user?.id);
    if (yours?.verificationStatus === 'verified') {
      alert('You have already claimed victory!');
      return;
    }
    setActiveChallenge(challenge);
    setProofText('');
    setHoldProgress(0);
    setVictoryClaimed(false);
    setVictoryModalVisible(true);
  };

  const startHold = () => {
    if (!proofText.trim()) {
      alert('Please describe what you accomplished.');
      return;
    }
    let current = 0;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const interval = setInterval(() => {
      current += 0.05; // 1 second to fill
      if (current >= 1) {
        clearInterval(interval);
        handleSubmitVictory();
      }
      setHoldProgress(Math.min(current, 1));
    }, 50);
    holdTimerRef.current = interval;
  };

  const stopHold = () => {
    if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    if (holdProgress < 1) setHoldProgress(0);
  };

  const handleSubmitVictory = async () => {
    if (!activeChallenge) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setVictoryClaimed(true);
    try {
      await submitVictory(activeChallenge.id, proofText);
      // Show result
      setTimeout(() => {
        setVictoryModalVisible(false);
        setResultChallenge(activeChallenge);
        setResultModalVisible(true);
        // Auto-dismiss result after 5 seconds
        setTimeout(() => {
          setResultModalVisible(false);
          setResultChallenge(null);
        }, 5000);
      }, 1500);
    } catch (e: any) {
      alert(e?.message || 'Failed to submit victory');
      setVictoryClaimed(false);
      setHoldProgress(0);
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // RENDER: Active Battle Card
  // ══════════════════════════════════════════════════════════════════
  const renderActiveBattle = ({ item: challenge }: { item: Challenge }) => {
    return (
      <ActiveBattleCard
        challenge={challenge}
        userId={user?.id || ''}
        onClaimVictory={openVictoryModal}
        onAcceptVictory={handleAcceptVictory}
        onRejectVictory={handleRejectVictory}
        isReviewing={reviewingId === challenge.id}
      />
    );
  };

  // ══════════════════════════════════════════════════════════════════
  // RENDER: Pending Card
  // ══════════════════════════════════════════════════════════════════
  const renderPendingCard = ({ item: challenge }: { item: Challenge }) => {
    const isProposer = challenge.proposerId === user?.id;
    return (
      <View style={styles.pendingCard}>
        <View style={styles.pendingHeader}>
          <Text style={styles.pendingEmoji}>⚔️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.pendingTitle}>{challenge.title}</Text>
            <Text style={styles.pendingMeta}>
              {isProposer ? 'Waiting for response...' : `From ${challenge.proposer.name}`}
            </Text>
            <Text style={styles.pendingDuration}>⏱ {challenge.durationHours}h battle</Text>
          </View>
        </View>
        {!isProposer && (
          <View style={styles.pendingActions}>
            <TouchableOpacity
              style={[styles.acceptBtn, respondingId === challenge.id && { opacity: 0.5 }]}
              onPress={() => handleRespond(challenge.id, true)}
              disabled={respondingId === challenge.id}
            >
              <LinearGradient colors={Colors.gradientPrimary} style={styles.acceptGradient}>
                {respondingId === challenge.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.acceptText}>Accept Challenge</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.declineBtn}
              onPress={() => handleRespond(challenge.id, false)}
              disabled={respondingId === challenge.id}
            >
              <Text style={styles.declineText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // ══════════════════════════════════════════════════════════════════
  // RENDER: Resolved Card
  // ══════════════════════════════════════════════════════════════════
  const renderResolvedCard = ({ item: challenge }: { item: Challenge }) => {
    const isExpired = challenge.status === 'expired' || challenge.status === 'cancelled';
    return (
      <View style={[styles.resolvedCard, isExpired && styles.resolvedCardExpired]}>
        <Text style={styles.resolvedIcon}>{isExpired ? '💀' : '🏆'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.resolvedTitle}>{challenge.title}</Text>
          <Text style={styles.resolvedStatus}>
            {isExpired ? 'Battle Lost — No completion submitted' : `Victory — ${challenge.winner?.name || 'Draw'}`}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.clearBtn, clearingId === challenge.id && { opacity: 0.5 }]}
          onPress={() => handleClearHistory(challenge.id)}
          disabled={clearingId === challenge.id}
        >
          {clearingId === challenge.id ? (
            <ActivityIndicator size="small" color={Colors.textSecondary} />
          ) : (
            <Text style={styles.clearBtnText}>✕</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  // ══════════════════════════════════════════════════════════════════
  // RENDER: Header
  // ══════════════════════════════════════════════════════════════════
  const renderHeader = () => (
    <>
      <Text style={styles.pageTitle}>⚔️ Battle Arena</Text>
      <Text style={styles.pageSubtitle}>Enter the arena. Prove your discipline.</Text>

      <View style={styles.tabsContainer}>
        {(['active', 'pending', 'resolved'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'active' ? '⚔️ Active' : tab === 'pending' ? '📩 Pending' : '📜 History'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>
        {activeTab === 'active' ? '⚔️' : activeTab === 'pending' ? '📩' : '📜'}
      </Text>
      <Text style={styles.emptyText}>
        {activeTab === 'active' ? 'No active battles.' : activeTab === 'pending' ? 'No pending challenges.' : 'No battle history yet.'}
      </Text>
    </View>
  );

  // ══════════════════════════════════════════════════════════════════
  // RENDER: Resolved Tab with sections
  // ══════════════════════════════════════════════════════════════════
  const renderResolvedList = () => (
    <>
      {victories.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>🏆 Victories</Text>
          {victories.map(c => <View key={c.id}>{renderResolvedCard({ item: c })}</View>)}
        </>
      )}
      {expired.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>💀 Expired</Text>
          {expired.map(c => <View key={c.id}>{renderResolvedCard({ item: c })}</View>)}
        </>
      )}
      {victories.length === 0 && expired.length === 0 && renderEmpty()}
    </>
  );

  const renderDeclareWarButton = () => (
    <TouchableOpacity activeOpacity={0.8} onPress={handleOpenCreate} style={styles.declareWarContainer}>
      <LinearGradient colors={Colors.gradientPrimary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.fab}>
        <Text style={styles.fabText}>⚔️ Declare War</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  // ══════════════════════════════════════════════════════════════════
  // MAIN RETURN
  // ══════════════════════════════════════════════════════════════════
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {activeTab === 'resolved' ? (
        <FlatList
          data={[]}
          keyExtractor={() => 'resolved-section'}
          renderItem={() => null}
          ListHeaderComponent={<>{renderHeader()}{renderResolvedList()}</>}
          ListFooterComponent={renderDeclareWarButton}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={filteredChallenges}
          keyExtractor={(item) => item.id}
          renderItem={activeTab === 'active' ? renderActiveBattle : renderPendingCard}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderDeclareWarButton}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* CREATE CHALLENGE MODAL                                      */}
      {/* ════════════════════════════════════════════════════════════ */}
      <Modal visible={createModalVisible} animationType="slide" transparent onRequestClose={() => setCreateModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.createModal}>
            <Text style={styles.createModalTitle}>⚔️ New Battle</Text>
            <Text style={styles.createModalSubtitle}>Choose your arena and challenge your circle.</Text>

            {/* Title */}
            <Text style={styles.fieldLabel}>Challenge Title</Text>
            <TextInput
              placeholder="e.g. 100 Push-ups"
              value={title}
              onChangeText={setTitle}
              style={styles.input}
              placeholderTextColor={Colors.textTertiary}
            />

            {/* Description */}
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              placeholder="What's the challenge about?"
              value={description}
              onChangeText={setDescription}
              style={styles.input}
              placeholderTextColor={Colors.textTertiary}
            />

            {/* Duration Selector */}
            <Text style={styles.fieldLabel}>Battle Duration</Text>
            <View style={styles.durationRow}>
              {DURATION_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.durationChip, selectedDuration === opt.value && styles.durationChipActive]}
                  onPress={() => setSelectedDuration(opt.value)}
                >
                  <Text style={[styles.durationChipText, selectedDuration === opt.value && styles.durationChipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Participant Selector */}
            <Text style={styles.fieldLabel}>Opponent</Text>
            <View style={styles.partnerRow}>
              {useCircleStore.getState().activeCircle?.members?.filter((m: any) => m.id !== user?.id).map((p: any) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.partnerChip, selectedPartnerId === p.id && styles.partnerChipActive]}
                  onPress={() => setSelectedPartnerId(p.id)}
                >
                  <UserAvatar uri={p.avatarUrl} size={28} name={p.name} />
                  <Text style={[styles.partnerChipText, selectedPartnerId === p.id && styles.partnerChipTextActive]}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Actions */}
            <View style={styles.createActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setCreateModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, (!title || !selectedPartnerId) && { opacity: 0.4 }]}
                onPress={handleCreateChallenge}
                disabled={isCreating || !title || !selectedPartnerId}
              >
                <LinearGradient colors={Colors.gradientPrimary} style={styles.submitGradient}>
                  <Text style={styles.submitBtnText}>{isCreating ? 'Creating...' : '⚔️ Declare War'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* CLAIM VICTORY MODAL                                         */}
      {/* ════════════════════════════════════════════════════════════ */}
      <Modal visible={victoryModalVisible} animationType="fade" transparent onRequestClose={() => setVictoryModalVisible(false)}>
        <View style={styles.victoryOverlay}>
          <View style={styles.victoryCard}>
            {!victoryClaimed ? (
              <>
                <Text style={styles.victoryTitle}>🏆 Claim Victory</Text>
                <Text style={styles.victorySubtitle}>What did you accomplish?</Text>

                <TextInput
                  placeholder="I completed 100 push-ups and 20 minutes of cardio..."
                  value={proofText}
                  onChangeText={setProofText}
                  style={styles.proofInput}
                  placeholderTextColor={Colors.textTertiary}
                  multiline
                  numberOfLines={4}
                />

                <Text style={styles.holdInstruction}>Hold To Verify Victory</Text>

                <TouchableOpacity
                  activeOpacity={1}
                  onPressIn={startHold}
                  onPressOut={stopHold}
                  style={styles.holdButton}
                >
                  <View style={styles.holdCircleOuter}>
                    <View style={styles.holdCircleInner}>
                      <Text style={{ fontSize: 40 }}>🏆</Text>
                      <View style={[styles.holdFill, { height: `${holdProgress * 100}%` }]} />
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.victoryCancel} onPress={() => setVictoryModalVisible(false)}>
                  <Text style={styles.victoryCancelText}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.victorySuccess}>
                <Text style={styles.victoryCheckmark}>✓</Text>
                <Text style={styles.victoryClaimedText}>Victory Claimed!</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* BATTLE RESULTS MODAL                                        */}
      {/* ════════════════════════════════════════════════════════════ */}
      <Modal visible={resultModalVisible} animationType="fade" transparent onRequestClose={() => setResultModalVisible(false)}>
        <View style={styles.resultOverlay}>
          <View style={styles.resultCard}>
            <View style={styles.resultIconBg}>
              <Text style={styles.resultIcon}>🏆</Text>
            </View>
            <Text style={styles.resultTitle}>VICTORY</Text>
            <Text style={styles.resultChallengeName}>{resultChallenge?.title}</Text>
            <View style={styles.resultDetails}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Completed In</Text>
                <Text style={styles.resultValue}>{resultChallenge?.durationHours}h 00m</Text>
              </View>
              <View style={styles.resultDivider} />
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Submitted By</Text>
                <Text style={styles.resultValue}>You</Text>
              </View>
              <View style={styles.resultDivider} />
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Status</Text>
                <Text style={[styles.resultValue, { color: Colors.accentWarning }]}>Pending Review</Text>
              </View>
              <View style={styles.resultDivider} />
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Reward</Text>
                <Text style={[styles.resultValue, { color: Colors.accentWarning }]}>
                  {resultChallenge?.participants.find(p => p.userId === user?.id)?.verificationStatus === 'verified'
                    ? '+30 XP'
                    : '+30 XP (Pending Approval)'}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeResultBtn} onPress={() => setResultModalVisible(false)}>
              <Text style={styles.closeResultBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════
// ACTIVE BATTLE CARD (with live countdown + atmosphere)
// ══════════════════════════════════════════════════════════════════════
function ActiveBattleCard({ challenge, userId, onClaimVictory, onAcceptVictory, onRejectVictory, isReviewing }: {
  challenge: Challenge;
  userId: string;
  onClaimVictory: (c: Challenge) => void;
  onAcceptVictory: (challengeId: string, participantId: string) => void;
  onRejectVictory: (challengeId: string, participantId: string, reason: string) => void;
  isReviewing: boolean;
}) {
  const remainingMs = useCountdown(challenge.deadline);
  const phase = getAtmospherePhase(remainingMs, challenge.durationHours);
  const colors = ATMOSPHERE_COLORS[phase];

  const isSolo = challenge.participants.length === 1;
  const yourParticipant = challenge.participants.find(p => p.userId === userId);
  const opponent = challenge.participants.find(p => p.userId !== userId);

  let leftAvatar: string | null = null;
  let leftName = 'You';
  let leftStatus: string | null = null;

  let rightAvatar: string | null = null;
  let rightName = 'Opponent';
  let rightStatus: string | null = null;
  let rightLabel = '';

  if (isSolo) {
    const participant = challenge.participants[0];
    const isMeParticipant = participant.userId === userId;

    leftAvatar = participant.user?.avatarUrl || null;
    leftName = isMeParticipant ? 'You' : participant.user?.name || 'Defender';
    leftStatus = participant.verificationStatus;

    rightAvatar = challenge.proposer?.avatarUrl || null;
    rightName = !isMeParticipant ? 'You' : challenge.proposer?.name || 'Challenger';
    rightLabel = 'Challenger';
  } else {
    leftAvatar = yourParticipant?.user?.avatarUrl || null;
    leftName = 'You';
    leftStatus = yourParticipant?.verificationStatus || null;

    rightAvatar = opponent?.user?.avatarUrl || null;
    rightName = opponent?.user?.name || 'Opponent';
    rightStatus = opponent?.verificationStatus || null;
  }

  const alreadyClaimed = yourParticipant?.verificationStatus === 'pending_review' || yourParticipant?.verificationStatus === 'verified';
  const opponentNeedsReview = opponent?.verificationStatus === 'pending_review';

  const progressRatio = 1 - (remainingMs / (challenge.durationHours * 60 * 60 * 1000));
  const ringSize = 140;
  const strokeWidth = 8;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <LinearGradient colors={colors.bg} style={styles.battleCard}>
      {/* VS Header */}
      <View style={styles.battleVsRow}>
        <View style={styles.battleFighter}>
          <UserAvatar uri={leftAvatar} size={48} name={leftName} />
          <Text style={styles.battleFighterName}>{leftName}</Text>
          {leftStatus === 'verified' && <Text style={styles.verifiedBadge}>✓ Verified</Text>}
          {leftStatus === 'pending_review' && <Text style={[styles.verifiedBadge, { color: Colors.accentWarning }]}>⏳ Pending</Text>}
          {leftStatus === 'rejected' && <Text style={[styles.verifiedBadge, { color: Colors.accentDanger }]}>✕ Rejected</Text>}
        </View>
        <Text style={styles.battleVs}>⚔️</Text>
        <View style={styles.battleFighter}>
          <UserAvatar uri={rightAvatar} size={48} name={rightName} />
          <Text style={styles.battleFighterName}>{rightName}</Text>
          {rightStatus === 'verified' && <Text style={styles.verifiedBadge}>✓ Verified</Text>}
          {rightStatus === 'pending_review' && <Text style={[styles.verifiedBadge, { color: Colors.accentWarning }]}>⏳ Pending</Text>}
          {rightStatus === 'rejected' && <Text style={[styles.verifiedBadge, { color: Colors.accentDanger }]}>✕ Rejected</Text>}
          {!!rightLabel && <Text style={[styles.verifiedBadge, { color: Colors.textTertiary }]}>{rightLabel}</Text>}
        </View>
      </View>

      {/* Challenge Title */}
      <Text style={styles.battleTitle}>{challenge.title}</Text>

      {/* Countdown Ring */}
      <View style={styles.countdownContainer}>
        <View style={{ width: ringSize, height: ringSize, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={ringSize} height={ringSize} style={{ position: 'absolute' }}>
            <Circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              stroke={`${colors.accent}30`}
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            <Circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              stroke={colors.accent}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * progressRatio}
              strokeLinecap="round"
              rotation="-90"
              origin={`${ringSize / 2}, ${ringSize / 2}`}
            />
          </Svg>
          <View style={styles.countdownCenter}>
            <Text style={[styles.countdownText, phase === 'final' && { color: Colors.accentDanger }]}>
              {formatCountdown(remainingMs)}
            </Text>
          </View>
        </View>
        <Text style={styles.countdownLabel}>
          {phase === 'final' ? '🔥 FINAL HOUR' : 'Remaining'}
        </Text>
      </View>

      {/* Claim Victory Button */}
      {!!yourParticipant && !alreadyClaimed && !opponentNeedsReview && remainingMs > 0 && (
        <TouchableOpacity activeOpacity={0.8} onPress={() => onClaimVictory(challenge)}>
          <LinearGradient
            colors={phase === 'final' ? Colors.gradientDanger : Colors.gradientPrimary}
            style={styles.claimBtn}
          >
            <Text style={styles.claimBtnText}>🏆 Claim Victory</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {opponentNeedsReview && (
        <View style={styles.reviewContainer}>
          <Text style={styles.reviewPrompt}>{opponent?.user?.name} claims victory!</Text>
          <View style={styles.reviewActions}>
            <TouchableOpacity
              style={[styles.reviewAcceptBtn, isReviewing && { opacity: 0.5 }]}
              onPress={() => onAcceptVictory(challenge.id, opponent.userId)}
              disabled={isReviewing}
            >
              {isReviewing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.reviewAcceptText}>Accept</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.reviewRejectBtn, isReviewing && { opacity: 0.5 }]}
              onPress={() => onRejectVictory(challenge.id, opponent.userId, 'Declined by opponent')}
              disabled={isReviewing}
            >
              {isReviewing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.reviewRejectText}>Reject</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {alreadyClaimed && (
        <View style={styles.claimedBanner}>
          <Text style={styles.claimedText}>
            {yourParticipant?.verificationStatus === 'verified' ? '✓ Victory Verified' : '⏳ Pending Review'}
          </Text>
        </View>
      )}
      {remainingMs <= 0 && !alreadyClaimed && (
        <View style={styles.expiredBanner}>
          <Text style={styles.expiredText}>💀 Battle Lost</Text>
        </View>
      )}
    </LinearGradient>
  );
}

// ══════════════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  scroll: { paddingTop: 60, paddingHorizontal: Spacing.md, paddingBottom: 120 },

  // ── Page Header ────────────────────────────────────────────────────
  pageTitle: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.size.heading, color: Colors.textPrimary, marginBottom: Spacing.xxs },
  pageSubtitle: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.size.body, color: Colors.textSecondary, marginBottom: Spacing.lg },

  // ── Tabs ───────────────────────────────────────────────────────────
  tabsContainer: { flexDirection: 'row', marginBottom: Spacing.lg, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: 4, borderWidth: 1, borderColor: Colors.glassBorder },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: BorderRadius.sm },
  tabActive: { backgroundColor: Colors.accentPrimary },
  tabText: { fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary, fontSize: Typography.size.small },
  tabTextActive: { color: Colors.textPrimary, fontFamily: Typography.fontFamily.bold },

  // ── Empty State ────────────────────────────────────────────────────
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.sm },
  emptyText: { color: Colors.textSecondary, fontSize: Typography.size.body },

  // ── Section Label ──────────────────────────────────────────────────
  sectionLabel: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.size.bodyLarge, color: Colors.textPrimary, marginBottom: Spacing.sm },

  // ── Avatar ─────────────────────────────────────────────────────────
  avatarRing: { padding: 3, borderRadius: 999, borderWidth: 2, borderColor: Colors.accentPrimary, alignItems: 'center', justifyContent: 'center' },
  avatarPlaceholder: { backgroundColor: Colors.surfaceHover, alignItems: 'center', justifyContent: 'center' },

  // ══════════════════════════════════════════════════════════════════
  // ACTIVE BATTLE CARD
  // ══════════════════════════════════════════════════════════════════
  battleCard: { borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.glassBorder },
  battleVsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  battleFighter: { alignItems: 'center', gap: 4, flex: 1 },
  battleFighterName: { fontFamily: Typography.fontFamily.semiBold, fontSize: Typography.size.small, color: Colors.textPrimary },
  battleVs: { fontFamily: Typography.fontFamily.black, fontSize: Typography.size.title, color: Colors.accentDanger, letterSpacing: 2 },
  verifiedBadge: { fontFamily: Typography.fontFamily.bold, fontSize: 10, color: Colors.accentSuccess },
  battleTitle: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.size.subtitle, color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing.md },

  // ── Countdown ──────────────────────────────────────────────────────
  countdownContainer: { alignItems: 'center', marginBottom: Spacing.lg },
  countdownRingBg: { position: 'absolute', borderWidth: 4 },
  countdownRingProgress: { position: 'absolute', borderWidth: 4 },
  countdownCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  countdownText: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.size.title, color: Colors.textPrimary, fontVariant: ['tabular-nums'] },
  countdownLabel: { fontFamily: Typography.fontFamily.semiBold, fontSize: Typography.size.caption, color: Colors.textSecondary, marginTop: Spacing.xs },

  // ── Claim Victory ──────────────────────────────────────────────────
  claimBtn: { height: 52, borderRadius: BorderRadius.xl, justifyContent: 'center', alignItems: 'center' },
  claimBtnText: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.size.bodyLarge, color: Colors.textPrimary },
  claimedBanner: { backgroundColor: 'rgba(52, 211, 153, 0.15)', borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center' },
  claimedText: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.size.body, color: Colors.accentSuccess },
  expiredBanner: { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center' },
  expiredText: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.size.body, color: Colors.accentDanger },

  // ══════════════════════════════════════════════════════════════════
  // PENDING CARD
  // ══════════════════════════════════════════════════════════════════
  pendingCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.glassBorder, padding: Spacing.md, marginBottom: Spacing.sm },
  pendingHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  pendingEmoji: { fontSize: 32 },
  pendingTitle: { fontFamily: Typography.fontFamily.semiBold, fontSize: Typography.size.body, color: Colors.textPrimary },
  pendingMeta: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.size.caption, color: Colors.textTertiary },
  pendingDuration: { fontFamily: Typography.fontFamily.medium, fontSize: Typography.size.caption, color: Colors.accentPrimary, marginTop: 2 },
  pendingActions: { flexDirection: 'row', gap: 10, marginTop: Spacing.sm },
  acceptBtn: { flex: 2, borderRadius: BorderRadius.md, overflow: 'hidden' },
  acceptGradient: { paddingVertical: 12, alignItems: 'center' },
  acceptText: { color: 'white', fontFamily: Typography.fontFamily.bold, fontSize: 14 },
  declineBtn: { flex: 1, backgroundColor: Colors.surfaceHover, borderRadius: BorderRadius.md, justifyContent: 'center', alignItems: 'center', paddingVertical: 12 },
  declineText: { color: Colors.textSecondary, fontFamily: Typography.fontFamily.medium, fontSize: 14 },

  // ══════════════════════════════════════════════════════════════════
  // RESOLVED CARD
  // ══════════════════════════════════════════════════════════════════
  resolvedCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: 'rgba(52, 211, 153, 0.08)', borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: 'rgba(52, 211, 153, 0.15)' },
  resolvedCardExpired: { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.15)' },
  resolvedIcon: { fontSize: 28 },
  resolvedTitle: { fontFamily: Typography.fontFamily.semiBold, fontSize: Typography.size.body, color: Colors.textPrimary },
  resolvedStatus: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.size.caption, color: Colors.textSecondary },

  // ══════════════════════════════════════════════════════════════════
  // FAB
  // ══════════════════════════════════════════════════════════════════
  declareWarContainer: { marginTop: Spacing.xl },
  fab: { height: 56, borderRadius: BorderRadius.xl, justifyContent: 'center', alignItems: 'center' },
  fabText: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.size.bodyLarge, color: Colors.textPrimary },

  // ══════════════════════════════════════════════════════════════════
  // CREATE MODAL
  // ══════════════════════════════════════════════════════════════════
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  createModal: { backgroundColor: Colors.backgroundElevated, borderTopLeftRadius: BorderRadius.xxl, borderTopRightRadius: BorderRadius.xxl, padding: Spacing.lg, paddingBottom: Spacing.xxl },
  createModalTitle: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.size.heading, color: Colors.textPrimary, marginBottom: Spacing.xxs },
  createModalSubtitle: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.size.small, color: Colors.textSecondary, marginBottom: Spacing.lg },
  fieldLabel: { fontFamily: Typography.fontFamily.semiBold, fontSize: Typography.size.small, color: Colors.textSecondary, marginBottom: Spacing.xs, textTransform: 'uppercase', letterSpacing: 1 },
  input: { borderWidth: 1, borderColor: Colors.glassBorder, borderRadius: BorderRadius.md, padding: Spacing.sm, marginBottom: Spacing.md, fontFamily: Typography.fontFamily.regular, color: Colors.textPrimary, backgroundColor: Colors.surface },
  durationRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.lg, flexWrap: 'wrap' },
  durationChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.glassBorder, backgroundColor: 'transparent' },
  durationChipActive: { backgroundColor: Colors.accentPrimary, borderColor: Colors.accentPrimary },
  durationChipText: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.size.body, color: Colors.textSecondary },
  durationChipTextActive: { color: Colors.textPrimary },
  partnerRow: { flexDirection: 'row', gap: 10, marginBottom: Spacing.lg, flexWrap: 'wrap' },
  partnerChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.glassBorder },
  partnerChipActive: { backgroundColor: Colors.accentPrimary, borderColor: Colors.accentPrimary },
  partnerChipText: { fontFamily: Typography.fontFamily.medium, fontSize: 13, color: Colors.textSecondary },
  partnerChipTextActive: { color: Colors.textPrimary },
  createActions: { flexDirection: 'row', gap: Spacing.sm },
  cancelBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceHover },
  cancelBtnText: { fontFamily: Typography.fontFamily.bold, color: Colors.textSecondary },
  submitBtn: { flex: 2, borderRadius: BorderRadius.md, overflow: 'hidden' },
  submitGradient: { paddingVertical: 14, alignItems: 'center' },
  submitBtnText: { fontFamily: Typography.fontFamily.bold, color: Colors.textPrimary, fontSize: Typography.size.body },

  // ══════════════════════════════════════════════════════════════════
  // VICTORY MODAL
  // ══════════════════════════════════════════════════════════════════
  victoryOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  victoryCard: { width: '88%', backgroundColor: Colors.backgroundElevated, borderRadius: BorderRadius.xxl, padding: Spacing.xl, alignItems: 'center' },
  victoryTitle: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.size.heading, color: Colors.textPrimary, marginBottom: Spacing.xxs },
  victorySubtitle: { fontFamily: Typography.fontFamily.regular, fontSize: Typography.size.body, color: Colors.textSecondary, marginBottom: Spacing.lg },
  proofInput: { width: '100%', minHeight: 100, borderWidth: 1, borderColor: Colors.glassBorder, borderRadius: BorderRadius.md, padding: Spacing.sm, color: Colors.textPrimary, fontFamily: Typography.fontFamily.regular, backgroundColor: Colors.surface, textAlignVertical: 'top', marginBottom: Spacing.lg },
  holdInstruction: { fontFamily: Typography.fontFamily.semiBold, fontSize: Typography.size.caption, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 2, marginBottom: Spacing.md },
  holdButton: { marginBottom: Spacing.lg },
  holdCircleOuter: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: Colors.accentPrimary, alignItems: 'center', justifyContent: 'center' },
  holdCircleInner: { width: 108, height: 108, borderRadius: 54, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  holdFill: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(124, 92, 252, 0.4)' },
  victoryCancel: { marginTop: Spacing.sm },
  victoryCancelText: { fontFamily: Typography.fontFamily.medium, color: Colors.textTertiary },
  victorySuccess: { alignItems: 'center', paddingVertical: Spacing.xxl },
  victoryCheckmark: { fontSize: 64, color: Colors.accentSuccess, marginBottom: Spacing.sm },
  victoryClaimedText: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.size.title, color: Colors.accentSuccess },

  // ══════════════════════════════════════════════════════════════════
  // REVIEW CONTAINER
  // ══════════════════════════════════════════════════════════════════
  reviewContainer: { marginTop: Spacing.md, padding: Spacing.md, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: BorderRadius.lg },
  reviewPrompt: { fontFamily: Typography.fontFamily.semiBold, fontSize: Typography.size.body, color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing.sm },
  reviewActions: { flexDirection: 'row', gap: Spacing.sm },
  reviewAcceptBtn: { flex: 1, backgroundColor: Colors.accentSuccess, paddingVertical: 12, borderRadius: BorderRadius.md, alignItems: 'center' },
  reviewAcceptText: { fontFamily: Typography.fontFamily.bold, color: Colors.background },
  reviewRejectBtn: { flex: 1, backgroundColor: Colors.surfaceHover, paddingVertical: 12, borderRadius: BorderRadius.md, alignItems: 'center' },
  reviewRejectText: { fontFamily: Typography.fontFamily.medium, color: Colors.textSecondary },

  // ══════════════════════════════════════════════════════════════════
  // RESOLVED CARD EXTRAS
  // ══════════════════════════════════════════════════════════════════
  clearBtn: { padding: Spacing.sm },
  clearBtnText: { fontFamily: Typography.fontFamily.bold, color: Colors.textTertiary, fontSize: Typography.size.bodyLarge },

  // ══════════════════════════════════════════════════════════════════
  // RESULT MODAL
  // ══════════════════════════════════════════════════════════════════
  resultOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  resultCard: { width: '85%', backgroundColor: '#1A1A24', borderRadius: BorderRadius.xxl, padding: Spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: Colors.glassBorder },
  resultIconBg: { width: 80, height: 80, borderRadius: 24, backgroundColor: Colors.accentPrimary, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md },
  resultIcon: { fontSize: 40 },
  resultTitle: { fontFamily: Typography.fontFamily.black, fontSize: Typography.size.title, color: Colors.accentDanger, letterSpacing: 2, marginBottom: Spacing.xs },
  resultChallengeName: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.size.bodyLarge, color: Colors.textPrimary, marginBottom: Spacing.xl },
  resultDetails: { width: '100%', backgroundColor: '#232336', borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.glassBorder, marginBottom: Spacing.xl },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg },
  resultDivider: { height: 1, backgroundColor: Colors.glassBorder },
  resultLabel: { fontFamily: Typography.fontFamily.medium, fontSize: Typography.size.body, color: Colors.textSecondary },
  resultValue: { fontFamily: Typography.fontFamily.bold, fontSize: Typography.size.body, color: Colors.textPrimary },
  closeResultBtn: { width: '100%', backgroundColor: '#232336', paddingVertical: 14, borderRadius: BorderRadius.full, alignItems: 'center' },
  closeResultBtnText: { fontFamily: Typography.fontFamily.medium, color: Colors.textPrimary, fontSize: Typography.size.body },
});
