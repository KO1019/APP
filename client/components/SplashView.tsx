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
  withSpring
} from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeRouter } from '@/hooks/useSafeRouter';

const { width } = Dimensions.get('window');

export default function SplashView() {
  const router = useSafeRouter();

  // 动画值 - 必须在组件顶部声明
  const robotY = useSharedValue(60);
  const robotOpacity = useSharedValue(0);
  const robotScale = useSharedValue(0.5);

  const bookRotation = useSharedValue(-12);
  const bookOpacity = useSharedValue(0);

  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(30);

  const heartScale = useSharedValue(1);

  // 闪光装饰动画值
  const sparkleScale1 = useSharedValue(0);
  const sparkleScale2 = useSharedValue(0);
  const sparkleScale3 = useSharedValue(0);
  const sparkleOpacity1 = useSharedValue(0);
  const sparkleOpacity2 = useSharedValue(0);
  const sparkleOpacity3 = useSharedValue(0);

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
    // 机器人入场动画 - 柔和弹跳
    robotOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) });
    robotScale.value = withDelay(100, withSpring(1, { damping: 12, stiffness: 90 }));
    robotY.value = withDelay(100, withSpring(0, { damping: 12, stiffness: 90 }));

    // 书本入场 - 机器人抱着书的姿态
    bookOpacity.value = withDelay(200, withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) }));
    bookRotation.value = withDelay(200, withSpring(0, { damping: 10, stiffness: 75 }));

    // 标题入场
    titleOpacity.value = withDelay(500, withTiming(1, { duration: 700, easing: Easing.out(Easing.ease) }));
    titleY.value = withDelay(500, withSpring(0, { damping: 12, stiffness: 100 }));

    // 爱心跳动
    heartScale.value = withDelay(700,
      withRepeat(
        withSequence(
          withTiming(1.15, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );

    // 闪光效果
    const animateSparkle = (scale: any, opacity: any, delay: number) => {
      scale.value = withDelay(delay,
        withRepeat(
          withSequence(
            withTiming(1.2, { duration: 900, easing: Easing.out(Easing.ease) }),
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

    animateSparkle(sparkleScale1, sparkleOpacity1, 900);
    animateSparkle(sparkleScale2, sparkleOpacity2, 1100);
    animateSparkle(sparkleScale3, sparkleOpacity3, 1300);

    // 2.5秒后跳转
    const timer = setTimeout(() => {
      navigateToNext();
    }, 2500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 动画样式 - 必须在组件顶部定义
  const robotStyle = useAnimatedStyle(() => ({
    opacity: robotOpacity.value,
    transform: [
      { translateY: robotY.value },
      { scale: robotScale.value }
    ],
  }));

  const bookStyle = useAnimatedStyle(() => ({
    opacity: bookOpacity.value,
    transform: [
      { rotate: `${bookRotation.value}deg` }
    ],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
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

      {/* 纯色背景 - 无装饰 */}
      <View style={styles.background} />

      {/* 主要内容 */}
      <View style={styles.content}>
        {/* 机器人抱日记本 - 自然组合 */}
        <View style={styles.mainIllustration}>
          {/* 机器人主体 */}
          <Animated.View style={[styles.robotContainer, robotStyle]}>
            {/* 机器人身体 */}
            <View style={styles.robotBody}>
              {/* 机器人头部 */}
              <View style={styles.robotHead}>
                <View style={styles.robotAntenna} />
                <View style={styles.robotAntennaBall} />
              </View>

              {/* 机器人面部 */}
              <View style={styles.robotFace}>
                {/* 眼睛 */}
                <View style={styles.eyesContainer}>
                  <View style={styles.eye} />
                  <View style={styles.eye} />
                </View>

                {/* 腮红 */}
                <View style={styles.cheeksContainer}>
                  <View style={styles.cheek} />
                  <View style={styles.cheek} />
                </View>

                {/* 嘴巴 - 微笑 */}
                <View style={styles.mouth} />
              </View>

              {/* 机器人手臂 - 抱着书 */}
              <View style={styles.robotArmLeft} />
              <View style={styles.robotArmRight} />
            </View>
          </Animated.View>

          {/* 日记本 - 机器人抱着 */}
          <Animated.View style={[styles.bookContainer, bookStyle]}>
            <View style={styles.bookCover}>
              {/* 爱心徽章 */}
              <Animated.View style={[styles.heartBadge, heartStyle]}>
                <Text style={styles.heartEmoji}>❤</Text>
              </Animated.View>
            </View>
            <View style={styles.bookPages} />
          </Animated.View>

          {/* 闪光装饰 */}
          <View style={styles.sparkles}>
            <Animated.View style={[styles.sparkle, sparkleStyle1, { top: 10, left: 30 }]}>
              <Text style={styles.sparkleEmoji}>✦</Text>
            </Animated.View>
            <Animated.View style={[styles.sparkle, sparkleStyle2, { top: 50, right: 40 }]}>
              <Text style={styles.sparkleEmoji}>✧</Text>
            </Animated.View>
            <Animated.View style={[styles.sparkle, sparkleStyle3, { bottom: 30, left: 50 }]}>
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
        <Animated.View style={[styles.taglineContainer, titleStyle]}>
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

  mainIllustration: {
    position: 'relative',
    width: 280,
    height: 280,
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  robotContainer: {
    position: 'absolute',
    width: 160,
    height: 200,
    zIndex: 2,
  },

  robotBody: {
    width: 140,
    height: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: 70,
    shadowColor: 'rgba(0, 0, 0, 0.15)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
    position: 'relative',
  },

  robotHead: {
    position: 'absolute',
    top: -22,
    left: 10,
    right: 10,
    height: 55,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    alignItems: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },

  robotAntenna: {
    position: 'absolute',
    top: -18,
    width: 7,
    height: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },

  robotAntennaBall: {
    position: 'absolute',
    top: -10,
    left: '50%',
    marginLeft: -6,
    width: 12,
    height: 12,
    backgroundColor: '#EA580C',
    borderRadius: 6,
  },

  robotFace: {
    flex: 1,
    marginTop: 12,
    alignItems: 'center',
  },

  eyesContainer: {
    flexDirection: 'row',
    gap: 22,
    marginTop: 12,
  },

  eye: {
    width: 24,
    height: 24,
    backgroundColor: '#4B5563',
    borderRadius: 12,
    shadowColor: 'rgba(0, 0, 0, 0.15)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },

  cheeksContainer: {
    flexDirection: 'row',
    gap: 48,
    marginTop: 6,
  },

  cheek: {
    width: 14,
    height: 8,
    backgroundColor: 'rgba(249, 115, 22, 0.4)',
    borderRadius: 7,
  },

  mouth: {
    marginTop: 10,
    width: 26,
    height: 13,
    borderBottomWidth: 4,
    borderBottomColor: '#EA580C',
    borderRadius: 13,
  },

  robotArmLeft: {
    position: 'absolute',
    left: -15,
    top: 80,
    width: 25,
    height: 70,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    transform: [{ rotate: '-15deg' }],
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },

  robotArmRight: {
    position: 'absolute',
    right: -15,
    top: 80,
    width: 25,
    height: 70,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    transform: [{ rotate: '15deg' }],
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: -2, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },

  bookContainer: {
    position: 'absolute',
    right: 20,
    bottom: 40,
    zIndex: 3,
  },

  bookCover: {
    width: 100,
    height: 120,
    backgroundColor: '#F97316',
    borderRadius: 8,
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  bookPages: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 12,
    height: 108,
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
  },

  heartBadge: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },

  sparkles: {
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
  },

  heartEmoji: {
    fontSize: 24,
    color: '#FFFFFF',
  },

  titleContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },

  title: {
    fontSize: 34,
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
    marginTop: 8,
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
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.95)',
    letterSpacing: 1.5,
    fontWeight: '400',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  version: {
    position: 'absolute',
    bottom: 50,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 1,
    fontWeight: '500',
  },
});
