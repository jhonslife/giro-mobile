import React, { useEffect } from 'react';
import { ViewProps } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface AnimatedProps extends ViewProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
}

export function FadeIn({ children, delay = 0, duration = 500, style, ...props }: AnimatedProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(duration).springify()}
      exiting={FadeOut.duration(200)}
      style={style}
      {...props}
    >
      {children}
    </Animated.View>
  );
}

export function SlideIn({ children, delay = 0, duration = 500, style, ...props }: AnimatedProps) {
  return (
    <Animated.View
      entering={FadeInUp.delay(delay).duration(duration).springify()}
      style={style}
      {...props}
    >
      {children}
    </Animated.View>
  );
}

export function Pulse({ children, style, ...props }: ViewProps) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0.5, { duration: 1000 }), withTiming(1, { duration: 1000 })),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[style, animatedStyle]} {...props}>
      {children}
    </Animated.View>
  );
}
