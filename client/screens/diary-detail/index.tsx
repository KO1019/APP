import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useCSSVariable } from 'uniwind';

interface DiaryDetail {
  id: string;
  content: string;
  mood: string | null;
  mood_intensity: number | null;
  mood_analysis: any;
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
};

export default function DiaryDetailScreen() {
  const router = useSafeRouter();
  const { id } = useSafeSearchParams<{ id: string }>();

  const [diary, setDiary] = useState<DiaryDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [background, surface, accent, foreground, muted, border] = useCSSVariable([
    '--color-background',
    '--color-surface',
    '--color-accent',
    '--color-foreground',
    '--color-muted',
    '--color-border',
  ]) as string[];

  const fetchDiaryDetail = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);

      /**
       * 服务端文件：server/src/index.ts
       * 接口：GET /api/v1/diaries/:id
       * Path 参数：id: string
       */
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/diaries/${id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch diary');
      }

      const data = await response.json();
      setDiary(data);
    } catch (error) {
      console.error('Error fetching diary detail:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchDiaryDetail();
    }, [fetchDiaryDetail])
  );

  if (loading) {
    return (
      <Screen>
        <View style={[styles.container, { backgroundColor: background }]}>
          <View style={styles.header}>
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
      <Screen>
        <View style={[styles.container, { backgroundColor: background }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <FontAwesome6 name="arrow-left" size={24} color={foreground} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: foreground }]}>日记详情</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: muted }]}>日记不存在</Text>
          </View>
        </View>
      </Screen>
    );
  }

  const date = new Date(diary.created_at);
  const dateStr = date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  const emotionColor = diary.mood ? emotionColors[diary.mood] || emotionColors['未识别'] : emotionColors['未识别'];

  return (
    <Screen>
      <ScrollView style={[styles.container, { backgroundColor: background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={24} color={foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: foreground }]}>日记详情</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.contentContainer}>
          <View style={[styles.dateCard, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}>
            <View style={styles.dateRow}>
              <FontAwesome6 name="calendar" size={16} color={accent} />
              <Text style={[styles.dateText, { color: foreground }]}>{dateStr}</Text>
            </View>
            <View style={styles.dateRow}>
              <FontAwesome6 name="clock" size={16} color={muted} />
              <Text style={[styles.timeText, { color: muted }]}>{timeStr}</Text>
            </View>
          </View>

          {diary.mood && (
            <View style={[styles.emotionCard, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}>
              <Text style={[styles.emotionLabel, { color: muted }]}>情绪分析</Text>
              <View style={[styles.emotionTag, { backgroundColor: `${emotionColor}20` }]}>
                <View style={[styles.emotionDot, { backgroundColor: emotionColor }]} />
                <Text style={[styles.emotionText, { color: foreground }]}>{diary.mood}</Text>
                {diary.mood_intensity !== null && (
                  <Text style={[styles.intensityText, { color: muted }]}>强度: {diary.mood_intensity}</Text>
                )}
              </View>
              {diary.mood_analysis?.summary && (
                <Text style={[styles.emotionSummary, { color: foreground }]}>{diary.mood_analysis.summary}</Text>
              )}
              {diary.mood_analysis?.emotion_tags && diary.mood_analysis.emotion_tags.length > 0 && (
                <View style={styles.tagsContainer}>
                  {diary.mood_analysis.emotion_tags.map((tag: string, index: number) => (
                    <View key={index} style={[styles.tag, { backgroundColor: `${accent}20`, borderColor: accent, borderWidth: 1 }]}>
                      <Text style={[styles.tagText, { color: foreground }]}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          <View style={[styles.contentCard, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}>
            <Text style={[styles.contentLabel, { color: muted }]}>日记内容</Text>
            <Text style={[styles.contentText, { color: foreground }]}>{diary.content}</Text>
          </View>

          {/* 与AI聊聊按钮 */}
          <TouchableOpacity
            style={[styles.chatButton, { backgroundColor: accent }]}
            onPress={() => router.push('/chat', { diaryId: diary.id })}
            activeOpacity={0.8}
          >
            <FontAwesome6 name="comments" size={20} color="#FFFFFF" style={styles.chatButtonIcon} />
            <Text style={styles.chatButtonText}>与AI聊聊</Text>
            <Text style={[styles.chatButtonSubtitle, { color: `${accent}90` }]}>让AI陪伴你聊聊这篇日记</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
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
  },
  emptyText: {
    fontSize: 16,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  dateCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 16,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '500',
  },
  timeText: {
    fontSize: 14,
  },
  emotionCard: {
    borderRadius: 16,
    padding: 16,
  },
  emotionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  emotionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    marginBottom: 12,
  },
  emotionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  emotionText: {
    fontSize: 18,
    fontWeight: '600',
  },
  intensityText: {
    fontSize: 14,
  },
  emotionSummary: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 13,
  },
  contentCard: {
    borderRadius: 16,
    padding: 16,
  },
  contentLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
  },
  chatButton: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  chatButtonIcon: {
    marginBottom: 4,
  },
  chatButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  chatButtonSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
