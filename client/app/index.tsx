import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, Animated } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useCSSVariable } from 'uniwind';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';

// 防止启动屏自动隐藏
SplashScreen.preventAutoHideAsync();

export default function Index() {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;
  const router = useSafeRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // 启动动画
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // 等待初始化完成后隐藏启动屏
    const prepareApp = async () => {
      try {
        // 等待应用资源加载
        await SplashScreen.hideAsync();

        // 等待认证状态检查完成
        if (!isLoading) {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            // 导航到合适的页面
            if (isAuthenticated) {
              router.replace('/(tabs)');
            } else {
              router.replace('/login');
            }
          });
        }
      } catch (e) {
        console.error('SplashScreen error:', e);
        // 如果出错，直接导航
        if (isAuthenticated) {
          router.replace('/(tabs)');
        } else {
          router.replace('/login');
        }
      }
    };

    // 延迟2秒让用户看到启动页
    const timer = setTimeout(prepareApp, 2000);

    return () => clearTimeout(timer);
  }, [isLoading, isAuthenticated, fadeAnim, scaleAnim, router]);

  // 如果还在加载中，显示加载动画
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: '#EA580C' }]}>
        <StatusBar barStyle="light-content" />
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Logo图标 */}
          <View style={styles.iconContainer}>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              <View style={[styles.iconInner, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                <Text style={styles.iconEmoji}>💙</Text>
              </View>
            </View>
          </View>

          {/* 应用名称 */}
          <Text style={styles.appName}>AI情绪日记</Text>
          <Text style={styles.tagline}>记录每一份温暖</Text>

          {/* 装饰元素 */}
          <View style={styles.decoration}>
            <View style={[styles.dot, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
            <View style={[styles.dot, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
            <View style={[styles.dot, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
          </View>
        </Animated.View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconEmoji: {
    fontSize: 48,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '400',
  },
  decoration: {
    flexDirection: 'row',
    marginTop: 40,
    gap: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
