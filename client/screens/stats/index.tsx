import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useCSSVariable } from 'uniwind';
import { useAuth } from '@/contexts/AuthContext';
import { buildApiUrl } from '@/utils';
import {
  getLocalDiaries,
  getLocalChatMessages,
} from '@/utils/localStorage';

interface Diary {
  id: string;
  mood: string | null;
  mood_intensity: number | null;
  tags?: string[];
  created_at: string;
  content: string;
  is_uploaded?: boolean;
}

interface ChatMessage {
  id: string;
  created_at: string;
  is_uploaded?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function StatsScreen() {
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const { token, isOfflineMode, user } = useAuth();

  const [background, surface, accent, foreground, muted, border, success, warning, error] = useCSSVariable([
    '--color-background',
    '--color-surface',
    '--color-accent',
    '--color-foreground',
    '--color-muted',
    '--color-border',
    '--color-success',
    '--color-warning',
    '--color-error',
  ]) as string[];

  const fetchDiaries = useCallback(async () => {
    try {
      setLoading(true);

      // 优先从本地加载
      const localDiaries = await getLocalDiaries();

      // 如果在线且开启云端同步，从云端加载并合并
      if (!isOfflineMode && user?.cloud_sync_enabled && token) {
        try {
          const response = await fetch(buildApiUrl('/api/v1/diaries'), {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const cloudDiaries = await response.json();
            // 合并数据
            const mergedDiaries: Diary[] = [...cloudDiaries];
            localDiaries.forEach((localDiary: any) => {
              if (!mergedDiaries.find(d => d.id === localDiary.id)) {
                mergedDiaries.push({
                  id: localDiary.id,
                  mood: localDiary.mood || null,
                  mood_intensity: null,
                  tags: localDiary.tags || [],
                  created_at: localDiary.created_at,
                  content: localDiary.content || '',
                });
              }
            });
            setDiaries(mergedDiaries);
          } else {
            setDiaries(localDiaries.map((d: any) => ({
              id: d.id,
              mood: d.mood || null,
              mood_intensity: null,
              tags: d.tags || [],
              created_at: d.created_at,
              content: d.content || '',
            })));
          }
        } catch (error) {
          console.error('Error fetching cloud diaries:', error);
          setDiaries(localDiaries.map((d: any) => ({
            id: d.id,
            mood: d.mood || null,
            mood_intensity: null,
            tags: d.tags || [],
            created_at: d.created_at,
            content: d.content || '',
          })));
        }
      } else {
        setDiaries(localDiaries.map((d: any) => ({
          id: d.id,
          mood: d.mood || null,
          mood_intensity: null,
          tags: d.tags || [],
          created_at: d.created_at,
          content: d.content || '',
        })));
      }

      // 加载聊天记录
      const localChats = await getLocalChatMessages();
      setChats(localChats.map((c: any) => ({
        id: c.id,
        created_at: c.created_at,
      })));
    } catch (error) {
      console.error('Error fetching data:', error);
      setDiaries([]);
      setChats([]);
    } finally {
      setLoading(false);
    }
  }, [token, isOfflineMode, user?.cloud_sync_enabled]);

  useFocusEffect(
    useCallback(() => {
      fetchDiaries();
    }, [fetchDiaries])
  );

  // 计算统计数据
  const stats = useMemo(() => {
    const today = new Date();
    const thisWeek = new Date(today);
    thisWeek.setDate(today.getDate() - 7);

    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisYear = new Date(today.getFullYear(), 0, 1);

    // 时间范围统计
    const thisWeekDiaries = diaries.filter(d => new Date(d.created_at) >= thisWeek);
    const thisMonthDiaries = diaries.filter(d => new Date(d.created_at) >= thisMonth);
    const thisYearDiaries = diaries.filter(d => new Date(d.created_at) >= thisYear);

    // 连续打卡天数
    const sortedDiaries = [...diaries].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    let streakDays = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const diary of sortedDiaries) {
      const diaryDate = new Date(diary.created_at);
      diaryDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor((currentDate.getTime() - diaryDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === streakDays) {
        streakDays++;
        currentDate = diaryDate;
      } else if (diffDays > streakDays) {
        break;
      }
    }

    // 情绪统计
    const moodCount: Record<string, number> = {};
    let totalIntensity = 0;
    let intensityCount = 0;

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

    // 标签统计
    const tagCount: Record<string, number> = {};
    diaries.forEach(diary => {
      if (diary.tags && Array.isArray(diary.tags)) {
        diary.tags.forEach(tag => {
          if (tag) {
            tagCount[tag] = (tagCount[tag] || 0) + 1;
          }
        });
      }
    });

    const topTags = Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // 字数统计
    const totalWords = diaries.reduce((sum, d) => sum + (d.content?.length || 0), 0);
    const avgWords = diaries.length > 0 ? Math.round(totalWords / diaries.length) : 0;

    // 对话统计
    const totalChats = chats.length;
    const thisMonthChats = chats.filter(c => new Date(c.created_at) >= thisMonth).length;

    // 最近7天的情绪趋势
    const moodTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayDiaries = diaries.filter(d => {
        const dDate = new Date(d.created_at);
        return dDate >= date && dDate < nextDate;
      });

      const dayIntensity = dayDiaries.length > 0
        ? dayDiaries.reduce((sum, d) => sum + (d.mood_intensity || 0), 0) / dayDiaries.length
        : 0;

      moodTrend.push({
        date: date.toLocaleDateString('zh-CN', { weekday: 'short' }),
        value: dayIntensity,
      });
    }

    return {
      totalDiaries: diaries.length,
      thisWeekDiaries: thisWeekDiaries.length,
      thisMonthDiaries: thisMonthDiaries.length,
      thisYearDiaries: thisYearDiaries.length,
      streakDays,
      moodCount,
      avgIntensity,
      topMood,
      topTags,
      totalWords,
      avgWords,
      totalChats,
      thisMonthChats,
      moodTrend,
    };
  }, [diaries, chats]);

  const getMoodColor = (mood: string) => {
    const colors: Record<string, string> = {
      happy: success,
      excited: success,
      calm: accent,
      neutral: muted,
      sad: warning,
      angry: error,
      anxious: error,
    };
    return colors[mood] || muted;
  };

  const getMoodEmoji = (mood: string) => {
    const emojis: Record<string, string> = {
      happy: '开心',
      excited: '兴奋',
      calm: '平静',
      neutral: '中性',
      sad: '难过',
      angry: '生气',
      anxious: '焦虑',
    };
    return emojis[mood] || '未知';
  };

  const renderStatCard = (
    icon: string,
    title: string,
    value: string | number,
    subtitle?: string,
    iconColor?: string
  ) => (
    <View style={[styles.statCard, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}>
      <View style={[styles.statIcon, { backgroundColor: `${iconColor || accent}20` }]}>
        <FontAwesome6 name={icon as any} size={24} color={iconColor || accent} />
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
          <Text style={[styles.title, { color: foreground }]}>数据统计</Text>
          <Text style={[styles.subtitle, { color: muted }]}>了解你的情绪和生活习惯</Text>
        </View>

        {/* 核心统计卡片 */}
        <View style={styles.statsContainer}>
          {renderStatCard('fire', '连续打卡', `${stats.streakDays}天`, '坚持记录', success)}
          {renderStatCard('calendar-days', '本月日记', `${stats.thisMonthDiaries}篇`, `总计${stats.totalDiaries}篇`, warning)}
          {renderStatCard('comments', '本月对话', `${stats.thisMonthChats}次`, `总计${stats.totalChats}次`, accent)}
          {renderStatCard('face-smile', '平均情绪', `${stats.avgIntensity}`, stats.topMood ? `最常：${stats.topMood[0]}` : '', stats.topMood ? getMoodColor(stats.topMood[0]) : muted)}
        </View>

        {/* 更多统计 */}
        <View style={[styles.section, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}>
          <Text style={[styles.sectionTitle, { color: foreground }]}>详细信息</Text>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: muted }]}>本周日记</Text>
            <Text style={[styles.detailValue, { color: foreground }]}>{stats.thisWeekDiaries} 篇</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: border }]} />

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: muted }]}>今年日记</Text>
            <Text style={[styles.detailValue, { color: foreground }]}>{stats.thisYearDiaries} 篇</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: border }]} />

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: muted }]}>总字数</Text>
            <Text style={[styles.detailValue, { color: foreground }]}>{stats.totalWords.toLocaleString()} 字</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: border }]} />

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: muted }]}>平均字数</Text>
            <Text style={[styles.detailValue, { color: foreground }]}>{stats.avgWords} 字/篇</Text>
          </View>
        </View>

        {/* 情绪分布 */}
        <View style={[styles.section, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}>
          <Text style={[styles.sectionTitle, { color: foreground }]}>情绪分布</Text>
          {Object.keys(stats.moodCount).length > 0 ? (
            Object.entries(stats.moodCount).map(([mood, count]) => (
              <View key={mood} style={styles.moodBarContainer}>
                <Text style={[styles.moodNameText, { color: foreground }]}>{getMoodEmoji(mood)} {mood}</Text>
                <View style={styles.moodBarBackground}>
                  <View
                    style={[
                      styles.moodBar,
                      {
                        backgroundColor: getMoodColor(mood),
                        width: `${(count / stats.totalDiaries) * 100}%`,
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

        {/* 最近7天情绪趋势 */}
        <View style={[styles.section, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}>
          <Text style={[styles.sectionTitle, { color: foreground }]}>最近7天情绪趋势</Text>
          <View style={styles.trendContainer}>
            {stats.moodTrend.map((item, index) => (
              <View key={index} style={styles.trendItem}>
                <View style={[styles.trendBarContainer, { height: 120 }]}>
                  <View
                    style={[
                      styles.trendBar,
                      {
                        backgroundColor: item.value > 60 ? success : item.value > 40 ? accent : warning,
                        height: `${Math.max(item.value * 1.5, 10)}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.trendLabel, { color: muted }]}>{item.date}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 常用标签 */}
        {stats.topTags.length > 0 && (
          <View style={[styles.section, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}>
            <Text style={[styles.sectionTitle, { color: foreground }]}>常用标签</Text>
            <View style={styles.tagsContainer}>
              {stats.topTags.map(([tag, count]) => (
                <View key={tag} style={[styles.tagBadge, { backgroundColor: `${accent}10`, borderColor: `${accent}30`, borderWidth: 1 }]}>
                  <Text style={[styles.tagName, { color: accent }]}>{tag}</Text>
                  <Text style={[styles.tagCount, { color: muted }]}>{count}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 提示信息 */}
        <View style={[styles.tipsSection, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}>
          <FontAwesome6 name="lightbulb" size={20} color={accent} style={styles.tipsIcon} />
          <Text style={[styles.tipsText, { color: foreground }]}>
            记录日记可以帮助你更好地了解自己的情绪模式。坚持记录，你会发现自己的情绪变化规律，从而更好地管理自己的心理健康。
          </Text>
        </View>

        <View style={{ height: 40 }} />
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
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    width: (SCREEN_WIDTH - 44) / 2,
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
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  detailLabel: {
    fontSize: 15,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    height: 1,
  },
  moodBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  moodNameText: {
    width: 100,
    fontSize: 14,
  },
  moodEmojiContainer: {
    width: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  moodEmoji: {
    fontSize: 14,
    fontWeight: '500',
    color: 'transparent',
  },
  moodName: {
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
  trendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  trendItem: {
    flex: 1,
    alignItems: 'center',
  },
  trendBarContainer: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  trendBar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  trendLabel: {
    fontSize: 11,
    marginTop: 6,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  tagName: {
    fontSize: 14,
    fontWeight: '500',
  },
  tagCount: {
    fontSize: 12,
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
