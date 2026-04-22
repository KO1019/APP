import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useCSSVariable } from 'uniwind';
import { buildApiUrl } from '@/utils';

interface AboutInfo {
  app_name: string;
  version: string;
  description: string;
  features: string[];
  privacy_policy: string;
  contact: string;
}

export default function AboutScreen() {
  const [aboutInfo, setAboutInfo] = useState<AboutInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const [background, surface, accent, foreground, muted, border] = useCSSVariable([
    '--color-background',
    '--color-surface',
    '--color-accent',
    '--color-foreground',
    '--color-muted',
    '--color-border',
  ]) as string[];

  useEffect(() => {
    fetchAboutInfo();
  }, []);

  const fetchAboutInfo = async () => {
    try {
      setLoading(true);
      /**
       * 服务端文件：server/main.py
       * 接口：GET /api/v1/app/about
       */
      const response = await fetch(buildApiUrl('/api/v1/app/about'));

      if (!response.ok) {
        throw new Error('获取关于信息失败');
      }

      const data = await response.json();
      setAboutInfo(data);
    } catch (error) {
      console.error('Error fetching about info:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScrollView style={[styles.container, { backgroundColor: background }]}>
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={accent} />
            <Text style={[styles.loadingText, { color: muted }]}>加载中...</Text>
          </View>
        ) : aboutInfo ? (
          <>
            {/* Logo和标题 */}
            <View style={styles.header}>
              <View style={[styles.logoContainer, { backgroundColor: `${accent}20` }]}>
                <FontAwesome6 name="book-journal-whills" size={64} color={accent} />
              </View>
              <Text style={[styles.appName, { color: foreground }]}>{aboutInfo.app_name}</Text>
              <Text style={[styles.version, { color: muted }]}>版本 {aboutInfo.version}</Text>
              <Text style={[styles.description, { color: muted }]}>
                {aboutInfo.description}
              </Text>
            </View>

            {/* 功能列表 */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: foreground }]}>主要功能</Text>
              {aboutInfo.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <FontAwesome6 name="circle-check" size={20} color={accent} />
                  <Text style={[styles.featureText, { color: foreground }]}>{feature}</Text>
                </View>
              ))}
            </View>

            {/* 隐私政策 */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: foreground }]}>隐私政策</Text>
              <View style={[styles.policyBox, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}>
                <Text style={[styles.policyText, { color: muted }]}>
                  {aboutInfo.privacy_policy}
                </Text>
              </View>
            </View>

            {/* 联系方式 */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: foreground }]}>联系我们</Text>
              <View style={[styles.contactBox, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}>
                <FontAwesome6 name="envelope" size={20} color={accent} style={styles.contactIcon} />
                <Text style={[styles.contactText, { color: foreground }]}>{aboutInfo.contact}</Text>
              </View>
            </View>

            {/* 底部信息 */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: muted }]}>
                All rights reserved.
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.error}>
            <FontAwesome6 name="triangle-exclamation" size={48} color={muted} />
            <Text style={[styles.errorText, { color: muted }]}>加载失败</Text>
            <TouchableOpacity style={[styles.retryButton, { backgroundColor: accent }]} onPress={fetchAboutInfo}>
              <Text style={styles.retryButtonText}>重试</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  loading: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
  },
  version: {
    fontSize: 14,
    marginTop: 8,
  },
  description: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    marginLeft: 12,
  },
  policyBox: {
    padding: 16,
    borderRadius: 12,
  },
  policyText: {
    fontSize: 14,
    lineHeight: 22,
  },
  contactBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  contactIcon: {
    marginRight: 12,
  },
  contactText: {
    fontSize: 16,
  },
  footer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
  },
  error: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
