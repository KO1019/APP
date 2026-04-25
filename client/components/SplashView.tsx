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
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Ionicons } from '@expo/vector-icons';

// 防止原生启动屏自动隐藏
SplashScreen.preventAutoHideAsync();

const { width, height } = Dimensions.get('window');

export default function SplashView() {
  const router = useSafeRouter();

  // 动画值 - 必须在组件顶部声明
  const robotY = useSharedValue(100);
  const robotOpacity = useSharedValue(0);
  const robotScale = useSharedValue(0.5);

  const bookRotation = useSharedValue(-15);
  const bookOpacity = useSharedValue(0);

  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(50);

  const heartScale = useSharedValue(1);

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
      await SplashScreen.hideAsync();

      const token = await AsyncStorage.getItem('userToken');

      if (token) {
        router.replace('/');
      } else {
        router.replace('/welcome');
      }
    } catch (error) {
      console.error('启动页跳转失败:', error);
      await SplashScreen.hideAsync();
      router.replace('/welcome');
    }
  };

  useEffect(() => {
    // 机器人入场动画
    robotOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) });
    robotScale.value = withSpring(1, { damping: 12, stiffness: 100 });
    robotY.value = withSpring(0, { damping: 12, stiffness: 100 });

    // 书本入场动画
    bookOpacity.value = withDelay(300, withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) }));
    bookRotation.value = withDelay(300, withSpring(0, { damping: 8, stiffness: 80 }));

    // 标题入场
    titleOpacity.value = withDelay(600, withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) }));
    titleY.value = withDelay(600, withSpring(0, { damping: 12, stiffness: 100 }));

    // 爱心跳动
    heartScale.value = withDelay(800,
      withRepeat(
        withSequence(
          withTiming(1.1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );

    // 闪光效果
    const animateSparkle = (scale, opacity, delay) => {
      scale.value = withDelay(delay,
        withRepeat(
          withSequence(
            withTiming(1.2, { duration: 800, easing: Easing.out(Easing.ease) }),
            withTiming(0, { duration: 800, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          false
        )
      );
      opacity.value = withDelay(delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) }),
            withTiming(0, { duration: 800, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          false
        )
      );
    };

    animateSparkle(sparkleScale1, sparkleOpacity1, 1000);
    animateSparkle(sparkleScale2, sparkleOpacity2, 1150);
    animateSparkle(sparkleScale3, sparkleOpacity3, 1300);
    animateSparkle(sparkleScale4, sparkleOpacity4, 1450);

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

  const sparkleStyle4 = useAnimatedStyle(() => ({
    opacity: sparkleOpacity4.value,
    transform: [{ scale: sparkleScale4.value }],
  }));

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* 渐变背景 */}
      <View style={styles.background} />

      {/* 装饰性元素 */}
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />
      <View style={styles.decorCircle3} />

      {/* 主要内容 */}
      <View style={styles.content}>
        {/* 机器人和日记 */}
        <View style={styles.iconContainer}>
          {/* 机器人 */}
          <Animated.View style={[styles.robotContainer, robotStyle]}>
            <View style={styles.robotBody}>
              <View style={styles.robotHead}>
                <View style={styles.robotAntenna} />
                <View style={styles.robotAntennaBall} />
              </View>
              <View style={styles.robotFace}>
                <View style={styles.eyesContainer}>
                  <View style={styles.eye} />
                  <View style={styles.eye} />
                </View>
                <View style={styles.cheeksContainer}>
                  <View style={styles.cheek} />
                  <View style={styles.cheek} />
                </View>
                <View style={styles.mouth} />
              </View>
            </View>
          </Animated.View>

          {/* 日记本 */}
          <Animated.View style={[styles.bookContainer, bookStyle]}>
            <View style={styles.bookCover}>
              <Animated.View style={[styles.heartBadge, heartStyle]}>
                <Ionicons name="heart" size={28} color="#FFFFFF" />
              </Animated.View>
            </View>
            <View style={styles.bookPages} />
          </Animated.View>
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

        {/* 闪光装饰 */}
        <View style={styles.sparkles}>
          <Animated.View style={[styles.sparkle, sparkleStyle1, { top: 20, left: 30 }]}>
            <Ionicons name="star" size={24} color="#FFFFFF" />
          </Animated.View>
          <Animated.View style={[styles.sparkle, sparkleStyle2, { top: 40, right: 40 }]}>
            <Ionicons name="star-outline" size={20} color="#FFFFFF" />
          </Animated.View>
          <Animated.View style={[styles.sparkle, sparkleStyle3, { top: 80, left: 50 }]}>
            <Ionicons name="star" size={18} color="#FFFFFF" />
          </Animated.View>
          <Animated.View style={[styles.sparkle, sparkleStyle4, { top: 60, right: 60 }]}>
            <Ionicons name="star-outline" size={22} color="#FFFFFF" />
          </Animated.View>
        </View>
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

  decorCircle1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    top: '10%',
    left: -50,
  },

  decorCircle2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    top: '20%',
    right: -30,
  },

  decorCircle3: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    bottom: '15%',
    left: '60%',
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
    marginBottom: 50,
  },

  robotContainer: {
    position: 'absolute',
    left: 0,
    top: 20,
  },

  robotBody: {
    width: 140,
    height: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: 70,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },

  robotHead: {
    position: 'absolute',
    top: -20,
    left: 10,
    right: 10,
    height: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },

  robotAntenna: {
    position: 'absolute',
    top: -18,
    width: 8,
    height: 22,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },

  robotAntennaBall: {
    position: 'absolute',
    top: -8,
    left: '50%',
    marginLeft: -6,
    width: 12,
    height: 12,
    backgroundColor: '#EA580C',
    borderRadius: 6,
  },

  robotFace: {
    flex: 1,
    marginTop: 10,
    alignItems: 'center',
  },

  eyesContainer: {
    flexDirection: 'row',
    gap: 25,
    marginTop: 15,
  },

  eye: {
    width: 28,
    height: 28,
    backgroundColor: '#4B5563',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },

  cheeksContainer: {
    flexDirection: 'row',
    gap: 55,
    marginTop: 8,
  },

  cheek: {
    width: 16,
    height: 10,
    backgroundColor: 'rgba(249, 115, 22, 0.5)',
    borderRadius: 8,
  },

  mouth: {
    marginTop: 12,
    width: 30,
    height: 15,
    borderBottomWidth: 4,
    borderBottomColor: '#EA580C',
    borderRadius: 15,
  },

  bookContainer: {
    position: 'absolute',
    right: 10,
    bottom: 0,
  },

  bookCover: {
    width: 120,
    height: 140,
    backgroundColor: '#F97316',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  bookPages: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 15,
    height: 124,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
  },

  heartBadge: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },

  titleContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },

  title: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 3,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },

  titleUnderline: {
    width: 120,
    height: 3,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    borderRadius: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },

  taglineContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },

  tagline: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.95)',
    letterSpacing: 2,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  sparkles: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    height: 150,
  },

  sparkle: {
    position: 'absolute',
  },

  version: {
    position: 'absolute',
    bottom: 50,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 1,
    fontWeight: '500',
  },
});
