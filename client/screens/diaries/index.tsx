import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { usePassword } from '@/contexts/PasswordContext';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useCSSVariable } from 'uniwind';
import { buildApiUrl } from '@/utils';
import {
  getLocalDiaries,
  type LocalDiary,
} from '@/utils/localStorage';

interface Diary {
  id: string;
  title: string | null;
  content: string;
  mood: string | null;
  mood_intensity: number | null;
  mood_analysis: any;
  tags: string[] | null;
  created_at: string;
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

export default function DiariesScreen() {
  const router = useSafeRouter();
  const { isLocked, hasPassword, lockApp, decryptData } = usePassword();
  const { isAuthenticated, isLoading: authLoading, token, logout, isOfflineMode, user } = useAuth();

  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [background, surface, accent, foreground, muted, border] = useCSSVariable([
    '--color-background',
    '--color-surface',
    '--color-accent',
    '--color-foreground',
    '--color-muted',
    '--color-border',
  ]) as string[];

  const fetchDiaries = useCallback(async () => {
    try {
      setLoading(true);

      // 检查是否已登录
      if (!isAuthenticated || !token) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // 1. 先从本地加载日记
      const localDiaries = await getLocalDiaries();

      // 2. 如果是在线模式且用户开启了云端同步，从云端加载并合并
      if (!isOfflineMode && user?.cloud_sync_enabled) {
        try {
          /**
           * 服务端文件：server/main.py
           * 接口：GET /api/v1/diaries
           */
          const response = await fetch(buildApiUrl('/api/v1/diaries'), {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));

            // 处理 401 或 403 错误，自动登出
            if (response.status === 401 || response.status === 403) {
              console.error('Token invalid, logging out');
              logout();
              router.replace('/login');
              return;
            }

            throw new Error(errorData.error || `HTTP ${response.status}`);
          }

          const data = await response.json();

          // 检查返回的数据是否是数组
          if (!Array.isArray(data)) {
            console.error('Expected array but got:', typeof data, data);
          } else {
            // 合并本地和云端数据，去重（以云端数据为准）
            const cloudDiaries = data.map((diary: Diary) => {
              // 标题直接使用，不需要解密
              const displayTitle = diary.title || '';

              // 内容需要解密
              const decryptedContent = decryptData(diary.content) || diary.content;

              return {
                ...diary,
                title: displayTitle,
                content: decryptedContent,
                is_uploaded: true, // 云端数据标记为已上传
              };
            });

            // 合并数据，以云端数据为准
            const mergedDiaries: Diary[] = [...cloudDiaries];

            // 将本地数据转换为Diary类型
            localDiaries.forEach((localDiary: LocalDiary) => {
              const existingIndex = mergedDiaries.findIndex(d => d.id === localDiary.id);
              if (existingIndex >= 0) {
                // 如果已存在，保留云端数据（更权威）
                return;
              }
              // 如果不存在，添加本地数据
              mergedDiaries.push({
                id: localDiary.id,
                title: localDiary.title,
                content: localDiary.content,
                mood: localDiary.mood,
                mood_intensity: null,
                mood_analysis: null,
                tags: localDiary.tags,
                created_at: localDiary.created_at,
              });
            });

            setDiaries(mergedDiaries);
          }
        } catch (error) {
          console.error('Error fetching cloud diaries:', error);
          // 网络错误时，只显示本地数据
          // 将本地数据转换为Diary类型
          const localDiariesConverted: Diary[] = localDiaries.map((localDiary: LocalDiary) => ({
            id: localDiary.id,
            title: localDiary.title,
            content: localDiary.content,
            mood: localDiary.mood,
            mood_intensity: null,
            mood_analysis: null,
            tags: localDiary.tags,
            created_at: localDiary.created_at,
          }));
          setDiaries(localDiariesConverted);
          if (!isOfflineMode) {
            Alert.alert('提示', '无法连接到云端，显示本地数据');
          }
        }
      } else {
        // 离线模式或未开启云端同步，只显示本地数据
        // 将本地数据转换为Diary类型
        const localDiariesConverted: Diary[] = localDiaries.map((localDiary: LocalDiary) => ({
          id: localDiary.id,
          title: localDiary.title,
          content: localDiary.content,
          mood: localDiary.mood,
          mood_intensity: null,
          mood_analysis: null,
          tags: localDiary.tags,
          created_at: localDiary.created_at,
        }));
        setDiaries(localDiariesConverted);
      }
    } catch (error) {
      console.error('Error fetching diaries:', error);
      Alert.alert('错误', '获取日记失败，请重试');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [decryptData, token, isAuthenticated, isOfflineMode, user?.cloud_sync_enabled]);

  useFocusEffect(
    useCallback(() => {
      // 检查用户是否已登录
      if (!authLoading && !isAuthenticated) {
        router.replace('/login');
        return;
      }

      // 已登录，加载数据
      if (!authLoading && isAuthenticated) {
        fetchDiaries();
      }
    }, [authLoading, isAuthenticated])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDiaries();
  };

  const renderDiaryItem = ({ item }: { item: Diary }) => {
    const date = new Date(item.created_at);
    const dateStr = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

    const emotionColor = item.mood ? emotionColors[item.mood] || emotionColors['未识别'] : emotionColors['未识别'];
    const emotionLabel = item.mood ? emotionLabels[item.mood] || item.mood : '';

    return (
      <TouchableOpacity
        style={[
          styles.diaryCard,
          {
            backgroundColor: surface,
            borderColor: border,
          }
        ]}
        onPress={() => router.push('/diary-detail', { id: item.id })}
      >
        <View style={styles.diaryHeader}>
          <View style={styles.dateContainer}>
            <Text style={[styles.dateText, { color: muted }]}>{dateStr}</Text>
            <Text style={[styles.timeText, { color: muted }]}>{timeStr}</Text>
          </View>
          {item.mood && (
            <View style={[
              styles.emotionTag,
              { backgroundColor: `${emotionColor}20` }
            ]}>
              <View style={[styles.emotionDot, { backgroundColor: emotionColor }]} />
              <Text style={[styles.emotionText, { color: foreground }]}>{emotionLabel}</Text>
            </View>
          )}
        </View>
        {item.title && (
          <Text style={[styles.diaryTitle, { color: foreground }]} numberOfLines={1}>
            {item.title}
          </Text>
        )}
        <Text style={[styles.diaryContent, { color: foreground }]} numberOfLines={item.title ? 2 : 3}>
          {item.content}
        </Text>
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {item.tags.map((tag, index) => (
              <View key={index} style={[styles.tag, { backgroundColor: `${accent}15` }]}>
                <Text style={[styles.tagText, { color: accent }]}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <FontAwesome6 name="book-open" size={64} color={muted} style={styles.emptyIcon} />
      <Text style={[styles.emptyText, { color: muted }]}>还没有日记</Text>
      <Text style={[styles.emptySubtext, { color: muted }]}>点击下方按钮开始记录</Text>
    </View>
  );

  return (
    <Screen>
      <View style={[styles.container, { backgroundColor: background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: foreground }]}>我的日记</Text>
          <Text style={[styles.subtitle, { color: muted }]}>记录每一天的心情</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={accent} />
          </View>
        ) : (
          <FlatList
            data={diaries}
            renderItem={renderDiaryItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={renderEmpty}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={accent}
              />
            }
          />
        )}

        <TouchableOpacity
          style={[styles.fab, { backgroundColor: accent }]}
          onPress={() => router.push('/write-diary')}
        >
          <FontAwesome6 name="plus" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 100,
  },
  diaryCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  diaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 12,
  },
  emotionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  emotionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emotionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  diaryContent: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  diaryTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
