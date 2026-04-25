import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  withSpring,
  runOnJS
} from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeRouter } from '@/hooks/useSafeRouter';

// 防止原生启动屏自动隐藏
SplashScreen.preventAutoHideAsync();

const { width, height } = Dimensions.get('window');

export default function SplashView() {
  const router = useSafeRouter();
  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const dotScale1 = useSharedValue(0.8);
  const dotScale2 = useSharedValue(0.8);
  const dotScale3 = useSharedValue(0.8);

  const navigateToNext = async () => {
    try {
      // 隐藏原生启动屏
      await SplashScreen.hideAsync();

      // 检查用户登录状态
      const token = await AsyncStorage.getItem('userToken');

      if (token) {
        // 已登录，跳转到主页
        router.replace('/');
      } else {
        // 未登录，跳转到欢迎页
        router.replace('/welcome');
      }
    } catch (error) {
      console.error('启动页跳转失败:', error);
      await SplashScreen.hideAsync();
      router.replace('/welcome');
    }
  };

  useEffect(() => {
    // Logo 动画
    logoScale.value = withSpring(1, {
      damping: 15,
      stiffness: 150,
    });

    logoOpacity.value = withDelay(100, withTiming(1, { duration: 500 }));

    // 文字动画
    textOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));

    // 脉冲动画
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    // 加载点动画
    const animateDot = (dotValue, delay) => {
      dotValue.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1.2, { duration: 400, easing: Easing.out(Easing.ease) }),
            withTiming(0.8, { duration: 400, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          false
        )
      );
    };

    animateDot(dotScale1, 0);
    animateDot(dotScale2, 150);
    animateDot(dotScale3, 300);

    // 2秒后自动跳转
    const timer = setTimeout(() => {
      navigateToNext();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const dotStyle1 = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale1.value }],
  }));

  const dotStyle2 = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale2.value }],
  }));

  const dotStyle3 = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale3.value }],
  }));

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* 渐变背景 */}
      <View style={styles.backgroundGradient}>
        <View style={styles.gradientTop} />
        <View style={styles.gradientBottom} />
      </View>

      {/* 装饰性圆圈 */}
      <Animated.View style={[styles.decorCircle1, pulseStyle]} />
      <Animated.View style={[styles.decorCircle2, pulseStyle]} />

      {/* 主要内容 */}
      <View style={styles.content}>
        {/* Logo */}
        <Animated.View style={[styles.logoContainer, logoStyle]}>
          <View style={styles.logoInner}>
            <Text style={styles.logoEmoji}>🌟</Text>
          </View>
        </Animated.View>

        {/* App 名称 */}
        <Animated.Text style={[styles.appName, textStyle]}>
          AI情绪日记
        </Animated.Text>

        {/* 品牌标语 */}
        <Animated.Text style={[styles.tagline, textStyle]}>
          记录每一刻的情绪
        </Animated.Text>

        {/* 加载指示器 */}
        <View style={styles.loadingIndicator}>
          <Animated.View style={[styles.dot, dotStyle1]} />
          <Animated.View style={[styles.dot, dotStyle2]} />
          <Animated.View style={[styles.dot, dotStyle3]} />
        </View>

        {/* 版本信息 */}
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
  },

  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: 'linear-gradient(180deg, #F97316 0%, #EA580C 100%)',
  },

  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: '#C2410C',
  },

  decorCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    top: height * 0.15,
    left: -50,
  },

  decorCircle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    bottom: height * 0.2,
    right: -30,
  },

  content: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },

  logoInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  logoEmoji: {
    fontSize: 56,
  },

  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 50,
    letterSpacing: 1,
    fontWeight: '500',
  },

  loadingIndicator: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30,
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },

  version: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 1,
  },
});
