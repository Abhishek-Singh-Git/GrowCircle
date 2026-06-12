/**
 * GrowCircle — Add Goal Screen
 * Allows the user to create a new goal for their active circle.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, Typography, BorderRadius } from '../../theme/tokens';
import { useCreateGoal } from '../../hooks/useGoals';

const CATEGORIES = [
  { emoji: '💪', name: 'Fitness' },
  { emoji: '📚', name: 'Learning' },
  { emoji: '🧘', name: 'Wellness' },
  { emoji: '💰', name: 'Finance' },
  { emoji: '🎨', name: 'Creative' },
  { emoji: '🌿', name: 'Health' },
  { emoji: '🤝', name: 'Social' },
  { emoji: '🎯', name: 'Other' },
];

const SCHEDULE_TYPES = [
  { value: 'daily', label: 'Every Day' },
  { value: 'weekdays', label: 'Weekdays Only' },
  { value: 'weekly', label: 'Once a Week' },
];

export default function AddGoalScreen() {
  const navigation = useNavigation<any>();
  const createGoal = useCreateGoal();

  const [name, setName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [scheduleType, setScheduleType] = useState('daily');
  const [targetValue, setTargetValue] = useState('');
  const [targetUnit, setTargetUnit] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a goal name.');
      return;
    }

    setIsLoading(true);
    try {
      await createGoal({
        name: name.trim(),
        goalType: targetValue ? 'quantitative' : 'boolean',
        scheduleType,
        category: selectedCategory.name,
        categoryEmoji: selectedCategory.emoji,
        targetValue: targetValue ? parseFloat(targetValue) : undefined,
        targetUnit: targetUnit || undefined,
        difficultyWeight: 1,
      });
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create goal. Make sure you are in a circle.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>New Goal</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Goal name */}
          <Text style={styles.label}>Goal Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Go to the gym"
            placeholderTextColor="#666"
            value={name}
            onChangeText={setName}
            maxLength={60}
          />

          {/* Category picker */}
          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.name}
                style={[
                  styles.categoryItem,
                  selectedCategory.name === cat.name && styles.categoryItemActive,
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                <Text
                  style={[
                    styles.categoryName,
                    selectedCategory.name === cat.name && styles.categoryNameActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Schedule */}
          <Text style={styles.label}>Schedule</Text>
          <View style={styles.scheduleRow}>
            {SCHEDULE_TYPES.map((s) => (
              <TouchableOpacity
                key={s.value}
                style={[styles.scheduleBtn, scheduleType === s.value && styles.scheduleBtnActive]}
                onPress={() => setScheduleType(s.value)}
              >
                <Text
                  style={[
                    styles.scheduleBtnText,
                    scheduleType === s.value && styles.scheduleBtnTextActive,
                  ]}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Optional target */}
          <Text style={styles.label}>Target (Optional)</Text>
          <View style={styles.targetRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: Spacing.sm }]}
              placeholder="e.g. 30"
              placeholderTextColor="#666"
              value={targetValue}
              onChangeText={setTargetValue}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Unit (e.g. mins)"
              placeholderTextColor="#666"
              value={targetUnit}
              onChangeText={setTargetUnit}
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, isLoading && { opacity: 0.7 }]}
            onPress={handleCreate}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.submitBtnText}>Create Goal</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  title: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.bodyLarge,
    color: Colors.textPrimary,
  },
  scroll: {
    padding: Spacing.md,
    paddingBottom: 60,
  },
  label: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.small,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: Colors.surface,
    color: Colors.textPrimary,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    fontSize: Typography.size.body,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    fontFamily: Typography.fontFamily.regular,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  categoryItem: {
    width: '22%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: Spacing.xs,
    alignItems: 'center',
    gap: 4,
  },
  categoryItemActive: {
    borderColor: Colors.accentPrimary,
    backgroundColor: 'rgba(124, 92, 252, 0.1)',
  },
  categoryEmoji: {
    fontSize: 22,
  },
  categoryName: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: 9,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  categoryNameActive: {
    color: Colors.accentPrimary,
    fontFamily: Typography.fontFamily.semiBold,
  },
  scheduleRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  scheduleBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  scheduleBtnActive: {
    borderColor: Colors.accentPrimary,
    backgroundColor: 'rgba(124, 92, 252, 0.1)',
  },
  scheduleBtnText: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.small,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  scheduleBtnTextActive: {
    color: Colors.accentPrimary,
  },
  targetRow: {
    flexDirection: 'row',
  },
  submitBtn: {
    backgroundColor: Colors.accentPrimary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  submitBtnText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: Typography.size.body,
    color: Colors.textPrimary,
  },
});
