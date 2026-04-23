import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Image, Platform } from 'react-native';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useCSSVariable } from 'uniwind';
import { buildApiUrl } from '@/utils';
import { getLocalDiaryById, deleteLocalDiary } from '@/utils/localStorage';

interface DiaryDetail {
  id: string;
  title: string | null;
  content: string;
  mood: string | null;
  mood_intensity: number | null;
  mood_analysis: any;
  tags: string[] | null;
  created_at: string;
  images?: string[] | null;
  location?: { lat: number; lng: number; address?: string } | null;
  weather?: string | null;
  template_id?: string | null;
}

const emotionColors: Record<string, string> = {
  '愉悦': '#4ade80',
  '悲伤': '#60a5fa',
  '焦虑': '#fbbf24',
  '愤怒': '#f87171',
  '恐惧': '#c084fc',
  '惊讶': '#f472b6',
  '厌恶': '#94a3b8',
  '孤独': '#818cf8',
  '平静': '#2dd4bf',
  '兴奋': '#fb923c',
  '未识别': '#94a3b8',
  // 新的情绪映射
  'happy': '#FFD93D',
  'calm': '#6BCB77',
  'anxious': '#4D96FF',
  'sad': '#6B7280',
  'angry': '#FF6B6B',
  'tired': '#9D4EDD',
};

const emotionLabels: Record<string, string> = {
  'happy': '开心',
  'calm': '平静',
  'anxious': '焦虑',
  'sad': '悲伤',
  'angry': '愤怒',
  'tired': '疲惫',
};

const weatherIcons: Record<string, string> = {
  'sunny': 'sun',
  'cloudy': 'cloud',
  'rainy': 'cloud-rain',
  'snowy': 'snowflake',
  'windy': 'wind',
  'stormy': 'cloud-bolt',
};

const weatherLabels: Record<string, string> = {
  'sunny': '晴天',
  'cloudy': '多云',
  'rainy': '雨天',
  'snowy': '下雪',
  'windy': '大风',
  'stormy': '雷暴',
};

