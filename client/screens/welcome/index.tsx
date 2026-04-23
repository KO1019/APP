import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Screen } from '@/components/Screen';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

// 暖橙色主题配色
const THEME = {
  background: '#FFF7ED',
  surface: 'rgba(255, 255, 255, 0.95)',
  accent: '#EA580C',
  foreground: '#78350F',
  muted: '#A16207',
};

export default function WelcomeScreen() {
  const router = useSafeRouter();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
          router.replace('/login');
        }
      } catch (error) {
        router.replace('/login');
      }
    };
    checkUser();
  }, [router]);

  const features = [
    {
      icon: '🎤',
      title: 'AI 语音助手',
      description: '通过自然对话记录心情，AI 智能识别情绪并给出建议'
    },
    {
      icon: '📝',
      title: '智能日记',
      description: '记录每日心情变化，生成可视化情绪分析图表'
    },
    {
      icon: '🎨',
      title: '情感分析',
      description: '深度分析情感倾向，发现情绪变化的规律与趋势'
    },
    {
      icon: '🔒',
      title: '隐私保护',
      description: '端到端加密，确保您的日记内容安全私密'
    }
  ];

  const handleGetStarted = () => {
    router.replace('/diaries');
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.container}
        style={{ backgroundColor: THEME.background }}
      >
        {/* Hero Section */}
        <View style={styles.hero}>
          <View style={[styles.logoContainer, { backgroundColor: `${THEME.accent}15` }]}>
            <Text style={styles.logoIcon}>🌟</Text>
          </View>
          <Text style={[styles.title, { color: THEME.foreground }]}>
            欢迎使用
          </Text>
          <Text style={[styles.subtitle, { color: THEME.accent }]}>
            AI 情绪日记
          </Text>
          <Text style={[styles.description, { color: THEME.muted }]}>
            通过智能 AI 助手，记录和了解您的情绪世界
          </Text>
        </View>

        {/* Features Grid */}
        <View style={styles.featuresContainer}>
          {features.map((feature, index) => (
            <View key={index} style={[styles.featureCard, { backgroundColor: THEME.surface }]}>
              <View style={[styles.featureIcon, { backgroundColor: `${THEME.accent}15` }]}>
                <Text style={styles.featureIconText}>{feature.icon}</Text>
              </View>
              <Text style={[styles.featureTitle, { color: THEME.foreground }]}>
                {feature.title}
              </Text>
              <Text style={[styles.featureDescription, { color: THEME.muted }]}>
                {feature.description}
              </Text>
            </View>
          ))}
        </View>

        {/* CTA Button */}
        <View style={styles.ctaContainer}>
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: THEME.accent }]}
            onPress={handleGetStarted}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaButtonText}>开始使用</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoIcon: {
    fontSize: 48,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 24,
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 32,
  },
  featureCard: {
    width: width > 600 ? '48%' : '100%',
    padding: 20,
    borderRadius: 24,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIconText: {
    fontSize: 28,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  ctaContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  ctaButton: {
    paddingHorizontal: 48,
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 280,
    alignItems: 'center',
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
