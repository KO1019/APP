import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useCSSVariable } from 'uniwind';
import { useAuth } from '@/contexts/AuthContext';
import { buildApiUrl } from '@/utils';

interface Diary {
  id: string;
  mood: string | null;
  mood_intensity: number | null;
  created_at: string;
}

export default function StatsScreen() {
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

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
      // 检查是否已登录
      if (!token) {
        console.warn('fetchDiaries: No token, skipping request');
        setDiaries([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      /**
       * 服务端文件：server/src/index.ts
       * 接口：GET /api/v1/diaries
       * Headers: Authorization: Bearer {token}
       */
      const response = await fetch(buildApiUrl('/api/v1/diaries'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error(`fetchDiaries: HTTP ${response.status}`, errorData);
        setDiaries([]);
        return;
      }

      const data = await response.json();

      // 检查返回的数据是否是数组
      if (!Array.isArray(data)) {
        console.error('fetchDiaries: Expected array but got:', typeof data, data);
        setDiaries([]);
        return;
      }

      setDiaries(data);
    } catch (error) {
      console.error('Error fetching diaries:', error);
      setDiaries([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchDiaries();
    }, [fetchDiaries])
  );

  const getMoodStats = () => {
    const moodCount: Record<string, number> = {};
    let totalIntensity = 0;
    let intensityCount = 0;

    // 确保 diaries 是数组
    if (!Array.isArray(diaries)) {
      console.warn('getMoodStats: diaries is not an array', diaries);
      return { moodCount, avgIntensity: 0, topMood: undefined };
    }

    diaries.forEach(diary => {
      if (diary.mood) {
        moodCount[diary.mood] = (moodCount[diary.mood] || 0) + 1;
      }
      if (diary.mood_intensity !== null) {
        totalIntensity += diary.mood_intensity;
        intensityCount++;
      }
    });

    const avgIntensity = intensityCount > 0 ? Math.round(totalIntensity / intensityCount) : 0;
    const topMood = Object.entries(moodCount).sort((a, b) => b[1] - a[1])[0];

    return { moodCount, avgIntensity, topMood };
  };

  const { moodCount, avgIntensity, topMood } = getMoodStats();

  const renderStatCard = (icon: string, title: string, value: string, subtitle?: string) => (
    <View style={[styles.statCard, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}>
      <View style={[styles.statIcon, { backgroundColor: `${accent}20` }]}>
        <FontAwesome6 name={icon as any} size={24} color={accent} />
      </View>
      <View style={styles.statContent}>
        <Text style={[styles.statValue, { color: foreground }]}>{value}</Text>
        <Text style={[styles.statTitle, { color: muted }]}>{title}</Text>
        {subtitle && <Text style={[styles.statSubtitle, { color: muted }]}>{subtitle}</Text>}
      </View>
    </View>
  );

  if (loading) {
    return (
      <Screen>
        <View style={[styles.container, { backgroundColor: background }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: foreground }]}>情绪统计</Text>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={accent} />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView style={[styles.container, { backgroundColor: background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: foreground }]}>情绪统计</Text>
          <Text style={[styles.subtitle, { color: muted }]}>了解你的情绪变化</Text>
        </View>

        <View style={styles.statsContainer}>
          {renderStatCard('book-open', '日记总数', `${Array.isArray(diaries) ? diaries.length : 0}`, '篇')}
          {renderStatCard('face-smile', '平均情绪强度', `${avgIntensity}`, topMood ? `/ ${topMood[0]}` : '')}
        </View>

        <View style={[styles.section, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}>
          <Text style={[styles.sectionTitle, { color: foreground }]}>情绪分布</Text>
          {Object.keys(moodCount).length > 0 ? (
            Object.entries(moodCount).map(([mood, count]) => (
              <View key={mood} style={styles.moodBarContainer}>
                <Text style={[styles.moodName, { color: foreground }]}>{mood}</Text>
                <View style={styles.moodBarBackground}>
                  <View
                    style={[
                      styles.moodBar,
                      {
                        backgroundColor: accent,
                        width: `${(count / diaries.length) * 100}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.moodCount, { color: muted }]}>{count}</Text>
              </View>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: muted }]}>暂无数据</Text>
          )}
        </View>

        <View style={[styles.tipsSection, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}>
          <FontAwesome6 name="lightbulb" size={20} color={accent} style={styles.tipsIcon} />
          <Text style={[styles.tipsText, { color: foreground }]}>
            记录日记可以帮助你更好地了解自己的情绪模式，坚持记录，你会发现自己情绪的变化规律。
          </Text>
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
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  statTitle: {
    fontSize: 12,
    marginTop: 4,
  },
  statSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  moodBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  moodName: {
    width: 60,
    fontSize: 14,
  },
  moodBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  moodBar: {
    height: '100%',
    borderRadius: 4,
  },
  moodCount: {
    fontSize: 14,
    width: 30,
    textAlign: 'right',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
  tipsSection: {
    margin: 16,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 100,
  },
  tipsIcon: {
    marginTop: 2,
  },
  tipsText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
