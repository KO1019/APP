import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

interface WelcomeContent {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  button_text?: string;
}

export default function WelcomeScreen() {
  const router = useSafeRouter();
  const [welcome, setWelcome] = useState<WelcomeContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    checkAndLoadWelcome();
  }, []);

  const checkAndLoadWelcome = async () => {
    try {
      // 获取欢迎内容
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/welcome`);
      const data = await response.json();

      if (!data.welcome) {
        // 没有欢迎内容，直接返回
        router.replace('/');
        return;
      }

      // 检查用户是否已查看过此欢迎内容
      const hasViewed = await AsyncStorage.getItem(`welcome_viewed_${data.welcome.id}`);

      if (hasViewed) {
        // 已查看过，直接返回
        router.replace('/');
        return;
      }

      // 显示欢迎界面
      setWelcome(data.welcome);
      setIsVisible(true);
      setIsLoading(false);
    } catch (error) {
      console.error('加载欢迎内容失败:', error);
      router.replace('/');
    }
  };

  const handleGetStarted = async () => {
    if (!welcome) return;

    try {
      // 标记为已查看
      await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/user/welcome/${welcome.id}/viewed`,
        { method: 'POST' }
      );

      // 本地保存
      await AsyncStorage.setItem(`welcome_viewed_${welcome.id}`, 'true');

      // 导航到首页
      router.replace('/');
    } catch (error) {
      console.error('标记欢迎内容失败:', error);
      // 即使失败也继续
      router.replace('/');
    }
  };

  if (isLoading || !isVisible || !welcome) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Animated.View
        entering={FadeIn.duration(600)}
        exiting={FadeOut.duration(300)}
        style={styles.content}
      >
        {/* 图片区域 */}
        {welcome.image_url ? (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: welcome.image_url }}
              style={styles.image}
              resizeMode="cover"
            />
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderIcon}>🌟</Text>
          </View>
        )}

        {/* 内容区域 */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>{welcome.title}</Text>
          <Text style={styles.content}>{welcome.content}</Text>
        </View>

        {/* 按钮 */}
        <TouchableOpacity
          style={styles.button}
          onPress={handleGetStarted}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>{welcome.button_text || '开始使用'}</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  imageContainer: {
    width: width * 0.8,
    height: height * 0.4,
    marginBottom: 40,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    width: width * 0.6,
    height: height * 0.3,
    marginBottom: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
  },
  placeholderIcon: {
    fontSize: 80,
  },
  textContainer: {
    width: '100%',
    marginBottom: 60,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 40,
  },
  content: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  button: {
    width: width * 0.8,
    height: 56,
    backgroundColor: '#6366F1',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
