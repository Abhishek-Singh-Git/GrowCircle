import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '../theme/tokens';

const { width, height } = Dimensions.get('window');
const PARTICLE_COUNT = 20;

// Helper to get random numbers
const random = (min: number, max: number) => Math.random() * (max - min) + min;

const CrystalParticle = () => {
  const size = random(2, 6);
  const startX = random(0, width);
  const driftDistance = random(15, 40);
  const fallDuration = random(10000, 20000); // 10 to 20 seconds to fall
  const swayDuration = random(2000, 4000);
  const initialDelay = random(0, 15000);

  // Shared values for the UI thread
  const translateY = useSharedValue(-10);
  const translateX = useSharedValue(startX);
  const opacity = useSharedValue(random(0.3, 0.8));

  useEffect(() => {
    // 1. Falling Motion (Loop infinitely from top to bottom)
    translateY.value = withDelay(
      initialDelay,
      withRepeat(
        withTiming(height + 20, {
          duration: fallDuration,
          easing: Easing.linear,
        }),
        -1, // -1 means infinite repeat
        false // Do not reverse (so it drops from the top again)
      )
    );

    // 2. Swaying Motion (Left and right like a falling leaf/crystal)
    translateX.value = withDelay(
      initialDelay,
      withRepeat(
        withSequence(
          withTiming(startX + driftDistance, { duration: swayDuration, easing: Easing.inOut(Easing.sin) }),
          withTiming(startX - driftDistance, { duration: swayDuration, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true // Reverse to create a smooth back-and-forth pendulum
      )
    );

    // 3. Shimmering Opacity
    opacity.value = withDelay(
      initialDelay,
      withRepeat(
        withSequence(
          withTiming(0.1, { duration: swayDuration }),
          withTiming(0.9, { duration: swayDuration })
        ),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: '45deg' }, // Rotate square to look like a diamond/crystal
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.crystal,
        { width: size, height: size },
        animatedStyle,
      ]}
    />
  );
};

export const AmbientBackground = () => {
  // Render an array of particles
  const particles = Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
    <CrystalParticle key={i} />
  ));

  return (
    <View style={styles.container} pointerEvents="none">
      {particles}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0, // Keeps it behind your main content
  },
  crystal: {
    position: 'absolute',
    backgroundColor: Colors.accentPrimary || '#00E5FF', // Uses your app's main accent glow
    shadowColor: Colors.accentPrimary || '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  },
});
