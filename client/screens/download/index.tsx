import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Linking,
  Platform,
} from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Screen } from '@/components/Screen';
import { buildApiUrl } from '@/utils';
import { FontAwesome6 } from '@expo/vector-icons';

interface AppDownloadInfo {
  android: {
    name: string;
    url: string;
    version: string;
    size: string;
    min_version: string;
  };
  ios: {
    name: string;
    url: string;
    version: string;
    size: string;
    min_version: string;
  };
  download_page: string;
}

export default function DownloadScreen() {
  const [downloadInfo, setDownloadInfo] = useState<AppDownloadInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useSafeRouter();

  useEffect(() => {
    fetchDownloadInfo();
  }, []);

  const fetchDownloadInfo = async () => {
    try {
      const response = await fetch(buildApiUrl('/app/download'));
      const data = await response.json();
      setDownloadInfo(data);
    } catch (error) {
      console.error('Failed to fetch download info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (url: string) => {
    Linking.openURL(url).catch(err => console.error('Failed to open URL:', err));
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EA580C" />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView style={styles.container}>
        {/* 头部Banner */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>APP下载</Text>
            <Text style={styles.subtitle}>AI情绪日记 - 您的智能情绪伙伴</Text>
          </View>
        </View>

        {/* 下载卡片 */}
        <View style={styles.content}>
          {/* Android下载 */}
          <TouchableOpacity
            style={[styles.downloadCard, styles.androidCard]}
            onPress={() => downloadInfo && handleDownload(downloadInfo.android.url)}
          >
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <Ionicons name="android" size={40} color="#3DDC84" />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.platformName}>Android</Text>
                <Text style={styles.versionText}>版本 {downloadInfo?.android.version}</Text>
              </View>
              <Ionicons name="download" size={24} color="#3DDC84" />
            </View>
            <View style={styles.cardDetails}>
              <View style={styles.detailItem}>
                <Ionicons name="hard-drive" size={16} color="#666" />
                <Text style={styles.detailText}>{downloadInfo?.android.size}</Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="mobile-screen" size={16} color="#666" />
                <Text style={styles.detailText}>{downloadInfo?.android.min_version}+</Text>
              </View>
            </View>
            <View style={styles.downloadButton}>
              <Text style={styles.downloadButtonText}>立即下载</Text>
            </View>
          </TouchableOpacity>

          {/* iOS下载 */}
          <TouchableOpacity
            style={[styles.downloadCard, styles.iosCard]}
            onPress={() => downloadInfo && handleDownload(downloadInfo.ios.url)}
          >
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <Ionicons name="apple" size={40} color="#000000" />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.platformName}>iOS</Text>
                <Text style={styles.versionText}>版本 {downloadInfo?.ios.version}</Text>
              </View>
              <Ionicons name="download" size={24} color="#000000" />
            </View>
            <View style={styles.cardDetails}>
              <View style={styles.detailItem}>
                <Ionicons name="hard-drive" size={16} color="#666" />
                <Text style={styles.detailText}>{downloadInfo?.ios.size}</Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="mobile-screen" size={16} color="#666" />
                <Text style={styles.detailText}>{downloadInfo?.ios.min_version}+</Text>
              </View>
            </View>
            <View style={[styles.downloadButton, styles.iosDownloadButton]}>
              <Text style={styles.downloadButtonText}>前往App Store</Text>
            </View>
          </TouchableOpacity>

          {/* 功能介绍 */}
          <View style={styles.featuresSection}>
            <Text style={styles.sectionTitle}>功能特色</Text>
            <View style={styles.featureItem}>
              <Ionicons name="brain" size={24} color="#EA580C" />
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>AI情绪分析</Text>
                <Text style={styles.featureDescription}>智能识别情绪状态，提供个性化建议</Text>
              </View>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="pen-to-square" size={24} color="#EA580C" />
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>智能写作助手</Text>
                <Text style={styles.featureDescription}>AI伴写、润色、续写，提升写作体验</Text>
              </View>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="stats-chart" size={24} color="#EA580C" />
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>情绪趋势追踪</Text>
                <Text style={styles.featureDescription}>可视化展示情绪变化，助你了解自己</Text>
              </View>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="robot" size={24} color="#EA580C" />
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>AI智能对话</Text>
                <Text style={styles.featureDescription}>24小时在线陪伴，倾听你的心声</Text>
              </View>
            </View>
          </View>

          {/* 温馨提示 */}
          <View style={styles.noticeSection}>
            <Text style={styles.noticeTitle}>温馨提示</Text>
            <Text style={styles.noticeText}>
              • Android用户请允许"未知来源"应用安装{'\n'}
              • iOS用户请前往App Store下载{'\n'}
              • 首次使用需注册账号{'\n'}
              • 如遇问题请联系客服
            </Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF7ED',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#EA580C',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    padding: 24,
  },
  downloadCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  androidCard: {
    borderWidth: 2,
    borderColor: 'rgba(61, 220, 132, 0.3)',
  },
  iosCard: {
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 16,
  },
  platformName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  versionText: {
    fontSize: 14,
    color: '#666',
  },
  cardDetails: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  downloadButton: {
    backgroundColor: '#EA580C',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  iosDownloadButton: {
    backgroundColor: '#000000',
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  featuresSection: {
    marginTop: 32,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  featureContent: {
    marginLeft: 16,
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  noticeSection: {
    backgroundColor: 'rgba(234, 88, 12, 0.1)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EA580C',
    marginBottom: 12,
  },
  noticeText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 24,
  },
});
