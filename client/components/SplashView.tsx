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
import * as SplashScreen from 'expo-splash-screen';

const iconTransparent = require('@/assets/images/icon-transparent.png');

const { width } = Dimensions.get('window');

export default function SplashView() {
  const router = useSafeRouter();

  // 动画值 - 必须在组件顶部声明
  const iconScale = useSharedValue(0.4);
  const iconOpacity = useSharedValue(0);
  const iconRotation = useSharedValue(-6);

  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(35);

  const taglineOpacity = useSharedValue(0);

  // 闪光装饰动画值
  const sparkleScale1 = useSharedValue(0);
  const sparkleScale2 = useSharedValue(0);
  const sparkleScale3 = useSharedValue(0);
  const sparkleOpacity1 = useSharedValue(0);
  const sparkleOpacity2 = useSharedValue(0);
  const sparkleOpacity3 = useSharedValue(0);

  const navigateToNext = async () => {
    try {
      // 直接跳转到登录页面，只保留一个启动页面（splash）
      router.replace('/login');
    } catch (error) {
      console.error('启动页跳转失败:', error);
      router.replace('/login');
    }
  };

  useEffect(() => {
    // 延迟隐藏原生启动画面，确保动画已经开始播放
    setTimeout(() => {
      SplashScreen.hideAsync();
    }, 100);

    // 图标入场动画 - 柔和的弹跳效果
    iconOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) });
    iconScale.value = withDelay(150, withSpring(1, { damping: 12, stiffness: 85 }));
    iconRotation.value = withDelay(150, withSpring(0, { damping: 14, stiffness: 72 }));

    // 标题入场
    titleOpacity.value = withDelay(500, withTiming(1, { duration: 700, easing: Easing.out(Easing.ease) }));
    titleY.value = withDelay(500, withSpring(0, { damping: 12, stiffness: 95 }));

    // 标语入场
    taglineOpacity.value = withDelay(750, withTiming(1, { duration: 700, easing: Easing.out(Easing.ease) }));

    // 闪光效果动画
    const animateSparkle = (scale: any, opacity: any, delay: number) => {
      scale.value = withDelay(delay,
        withRepeat(
          withSequence(
            withTiming(1.15, { duration: 900, easing: Easing.out(Easing.ease) }),
            withTiming(0, { duration: 700, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          false
        )
      );
      opacity.value = withDelay(delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 900, easing: Easing.out(Easing.ease) }),
            withTiming(0, { duration: 700, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          false
        )
      );
    };

    animateSparkle(sparkleScale1, sparkleOpacity1, 950);
    animateSparkle(sparkleScale2, sparkleOpacity2, 1150);
    animateSparkle(sparkleScale3, sparkleOpacity3, 1350);

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

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* 纯色背景 */}
      <View style={styles.background} />

      {/* 主要内容 */}
      <View style={styles.content}>
        {/* 机器人抱日记本图片 */}
        <View style={styles.iconContainer}>
          <Animated.View style={[styles.iconWrapper, iconStyle]}>
            <Image
              source={iconTransparent}
              style={styles.appIcon}
              resizeMode="contain"
            />
          </Animated.View>

          {/* 闪光装饰 */}
          <View style={styles.sparklesAroundIcon}>
            <Animated.View style={[styles.sparkle, sparkleStyle1, { top: 10, left: 40 }]}>
              <Text style={styles.sparkleEmoji}>✦</Text>
            </Animated.View>
            <Animated.View style={[styles.sparkle, sparkleStyle2, { top: 60, right: 30 }]}>
              <Text style={styles.sparkleEmoji}>✧</Text>
            </Animated.View>
            <Animated.View style={[styles.sparkle, sparkleStyle3, { bottom: 40, left: 45 }]}>
              <Text style={styles.sparkleEmoji}>✦</Text>
            </Animated.View>
          </View>
        </View>

        {/* 应用名称 */}
        <Animated.View style={[styles.titleContainer, titleStyle]}>
          <Text style={styles.title}>AI情绪日记</Text>
          <View style={styles.titleUnderline} />
        </Animated.View>

        {/* 品牌标语 */}
        <Animated.View style={[styles.taglineContainer, taglineStyle]}>
          <Text style={styles.tagline}>记录每一刻的情绪</Text>
        </Animated.View>
      </View>

      {/* 版本信息 */}
      <Text style={styles.version}>v1.0.0</Text>
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

  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#EA580C',
  },

  content: {
    alignItems: 'center',
    zIndex: 10,
    width: '100%',
  },

  iconContainer: {
    position: 'relative',
    width: 240,
    height: 240,
    marginBottom: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconWrapper: {
    shadowColor: 'rgba(0, 0, 0, 0.25)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 25,
    elevation: 18,
  },

  appIcon: {
    width: 220,
    height: 220,
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
    fontSize: 22,
    color: '#FFFFFF',
    opacity: 0.85,
  },

  titleContainer: {
    alignItems: 'center',
    marginBottom: 14,
  },

  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 3,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },

  titleUnderline: {
    width: 100,
    height: 2.5,
    backgroundColor: '#FFFFFF',
    marginTop: 10,
    borderRadius: 1.5,
    shadowColor: 'rgba(0, 0, 0, 0.12)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },

  taglineContainer: {
    alignItems: 'center',
  },

  tagline: {
    fontSize: 17,
    color: 'rgba(255, 255, 255, 0.95)',
    letterSpacing: 1.5,
    fontWeight: '400',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  version: {
    position: 'absolute',
    bottom: 55,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 1,
    fontWeight: '500',
  },
});
