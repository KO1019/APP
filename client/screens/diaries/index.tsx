import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Alert, Modal, KeyboardAvoidingView, Platform, TextInput, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { usePassword } from '@/contexts/PasswordContext';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useCSSVariable } from 'uniwind';
import { buildApiUrl } from '@/utils';
import { useAppUpdate } from '@/hooks/useAppUpdate';
import { UpdateProgressModal } from '@/components/UpdateProgressModal';
import AnnouncementModal from '@/components/AnnouncementModal';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getLocalDiaries,
  type LocalDiary,
} from '@/utils/localStorage';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown, ZoomIn } from 'react-native-reanimated';
import { SmartDateInput } from '@/components/SmartDateInput';
import Slider from '@react-native-community/slider';

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
  const { checkAutoUpdate, downloadProgress, downloading, showProgressModal } = useAppUpdate();

  // 公告弹窗
  const {
    currentAnnouncement,
    isVisible: announcementVisible,
    loadAnnouncements,
    showNext: showNextAnnouncement,
    close: closeAnnouncement,
  } = useAnnouncements();

  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [filteredDiaries, setFilteredDiaries] = useState<Diary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 筛选状态
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string>(''); // 情绪筛选
  const [minIntensity, setMinIntensity] = useState<number>(0); // 最小心情强度
  const [keyword, setKeyword] = useState<string>(''); // 关键字搜索

  const [background, surface, accent, foreground, muted, border] = useCSSVariable([
    '--color-background',
    '--color-surface',
    '--color-accent',
    '--color-foreground',
    '--color-muted',
    '--color-border',
  ]) as string[];

  // 应用筛选
  useEffect(() => {
    if (!startDate && !endDate && !selectedMood && minIntensity === 0 && !keyword) {
      setFilteredDiaries(diaries);
    } else {
      const filtered = diaries.filter(diary => {
        // 时间筛选
        const diaryDate = new Date(diary.created_at);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);

        if (start && diaryDate < start) return false;
        if (end && diaryDate > end) return false;

        // 情绪筛选
        if (selectedMood && diary.mood !== selectedMood) return false;

        // 心情强度筛选
        if (minIntensity > 0 && diary.mood_intensity && diary.mood_intensity < minIntensity) return false;

        // 关键字搜索
        if (keyword) {
          const lowerKeyword = keyword.toLowerCase();
          const titleMatch = diary.title?.toLowerCase().includes(lowerKeyword);
          const contentMatch = diary.content.toLowerCase().includes(lowerKeyword);
          const tagsMatch = diary.tags?.some(tag => tag.toLowerCase().includes(lowerKeyword));
          if (!titleMatch && !contentMatch && !tagsMatch) return false;
        }

        return true;
      });
      setFilteredDiaries(filtered);
    }
  }, [diaries, startDate, endDate, selectedMood, minIntensity, keyword]);

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
           * Query参数：start_date?, end_date?
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

        // 检查APP更新（每天最多检查一次）
        checkAppUpdate();

        // 加载公告
        loadAnnouncements();
      }
    }, [authLoading, isAuthenticated])
  );

  const checkAppUpdate = async () => {
    try {
      // 检查更新（自动检查，每天一次）
      await checkAutoUpdate();
    } catch (error) {
      console.error('检查更新失败:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDiaries();
  };

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    setSelectedMood('');
    setMinIntensity(0);
    setKeyword('');
    setShowFilterModal(false);
  };

  const handleApplyFilter = () => {
    // 验证日期
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start > end) {
        Alert.alert('错误', '开始日期不能晚于结束日期');
        return;
      }
    }
    setShowFilterModal(false);
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
      <Text style={[styles.emptyText, { color: muted }]}>
        {startDate || endDate ? '没有符合条件的日记' : '还没有日记'}
      </Text>
      <Text style={[styles.emptySubtext, { color: muted }]}>
        {startDate || endDate || selectedMood || minIntensity > 0 || keyword ? '尝试调整筛选条件' : '点击下方按钮开始记录'}
      </Text>
    </View>
  );

  return (
    <Screen>
      <View style={[styles.container, { backgroundColor: background }]}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={[styles.title, { color: foreground }]}>我的日记</Text>
            <TouchableOpacity
              style={[styles.filterButton, { borderColor: border }]}
              onPress={() => setShowFilterModal(true)}
            >
              <FontAwesome6 name="filter" size={16} color={startDate || endDate || selectedMood || minIntensity > 0 || keyword ? accent : muted} />
              <Text style={[styles.filterButtonText, { color: startDate || endDate || selectedMood || minIntensity > 0 || keyword ? accent : muted }]}>
                {startDate || endDate || selectedMood || minIntensity > 0 || keyword ? '筛选中' : '筛选'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.subtitle, { color: muted }]}>
            {startDate || endDate || selectedMood || minIntensity > 0 || keyword
              ? `筛选条件 (${filteredDiaries.length}篇)`
              : '记录每一天的心情'}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={accent} />
          </View>
        ) : (
          <FlatList
            data={filteredDiaries}
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

      {/* 筛选Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="none"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <Animated.View style={styles.modalOverlay} entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
          <Animated.View
            style={[styles.modalContent, { backgroundColor: '#FFFFFF' }]}
            entering={ZoomIn.duration(300).springify().damping(20)}
            exiting={FadeOut.duration(200)}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: foreground }]}>筛选日记</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <FontAwesome6 name="xmark" size={20} color={muted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* 关键字搜索 */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterLabel, { color: foreground }]}>关键字搜索</Text>
                <View style={[styles.searchBox, { borderColor: border }]}>
                  <FontAwesome6 name="search" size={16} color={muted} />
                  <TextInput
                    style={[styles.searchInput, { color: foreground }]}
                    placeholder="搜索标题、内容或标签"
                    placeholderTextColor={muted}
                    value={keyword}
                    onChangeText={setKeyword}
                  />
                  {keyword && (
                    <TouchableOpacity onPress={() => setKeyword('')}>
                      <FontAwesome6 name="xmark" size={14} color={muted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* 情绪筛选 */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterLabel, { color: foreground }]}>情绪</Text>
                <View style={styles.moodButtons}>
                  <TouchableOpacity
                    style={[
                      styles.moodButton,
                      !selectedMood && { backgroundColor: `${accent}20`, borderColor: accent }
                    ]}
                    onPress={() => setSelectedMood('')}
                  >
                    <Text style={[styles.moodButtonText, { color: !selectedMood ? accent : foreground }]}>全部</Text>
                  </TouchableOpacity>
                  {Object.entries(emotionLabels).map(([key, label]) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.moodButton,
                        selectedMood === key && { backgroundColor: `${emotionColors[key]}20`, borderColor: emotionColors[key] }
                      ]}
                      onPress={() => setSelectedMood(key)}
                    >
                      <View style={[styles.moodDot, { backgroundColor: emotionColors[key] }]} />
                      <Text style={[
                        styles.moodButtonText,
                        { color: selectedMood === key ? emotionColors[key] : foreground }
                      ]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 心情强度 */}
              <View style={styles.filterSection}>
                <View style={styles.intensityHeader}>
                  <Text style={[styles.filterLabel, { color: foreground }]}>心情强度</Text>
                  <Text style={[styles.intensityValue, { color: accent }]}>{minIntensity === 0 ? '不限' : `${minIntensity}+`}</Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={5}
                  step={1}
                  value={minIntensity}
                  onValueChange={setMinIntensity}
                  minimumTrackTintColor={accent}
                  maximumTrackTintColor={border}
                  thumbTintColor={accent}
                />
                <View style={styles.sliderLabels}>
                  <Text style={[styles.sliderLabel, { color: muted }]}>不限</Text>
                  <Text style={[styles.sliderLabel, { color: muted }]}>1</Text>
                  <Text style={[styles.sliderLabel, { color: muted }]}>2</Text>
                  <Text style={[styles.sliderLabel, { color: muted }]}>3</Text>
                  <Text style={[styles.sliderLabel, { color: muted }]}>4</Text>
                  <Text style={[styles.sliderLabel, { color: muted }]}>5</Text>
                </View>
              </View>

              {/* 时间范围 */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterLabel, { color: foreground }]}>时间范围</Text>
                <SmartDateInput
                  label="开始日期"
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="请选择开始日期"
                  mode="date"
                  displayFormat="YYYY-MM-DD"
                  containerStyle={{ marginBottom: 12 }}
                />

                <SmartDateInput
                  label="结束日期"
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="请选择结束日期"
                  mode="date"
                  displayFormat="YYYY-MM-DD"
                />

                <View style={styles.quickFilterContainer}>
                  <View style={styles.quickFilterButtons}>
                    <TouchableOpacity
                      style={[styles.quickFilterButton, { backgroundColor: `${accent}15`, borderColor: accent }]}
                      onPress={() => {
                        const today = new Date();
                        const year = today.getFullYear();
                        const month = String(today.getMonth() + 1).padStart(2, '0');
                        const day = String(today.getDate()).padStart(2, '0');
                        setStartDate(`${year}-${month}-${day}`);
                        setEndDate(`${year}-${month}-${day}`);
                      }}
                    >
                      <Text style={[styles.quickFilterButtonText, { color: accent }]}>今天</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.quickFilterButton, { backgroundColor: `${accent}15`, borderColor: accent }]}
                      onPress={() => {
                        const end = new Date();
                        const start = new Date();
                        start.setDate(start.getDate() - 7);
                        const startYear = start.getFullYear();
                        const startMonth = String(start.getMonth() + 1).padStart(2, '0');
                        const startDay = String(start.getDate()).padStart(2, '0');
                        const endYear = end.getFullYear();
                        const endMonth = String(end.getMonth() + 1).padStart(2, '0');
                        const endDay = String(end.getDate()).padStart(2, '0');
                        setStartDate(`${startYear}-${startMonth}-${startDay}`);
                        setEndDate(`${endYear}-${endMonth}-${endDay}`);
                      }}
                    >
                      <Text style={[styles.quickFilterButtonText, { color: accent }]}>近7天</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.quickFilterButton, { backgroundColor: `${accent}15`, borderColor: accent }]}
                      onPress={() => {
                        const end = new Date();
                        const start = new Date();
                        start.setDate(start.getDate() - 30);
                        const startYear = start.getFullYear();
                        const startMonth = String(start.getMonth() + 1).padStart(2, '0');
                        const startDay = String(start.getDate()).padStart(2, '0');
                        const endYear = end.getFullYear();
                        const endMonth = String(end.getMonth() + 1).padStart(2, '0');
                        const endDay = String(end.getDate()).padStart(2, '0');
                        setStartDate(`${startYear}-${startMonth}-${startDay}`);
                        setEndDate(`${endYear}-${endMonth}-${endDay}`);
                      }}
                    >
                      <Text style={[styles.quickFilterButtonText, { color: accent }]}>近30天</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { borderColor: border }]}
                onPress={handleClearFilter}
              >
                <Text style={[styles.cancelButtonText, { color: muted }]}>清除</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, { backgroundColor: accent }]}
                onPress={handleApplyFilter}
              >
                <Text style={styles.confirmButtonText}>应用</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>

      <UpdateProgressModal
        visible={showProgressModal}
        downloading={downloading}
        downloadProgress={downloadProgress}
      />

      <AnnouncementModal
        visible={announcementVisible}
        announcement={currentAnnouncement}
        onClose={closeAnnouncement}
        onConfirm={showNextAnnouncement}
      />
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '500',
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalBody: {
    paddingVertical: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 2,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // 快捷筛选样式
  quickFilterContainer: {
    marginTop: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(234, 88, 12, 0.1)',
  },
  quickFilterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  quickFilterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  quickFilterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // 筛选区块样式
  filterSection: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(234, 88, 12, 0.08)',
  },
  filterLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  // 搜索框样式
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  // 情绪按钮样式
  moodButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
    gap: 6,
  },
  moodDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  moodButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // 心情强度样式
  intensityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  intensityValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: -8,
  },
  sliderLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
