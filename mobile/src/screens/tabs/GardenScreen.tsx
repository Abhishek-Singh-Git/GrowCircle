/**
 * GrowCircle — Garden Tab
 * The signature visual feature: living trees that represent growth.
 */
import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { Colors, Spacing, Typography } from '../../theme/tokens';

export default function GardenScreen() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.content}>
        <Text style={styles.emoji}>🌳</Text>
        <Text style={styles.title}>Your Garden</Text>
        <Text style={styles.subtitle}>
          Trees grow when you complete goals.{'\n'}
          They wilt when streaks break.
        </Text>

        {/* Tree placeholders */}
        <View style={styles.treesContainer}>
          <View style={styles.treeCard}>
            <Text style={styles.treeEmoji}>🌲</Text>
            <Text style={styles.treeName}>You</Text>
            <Text style={styles.treeHealth}>Thriving</Text>
            <View style={[styles.healthBar, { backgroundColor: Colors.gardenThriving }]}>
              <View style={[styles.healthFill, { width: '85%' }]} />
            </View>
          </View>

          <View style={styles.treeCard}>
            <Text style={styles.treeEmoji}>🌴</Text>
            <Text style={styles.treeName}>Partner</Text>
            <Text style={styles.treeHealth}>Growing</Text>
            <View style={[styles.healthBar, { backgroundColor: Colors.gardenWilting }]}>
              <View style={[styles.healthFill, { width: '60%' }]} />
            </View>
          </View>
        </View>

        <Text style={styles.hint}>
          🎨 Full procedural tree rendering with react-native-skia coming in Phase 5
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  emoji: {
    fontSize: 64,
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
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  treesContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  treeCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  treeEmoji: {
    fontSize: 48,
    marginBottom: Spacing.xs,
  },
  treeName: {
    fontFamily: Typography.fontFamily.semiBold,
    fontSize: Typography.size.body,
    color: Colors.textPrimary,
  },
  treeHealth: {
    fontFamily: Typography.fontFamily.medium,
    fontSize: Typography.size.small,
    color: Colors.accentSuccess,
  },
  healthBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    opacity: 0.3,
    marginTop: Spacing.xxs,
  },
  healthFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: Colors.accentSuccess,
  },
  hint: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.size.caption,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
});
