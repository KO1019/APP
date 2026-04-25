import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  withSpring
} from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeRouter } from '@/hooks/useSafeRouter';

const iconTransparent = require('@/assets/images/icon-transparent.png');

const { width } = Dimensions.get('window');

export default function SplashView() {
  const router = useSafeRouter();

  // 动画值 - 必须在组件顶部声明
  const iconScale = useSharedValue(0.3);
  const iconOpacity = useSharedValue(0);
  const iconRotation = useSharedValue(-8);

  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(40);

  const taglineOpacity = useSharedValue(0);

  // 闪光装饰动画值
  const sparkleScale1 = useSharedValue(0);
  const sparkleScale2 = useSharedValue(0);
  const sparkleScale3 = useSharedValue(0);
  const sparkleScale4 = useSharedValue(0);
  const sparkleOpacity1 = useSharedValue(0);
  const sparkleOpacity2 = useSharedValue(0);
  const sparkleOpacity3 = useSharedValue(0);
  const sparkleOpacity4 = useSharedValue(0);

  const navigateToNext = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');

      if (token) {
        router.replace('/');
      } else {
        router.replace('/welcome');
      }
    } catch (error) {
      console.error('启动页跳转失败:', error);
      router.replace('/welcome');
    }
  };

  useEffect(() => {
    // 图标入场动画 - 柔和的弹跳效果
    iconOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) });
    iconScale.value = withDelay(100, withSpring(1, { damping: 10, stiffness: 80 }));
    iconRotation.value = withDelay(100, withSpring(0, { damping: 12, stiffness: 70 }));

    // 标题入场
    titleOpacity.value = withDelay(400, withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) }));
    titleY.value = withDelay(400, withSpring(0, { damping: 12, stiffness: 100 }));

    // 标语入场
    taglineOpacity.value = withDelay(700, withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) }));

    // 闪光效果动画
    const animateSparkle = (scale: any, opacity: any, delay: number) => {
      scale.value = withDelay(delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 1000, easing: Easing.out(Easing.ease) }),
            withTiming(0, { duration: 800, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          false
        )
      );
      opacity.value = withDelay(delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 1000, easing: Easing.out(Easing.ease) }),
            withTiming(0, { duration: 800, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          false
        )
      );
    };

    animateSparkle(sparkleScale1, sparkleOpacity1, 1000);
    animateSparkle(sparkleScale2, sparkleOpacity2, 1200);
    animateSparkle(sparkleScale3, sparkleOpacity3, 1400);
    animateSparkle(sparkleScale4, sparkleOpacity4, 1600);

    // 2.5秒后跳转
    const timer = setTimeout(() => {
      navigateToNext();
    }, 2500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 动画样式 - 必须在组件顶部定义
  const iconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [
      { scale: iconScale.value },
      { rotate: `${iconRotation.value}deg` }
    ],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  const sparkleStyle1 = useAnimatedStyle(() => ({
    opacity: sparkleOpacity1.value,
    transform: [{ scale: sparkleScale1.value }],
  }));

  const sparkleStyle2 = useAnimatedStyle(() => ({
    opacity: sparkleOpacity2.value,
    transform: [{ scale: sparkleScale2.value }],
  }));

  const sparkleStyle3 = useAnimatedStyle(() => ({
    opacity: sparkleOpacity3.value,
    transform: [{ scale: sparkleScale3.value }],
  }));

  const sparkleStyle4 = useAnimatedStyle(() => ({
    opacity: sparkleOpacity4.value,
    transform: [{ scale: sparkleScale4.value }],
  }));

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* 暖橙色渐变背景 */}
      <View style={styles.backgroundGradient} />

      {/* 装饰性柔和光晕 */}
      <View style={[styles.glow, styles.glow1]} />
      <View style={[styles.glow, styles.glow2]} />
      <View style={[styles.glow, styles.glow3]} />

      {/* 主要内容 */}
      <View style={styles.content}>
        {/* 融合图标 - 居中展示 */}
        <View style={styles.iconContainer}>
          <Animated.View style={[styles.iconWrapper, iconStyle]}>
            <Image
              source={iconTransparent}
              style={styles.appIcon}
              resizeMode="contain"
            />
          </Animated.View>

          {/* 图标周围的闪光装饰 */}
          <View style={styles.sparklesAroundIcon}>
            <Animated.View style={[styles.sparkle, sparkleStyle1, { top: 0, left: 20 }]}>
              <Text style={styles.sparkleEmoji}>✦</Text>
            </Animated.View>
            <Animated.View style={[styles.sparkle, sparkleStyle2, { top: 15, right: 10 }]}>
              <Text style={styles.sparkleEmoji}>✧</Text>
            </Animated.View>
            <Animated.View style={[styles.sparkle, sparkleStyle3, { bottom: 20, left: 10 }]}>
              <Text style={styles.sparkleEmoji}>✦</Text>
            </Animated.View>
            <Animated.View style={[styles.sparkle, sparkleStyle4, { bottom: 10, right: 25 }]}>
              <Text style={styles.sparkleEmoji}>✧</Text>
            </Animated.View>
          </View>
        </View>

        {/* 应用名称 */}
        <Animated.View style={[styles.titleContainer, titleStyle]}>
          <Text style={styles.title}>AI情绪日记</Text>
        </Animated.View>

        {/* 品牌标语 */}
        <Animated.View style={[styles.taglineContainer, taglineStyle]}>
          <Text style={styles.tagline}>记录每一刻的情绪</Text>
        </Animated.View>
      </View>

      {/* 底部装饰线 */}
      <View style={styles.bottomDecoration}>
        <View style={styles.decorationLine} />
        <Text style={styles.version}>v1.0.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EA580C',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'linear-gradient(135deg, #EA580C 0%, #F97316 100%)',
  },

  glow: {
    position: 'absolute',
    borderRadius: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },

  glow1: {
    width: 200,
    height: 200,
    top: '10%',
    left: -50,
  },

  glow2: {
    width: 150,
    height: 150,
    top: '25%',
    right: -40,
  },

  glow3: {
    width: 180,
    height: 180,
    bottom: '20%',
    left: '65%',
  },

  content: {
    alignItems: 'center',
    zIndex: 10,
    width: '100%',
  },

  iconContainer: {
    position: 'relative',
    width: 200,
    height: 200,
    marginBottom: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconWrapper: {
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },

  appIcon: {
    width: 180,
    height: 180,
  },

  sparklesAroundIcon: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  sparkle: {
    position: 'absolute',
  },

  sparkleEmoji: {
    fontSize: 20,
    color: '#FFFFFF',
    opacity: 0.8,
  },

  titleContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },

  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },

  taglineContainer: {
    alignItems: 'center',
  },

  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 2,
    fontWeight: '400',
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  bottomDecoration: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },

  decorationLine: {
    width: 80,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 1,
    marginBottom: 12,
  },

  version: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 1,
    fontWeight: '500',
  },
});