export default function DiaryDetailScreen() {
  const router = useSafeRouter();
  const { id } = useSafeSearchParams<{ id: string }>();
  const { token } = useAuth();

  const [diary, setDiary] = useState<DiaryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const [background, surface, accent, foreground, muted, border, destructive] = useCSSVariable([
    '--color-background',
    '--color-surface',
    '--color-accent',
    '--color-foreground',
    '--color-muted',
    '--color-border',
    '--color-destructive',
  ]) as string[];

  const fetchDiaryDetail = useCallback(async () => {
    if (!id) {
      console.error('[DiaryDetail] No diary id provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // 检查是否为本地日记（以"local_"开头的ID）
      if (id.startsWith('local_')) {
        console.log('[DiaryDetail] Loading from local storage');
        const localDiary = await getLocalDiaryById(id);

        if (localDiary) {
          console.log('[DiaryDetail] Loaded from local storage');
          setDiary(localDiary as DiaryDetail);
          return;
        } else {
          console.error('[DiaryDetail] Diary not found in local storage');
          Alert.alert('错误', '日记不存在');
          router.back();
          return;
        }
      }

      // 从后端加载日记
      if (!token) {
        console.error('[DiaryDetail] No auth token available for remote diary');
        Alert.alert('错误', '需要登录才能查看此日记');
        router.back();
        return;
      }

      const apiUrl = buildApiUrl(`/api/v1/diaries/${id}`);
      console.log('[DiaryDetail] Fetching diary from:', apiUrl);

      /**
       * 服务端文件：server/main.py
       * 接口：GET /api/v1/diaries/{diary_id}
       * Path 参数：diary_id: string
       * Headers: Authorization: Bearer {token}
       */
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('[DiaryDetail] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DiaryDetail] Fetch failed:', response.status, errorText);
        throw new Error(`Failed to fetch diary: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('[DiaryDetail] Diary data loaded:', data);
      setDiary(data);
    } catch (error) {
      console.error('[DiaryDetail] Error fetching diary detail:', error);
      Alert.alert('错误', '加载日记失败');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useFocusEffect(
    useCallback(() => {
      fetchDiaryDetail();
    }, [fetchDiaryDetail])
  );

  const handleEdit = () => {
    if (diary) {
      router.push('/write-diary', { editId: diary.id });
    }
  };

  const handleDelete = () => {
    console.log('[DiaryDetail] 删除按钮被点击');

    if (Platform.OS === 'web') {
      // Web端使用 confirm
      const confirmed = window.confirm('确定要删除这篇日记吗？此操作不可恢复。');
      if (!confirmed) return;
      performDelete();
    } else {
      // 移动端使用 Alert
      Alert.alert(
        '确认删除',
        '确定要删除这篇日记吗？此操作不可恢复。',
        [
          { text: '取消', style: 'cancel' },
          {
            text: '删除',
            style: 'destructive',
            onPress: performDelete,
          },
        ]
      );
    }
  };

  const performDelete = async () => {
    if (!diary) return;

    try {
      setDeleting(true);

      if (diary.id.startsWith('local_')) {
        // 删除本地日记
        await deleteLocalDiary(diary.id);
      } else if (token) {
        // 删除服务器日记
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/diaries/${diary.id}`,
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || '删除失败');
        }
      }

      router.back();
    } catch (error: any) {
      console.error('[DiaryDetail] Error deleting diary:', error);
      const errorMsg = error.message || '删除失败，请稍后重试';
      if (Platform.OS === 'web') {
        alert('删除失败: ' + errorMsg);
      } else {
        Alert.alert('删除失败', errorMsg);
      }
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Screen safeAreaEdges={['left', 'right', 'top']}>
        <View style={[styles.container, { backgroundColor: background }]}>
          <View style={[styles.header, { paddingTop: 12 }]}>
            <TouchableOpacity onPress={() => router.back()}>
              <FontAwesome6 name="arrow-left" size={24} color={foreground} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: foreground }]}>日记详情</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={accent} />
          </View>
        </View>
      </Screen>
    );
  }

  if (!diary) {
    return (
      <Screen safeAreaEdges={['left', 'right', 'top']}>
        <View style={[styles.container, { backgroundColor: background }]}>
          <View style={[styles.header, { paddingTop: 12 }]}>
            <TouchableOpacity onPress={() => router.back()}>
              <FontAwesome6 name="arrow-left" size={24} color={foreground} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: foreground }]}>日记详情</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.emptyContainer}>
            <FontAwesome6 name="file-xmark" size={64} color={muted} />
            <Text style={[styles.emptyText, { color: muted }]}>日记不存在</Text>
          </View>
        </View>
      </Screen>
    );
  }

  const date = new Date(diary.created_at);
  const dateStr = date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  const emotionColor = diary.mood ? emotionColors[diary.mood] || emotionColors['未识别'] : null;
  const emotionLabel = diary.mood ? emotionLabels[diary.mood] || diary.mood : null;
  const weatherIcon = diary.weather ? weatherIcons[diary.weather] : null;
  const weatherLabel = diary.weather ? weatherLabels[diary.weather] : null;

  const displayTitle = diary.title || '';
  const displayContent = diary.content;

  return (
    <Screen safeAreaEdges={['left', 'right', 'top']}>
      <View style={[styles.container, { backgroundColor: background }]}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* 头部导航 */}
          <View style={[styles.header, { paddingTop: 12 }]}>
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
              <FontAwesome6 name="arrow-left" size={24} color={foreground} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: foreground }]}>日记详情</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={handleEdit}
                style={styles.headerButton}
                activeOpacity={0.7}
              >
                <FontAwesome6 name="pen-to-square" size={20} color={accent} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDelete}
                style={[styles.headerButton, styles.deleteButton]}
                activeOpacity={0.7}
                disabled={deleting}
              >
                <FontAwesome6 name="trash" size={20} color={deleting ? muted : destructive} />
              </TouchableOpacity>
            </View>
          </View>

          {/* 主要内容区域 */}
          <View style={styles.contentContainer}>
            {/* 日期和时间 */}
            <View style={styles.metaRow}>
              <View style={[styles.metaItem, { backgroundColor: `${accent}10` }]}>
                <FontAwesome6 name="calendar" size={16} color={accent} />
                <Text style={[styles.metaText, { color: foreground }]}>{dateStr}</Text>
              </View>
              <View style={[styles.metaItem, { backgroundColor: `${muted}10` }]}>
                <FontAwesome6 name="clock" size={16} color={muted} />
                <Text style={[styles.metaText, { color: muted }]}>{timeStr}</Text>
              </View>
            </View>

            {/* 天气和情绪 */}
            {(diary.weather || diary.mood) && (
              <View style={styles.weatherMoodRow}>
                {diary.weather && (
                  <View style={[styles.badge, { backgroundColor: `${accent}15` }]}>
                    <FontAwesome6 name={weatherIcon as any} size={18} color={accent} />
                    <Text style={[styles.badgeText, { color: foreground }]}>{weatherLabel}</Text>
                  </View>
                )}
                {diary.mood && (
                  <View style={[styles.badge, { backgroundColor: `${emotionColor}20` }]}>
                    <FontAwesome6 name="face-smile" size={18} color={emotionColor} />
                    <Text style={[styles.badgeText, { color: foreground }]}>{emotionLabel}</Text>
                    {diary.mood_intensity && (
                      <Text style={[styles.intensityText, { color: muted }]}>({diary.mood_intensity}%)</Text>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* 标题 */}
            {displayTitle && (
              <Text style={[styles.diaryTitle, { color: foreground }]}>{displayTitle}</Text>
            )}

            {/* 内容 */}
            <Text style={[styles.contentText, { color: foreground }]}>{displayContent}</Text>

            {/* 图片网格 */}
            {diary.images && diary.images.length > 0 && (
              <View style={styles.imagesContainer}>
                <Text style={[styles.sectionTitle, { color: muted }]}>图片</Text>
                <View style={styles.imageGrid}>
                  {diary.images.map((imageUri, index) => (
                    <Image
                      key={index}
                      source={{ uri: imageUri }}
                      style={styles.image}
                      resizeMode="cover"
                    />
                  ))}
                </View>
              </View>
            )}

            {/* 位置 - 修复toFixed错误 */}
            {diary.location && diary.location.latitude && diary.location.longitude && (
              <View style={[styles.infoCard, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}>
                <FontAwesome6 name="location-dot" size={16} color={accent} />
                <Text style={[styles.infoText, { color: foreground }]}>
                  {diary.location.address || `${diary.location.latitude.toFixed(4)}, ${diary.location.longitude.toFixed(4)}`}
                </Text>
              </View>
            )}

            {/* 标签 */}
            {diary.tags && diary.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                <Text style={[styles.sectionTitle, { color: muted }]}>标签</Text>
                <View style={styles.tagsRow}>
                  {diary.tags.map((tag, index) => (
                    <View key={index} style={[styles.tag, { backgroundColor: `${accent}10`, borderColor: `${accent}30`, borderWidth: 1 }]}>
                      <FontAwesome6 name="tag" size={12} color={accent} />
                      <Text style={[styles.tagText, { color: foreground }]}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 情绪分析结果 */}
            {diary.mood_analysis && (
              <View style={[styles.emotionAnalysisCard, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}>
                <Text style={[styles.sectionTitle, { color: muted }]}>AI情绪分析</Text>
                {diary.mood_analysis.summary && (
                  <Text style={[styles.analysisText, { color: foreground }]}>{diary.mood_analysis.summary}</Text>
                )}
                {diary.mood_analysis.emotion_tags && diary.mood_analysis.emotion_tags.length > 0 && (
                  <View style={styles.tagsRow}>
                    {diary.mood_analysis.emotion_tags.map((tag: string, index: number) => (
                      <View key={index} style={[styles.tag, { backgroundColor: `${accent}10` }]}>
                        <Text style={[styles.tagText, { color: foreground }]}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* 与AI聊聊按钮 */}
            <TouchableOpacity
              style={[styles.chatButton, { backgroundColor: accent }]}
              onPress={() => router.push('/chat', { diaryId: diary.id })}
              activeOpacity={0.8}
            >
              <FontAwesome6 name="comments" size={24} color="#FFFFFF" />
              <View style={styles.chatButtonContent}>
                <Text style={[styles.chatButtonText, { color: '#FFFFFF' }]}>与AI聊聊</Text>
                <Text style={[styles.chatButtonSubtitle, { color: `${accent}90` }]}>让AI陪伴你聊聊这篇日记</Text>
              </View>
              <FontAwesome6 name="arrow-right" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
    gap: 20,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  metaText: {
    fontSize: 14,
    fontWeight: '500',
  },
  weatherMoodRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  intensityText: {
    fontSize: 12,
  },
  diaryTitle: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 26,
  },
  imagesContainer: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
  },
  infoText: {
    fontSize: 14,
    flex: 1,
  },
  tagsContainer: {
    gap: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 13,
  },
  emotionAnalysisCard: {
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  analysisText: {
    fontSize: 15,
    lineHeight: 22,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  chatButtonContent: {
    flex: 1,
  },
  chatButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  chatButtonSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
  },
});
