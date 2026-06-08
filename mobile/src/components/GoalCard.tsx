import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Colors, Spacing, Typography, Shadows, BorderRadius } from '../theme/tokens';

interface GoalCardProps {
  id: string;
  name: string;
  emoji: string;
  category: string;
  targetValue: number | null;
  unit: string | null;
  status: string;
  onComplete: (id: string) => void;
}

export default function GoalCard({
  id,
  name,
  emoji,
  category,
  targetValue,
  unit,
  status,
  onComplete,
}: GoalCardProps) {
  const isCompleted = status === 'completed';
  
  const [isLocalCompleted, setIsLocalCompleted] = useState(false);
  const effectivelyCompleted = isCompleted || isLocalCompleted;
  
  // Animation values
  const fillProgress = useSharedValue(effectivelyCompleted ? 1 : 0);
  const scale = useSharedValue(1);

  const handleComplete = () => {
    onComplete(id);
  };

  const handlePressIn = () => {
    if (effectivelyCompleted) return;
    scale.value = withSpring(0.95);
    fillProgress.value = withTiming(1, { 
      duration: 800, 
      easing: Easing.inOut(Easing.ease) 
    }, (finished) => {
      if (finished) {
        runOnJS(setIsLocalCompleted)(true);
        runOnJS(handleComplete)();
      }
    });
  };

  const handlePressOut = () => {
    if (effectivelyCompleted) return;
    scale.value = withSpring(1);
    if (fillProgress.value < 0.99) {
      fillProgress.value = withTiming(0, { duration: 300 });
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillProgress.value * 100}%`,
    opacity: effectivelyCompleted ? 0.06 : fillProgress.value * 0.5,
  }));

  const textStyle = useAnimatedStyle(() => ({
    color: effectivelyCompleted ? Colors.accentSuccess : Colors.textPrimary,
    textDecorationLine: effectivelyCompleted ? 'line-through' : 'none',
  }));

  return (
    <TouchableWithoutFeedback onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[styles.card, effectivelyCompleted && styles.cardCompleted, animatedStyle]}>
        
        {/* Fill Background Animation */}
        <Animated.View style={[styles.fillBackground, fillStyle]} />

        <View style={styles.leftContent}>
          <Text style={styles.emoji}>{emoji}</Text>
          <View>
            <Animated.Text style={[styles.name, textStyle]}>
              {name}
            </Animated.Text>
            <Text style={styles.category}>{category}</Text>
          </View>
        </View>

        <View style={styles.rightContent}>
          {effectivelyCompleted ? (
            <View style={styles.checkmark}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
          ) : (
            <Text style={styles.target}>
              {targetValue} {unit}
            </Text>
          )}
        </View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  cardCompleted: {
    borderColor: Colors.accentSuccess,
  },
  fillBackground: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.accentSuccess,
    zIndex: 0,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
    zIndex: 1,
  },
  emoji: {
    fontSize: 28,
  },
  name: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.body,
    color: Colors.textPrimary,
  },
  category: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.caption,
    color: Colors.textTertiary,
  },
  rightContent: {
    alignItems: 'flex-end',
    zIndex: 1,
  },
  target: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.small,
    color: Colors.textSecondary,
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accentSuccess,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    fontFamily: Typography.fontFamily.bold,
    fontSize: 14,
    color: Colors.background,
  },
});
