import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

// 防止启动屏自动隐藏
SplashScreen.preventAutoHideAsync();

export default function AppSplashScreen() {
  useEffect(() => {
    // 模拟加载，2秒后隐藏启动屏
    const timer = setTimeout(() => {
      SplashScreen.hideAsync();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <View style={styles.container}>
        {/* 背景渐变效果 */}
        <View style={styles.backgroundGradient}>
          <View style={styles.gradientTop} />
          <View style={styles.gradientBottom} />
        </View>

        {/* 中央内容 */}
        <View style={styles.content}>
          {/* 图标容器 */}
          <View style={styles.iconContainer}>
            <Text style={styles.emojiIcon}>📖</Text>
          </View>

          {/* 应用名称 */}
          <Text style={styles.appName}>AI情绪日记</Text>

          {/* 副标题 */}
          <Text style={styles.subtitle}>记录每一刻的情绪</Text>

          {/* 加载指示器 */}
          <ActivityIndicator size="large" color="#FFFFFF" style={styles.loader} />
        </View>

        {/* 底部装饰 */}
        <View style={styles.bottomDecoration}>
          <View style={styles.dot} />
          <View style={[styles.dot, { opacity: 0.6 }]} />
          <View style={[styles.dot, { opacity: 0.3 }]} />
        </View>
      </View>
    </>
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
    backgroundColor: '#F97316',
    opacity: 0.3,
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: '#7C2D12',
    opacity: 0.3,
  },
  content: {
    alignItems: 'center',
    zIndex: 1,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  emojiIcon: {
    fontSize: 60,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 32,
    letterSpacing: 1,
  },
  loader: {
    marginTop: 24,
  },
  bottomDecoration: {
    position: 'absolute',
    bottom: 80,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
});
