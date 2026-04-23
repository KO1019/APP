import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Dimensions,
  Modal,
  ActivityIndicator,
  Image,
  SafeAreaView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePassword } from '@/contexts/PasswordContext';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { saveDiaryLocally, markDiaryAsUploaded, getLocalDiaryById } from '@/utils/localStorage';
import { buildApiUrl } from '@/utils';
import { FontAwesome6 } from '@expo/vector-icons';
import { useCSSVariable } from 'uniwind';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

// 情绪选项
const MOODS = [
  { id: 'happy', icon: 'face-laugh-beam', label: '开心', color: '#FFD93D' },
  { id: 'excited', icon: 'face-grin-stars', label: '兴奋', color: '#FFB703' },
  { id: 'calm', icon: 'face-smile', label: '平静', color: '#6BCB77' },
  { id: 'neutral', icon: 'face-meh', label: '中性', color: '#9CA3AF' },
  { id: 'anxious', icon: 'face-frown-open', label: '焦虑', color: '#4D96FF' },
  { id: 'sad', icon: 'face-sad-tear', label: '悲伤', color: '#6B7280' },
  { id: 'angry', icon: 'face-angry', label: '愤怒', color: '#FF6B6B' },
  { id: 'tired', icon: 'face-tired', label: '疲惫', color: '#9D4EDD' },
];

// 天气选项
const WEATHERS = [
  { id: 'sunny', icon: 'sun', label: '晴天' },
  { id: 'cloudy', icon: 'cloud', label: '多云' },
  { id: 'rainy', icon: 'cloud-rain', label: '雨天' },
  { id: 'snowy', icon: 'snowflake', label: '下雪' },
  { id: 'windy', icon: 'wind', label: '大风' },
  { id: 'stormy', icon: 'cloud-bolt', label: '雷暴' },
];

// 模板选项
const TEMPLATES = [
  { id: 'gratitude', title: '感恩日记', prompt: '今天有什么让你感到感恩的事？' },
  { id: 'goal', title: '目标日记', prompt: '你今天取得了什么进步？' },
  { id: 'reflection', title: '反思日记', prompt: '今天有什么值得反思的事情？' },
  { id: 'mood', title: '心情日记', prompt: '描述一下你今天的心情变化' },
  { id: 'free', title: '自由写作', prompt: '写下你想要表达的任何内容' },
];

// AI伴写操作类型
type AIActionType = 'continue' | 'inspiration' | 'polish' | 'analyze';

// 日记详情类型（用于编辑模式）
interface DiaryData {
  created_at: string;
  [key: string]: any;
}

export default function WriteDiaryScreen() {
  const router = useSafeRouter();
  const { editId } = useSafeSearchParams<{ editId?: string }>();
  const insets = useSafeAreaInsets();
  const { encryptData } = usePassword();
  const { token, isOfflineMode, user } = useAuth();

  // 表单状态
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [moodIntensity, setMoodIntensity] = useState(50);
  const [selectedWeather, setSelectedWeather] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showBackConfirmDialog, setShowBackConfirmDialog] = useState(false);

  // 新增功能状态
  const [images, setImages] = useState<string[]>([]);
  const [location, setLocation] = useState<{ latitude: number; longitude: number; address?: string } | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showWeatherModal, setShowWeatherModal] = useState(false);
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false); // 底部工具栏显示状态

  // 日记时间（可修改）
  const [diaryDate, setDiaryDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // 编辑模式：是否正在编辑现有日记
  const [isEditMode, setIsEditMode] = useState(false);
  const [loadingDiary, setLoadingDiary] = useState(false);
  const [diary, setDiary] = useState<DiaryData | null>(null);

  // AI陪伴功能状态（嵌入式，参考WPS）
  const [aiSuggestion, setAiSuggestion] = useState(''); // AI建议内容
  const [aiSuggestionLoading, setAiSuggestionLoading] = useState(false); // AI加载中
  const [aiActionType, setAiActionType] = useState<'continue' | 'inspiration' | 'polish' | 'analyze'>('continue'); // AI操作类型
  const [inputTimer, setInputTimer] = useState<NodeJS.Timeout | null>(null); // 输入定时器

  // 监听用户输入，智能触发AI续写
  useEffect(() => {
    // 清除之前的定时器
    if (inputTimer) {
      clearTimeout(inputTimer);
    }

    // 如果内容超过20个字且没有AI建议，3秒后触发AI续写
    if (content && content.trim().length > 20 && !aiSuggestion) {
      const timer = setTimeout(() => {
        triggerAIContinue();
      }, 3000);
      setInputTimer(timer);
    }

    return () => {
      if (inputTimer) {
        clearTimeout(inputTimer);
      }
    };
  }, [content, aiSuggestion]);

  const [background, surface, accent, foreground, muted, border] = useCSSVariable([
    '--color-background',
    '--color-surface',
    '--color-accent',
    '--color-foreground',
    '--color-muted',
    '--color-border',
  ]) as string[];

  // 加载现有日记数据（编辑模式）
  useEffect(() => {
    const loadDiaryForEdit = async () => {
      if (!editId) {
        setIsEditMode(false);
        return;
      }

      try {
        setLoadingDiary(true);
        setIsEditMode(true);

        // 如果是本地日记
        if (editId.startsWith('local_')) {
          const localDiary = await getLocalDiaryById(editId);
          if (localDiary) {
            setDiary(localDiary);
            setTitle(localDiary.title || '');
            setContent(localDiary.content);
            setSelectedMood(localDiary.mood || null);
            setMoodIntensity(localDiary.mood_intensity || 50);
            setSelectedWeather(localDiary.weather || null);
            setTags(localDiary.tags || []);
            setImages(localDiary.images || []);
            setLocation(localDiary.location || null);
            setSelectedTemplate(localDiary.template_id || null);
            // 设置日记时间为创建时间
            if (localDiary.created_at) {
              setDiaryDate(new Date(localDiary.created_at));
            }
          }
        } else {
          // 从云端加载日记
          if (!token) {
            Alert.alert('错误', '需要登录才能编辑日记');
            router.back();
            return;
          }

          /**
           * 服务端文件：server/main.py
           * 接口：GET /api/v1/diaries/{diary_id}
           * Path 参数：diary_id: string
           * Headers: Authorization: Bearer {token}
           */
          const response = await fetch(buildApiUrl(`/api/v1/diaries/${editId}`), {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            throw new Error('Failed to load diary');
          }

          const data = await response.json();
          setDiary(data);
          setTitle(data.title || '');
          setContent(data.content);
          setSelectedMood(data.mood || null);
          setMoodIntensity(data.mood_intensity || 50);
          setSelectedWeather(data.weather || null);
          setTags(data.tags || []);
          setImages(data.images || []);
          setLocation(data.location || null);
          setSelectedTemplate(data.template_id || null);
          // 设置日记时间为创建时间
          if (data.created_at) {
            setDiaryDate(new Date(data.created_at));
          }
        }
      } catch (error) {
        console.error('Error loading diary for edit:', error);
        Alert.alert('错误', '加载日记失败');
        router.back();
      } finally {
        setLoadingDiary(false);
      }
    };

    loadDiaryForEdit();
  }, [editId, token]);

  // 触发AI续写（自动）
  const triggerAIContinue = async () => {
    if (!content || content.trim().length < 20) return;

    setAiSuggestionLoading(true);
    setAiActionType('continue');

    try {
      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) {
        setAiSuggestionLoading(false);
        return;
      }

      const prompt = `请根据以下日记内容，帮我续写2-3句话，保持原有的写作风格和情绪：

${content}

要求：
1. 保持原有的写作风格和语气
2. 延续当前的情绪氛围
3. 每句话不要太长，简洁自然
4. 直接给出续写内容，不要添加其他解释`;

      const response = await fetch(buildApiUrl('/api/v1/ai/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error('AI响应失败');
      }

      const result = await response.json();
      if (result.content) {
        setAiSuggestion(result.content);
      }
    } catch (error) {
      console.error('Error in AI continue:', error);
    } finally {
      setAiSuggestionLoading(false);
    }
  };

  // 手动触发AI功能（灵感、润色、分析）
  const handleAIAction = async (action: AIActionType) => {
    if (aiSuggestionLoading) return;

    setAiActionType(action);
    setAiSuggestionLoading(true);
    setAiSuggestion('');

    try {
      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) {
        Alert.alert('错误', '请先登录');
        return;
      }

      // 根据不同操作类型构建不同的prompt
      let prompt = '';
      switch (action) {
        case 'continue':
          prompt = `请根据以下日记内容，帮我续写2-3句话，保持原有的写作风格和情绪：

${content}

要求：
1. 保持原有的写作风格和语气
2. 延续当前的情绪氛围
3. 每句话不要太长，简洁自然
4. 直接给出续写内容，不要添加其他解释`;
          break;
        case 'inspiration':
          prompt = `请根据以下日记内容，给我3-5个写作灵感和思路建议：

${content}

要求：
1. 从不同角度提供灵感（情感、事件、思考等）
2. 每个灵感都要具体可操作
3. 帮助用户深入思考和表达
4. 用列表形式呈现，每个灵感单独一行`;
          break;
        case 'polish':
          prompt = `请帮我对以下日记内容进行润色和优化，让表达更加流畅自然：

${content}

要求：
1. 保持原有的意思和情感
2. 优化语句表达，让文字更流畅
3. 适当调整结构，让逻辑更清晰
4. 只返回优化后的完整日记内容，不要添加其他说明`;
          break;
        case 'analyze':
          prompt = `请分析以下日记内容的情绪和特点：

${content}

要求：
1. 识别并描述日记中的情绪
2. 分析日记的核心主题和亮点
3. 给出简短的反馈和鼓励
4. 用温和友好的语气`;
          break;
      }

      const response = await fetch(buildApiUrl('/api/v1/ai/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error('AI响应失败');
      }

      const result = await response.json();
      if (result.content) {
        setAiSuggestion(result.content);
      }
    } catch (error) {
      console.error('Error in AI action:', error);
      Alert.alert('错误', 'AI处理失败，请重试');
    } finally {
      setAiSuggestionLoading(false);
    }
  };

  // 应用AI建议（续写或润色）
  const handleApplySuggestion = () => {
    if (aiActionType === 'continue') {
      // 续写：追加到内容后面
      setContent(prev => prev + (prev.endsWith(' ') ? '' : ' ') + aiSuggestion);
    } else if (aiActionType === 'polish') {
      // 润色：替换整个内容
      setContent(aiSuggestion);
    }
    setAiSuggestion('');
  };

  // 选择模板
  const handleSelectTemplate = (template: typeof TEMPLATES[0]) => {
    setSelectedTemplate(template.id);
    setContent(template.prompt);
    setShowTemplateModal(false);
  };

  // 选择图片
  const handlePickImage = async () => {
    console.log('[WriteDiary] Pick image clicked');
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限提示', '需要相册权限才能选择图片');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
        maxFileSize: 5 * 1024 * 1024, // 5MB
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map((asset, index) => ({
          uri: asset.uri,
          id: `img_${Date.now()}_${index}`,
        }));

        // 将图片占位符插入到内容中
        const newImageCount = newImages.length;
        const placeholders = newImages.map(img => `[图片:${img.id}]`).join(' ');

        // 添加图片到数组
        setImages([...images, ...newImages.map(img => img.uri)].slice(0, 9));

        // 在光标位置插入占位符（如果可能），否则追加到末尾
        setContent(prev => {
          const hasText = prev && prev.trim().length > 0;
          if (hasText) {
            return prev + '\n\n' + placeholders + '\n\n';
          } else {
            return placeholders + '\n\n';
          }
        });

        console.log('[WriteDiary] Images added:', newImageCount);
      }
    } catch (error) {
      console.error('[WriteDiary] Error picking image:', error);
    }
  };

  // 删除图片
  const handleRemoveImage = (index: number) => {
    console.log('[WriteDiary] Remove image at index:', index);
    setImages(images.filter((_, i) => i !== index));
  };

  // 获取位置
  const handleGetLocation = async () => {
    console.log('[WriteDiary] Get location clicked');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限提示', '需要位置权限才能记录位置');
        return;
      }

      const locationData = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: locationData.coords.latitude,
        longitude: locationData.coords.longitude,
      });
      console.log('[WriteDiary] Location obtained:', locationData.coords);
    } catch (error) {
      console.error('[WriteDiary] Error getting location:', error);
    }
  };

  // 添加标签
  const handleAddTag = () => {
    console.log('[WriteDiary] Add tag:', tagInput);
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  // 删除标签
  const handleRemoveTag = (tag: string) => {
    console.log('[WriteDiary] Remove tag:', tag);
    setTags(tags.filter((t) => t !== tag));
  };

  // 打开天气选择
  const handleOpenWeather = () => {
    setShowWeatherModal(true);
  };

  // 打开心情选择
  const handleOpenMood = () => {
    setShowMoodModal(true);
  };

  // 选择天气
  const handleSelectWeather = (weatherId: string) => {
    setSelectedWeather(weatherId);
    setShowWeatherModal(false);
  };

  // 选择心情
  const handleSelectMood = (moodId: string) => {
    setSelectedMood(moodId);
    setShowMoodModal(false);
  };

  // 提交日记
  const handleSubmit = async () => {
    console.log('[WriteDiary] Submit clicked, isEditMode:', isEditMode, 'editId:', editId);

    if (!content.trim()) {
      Alert.alert('提示', '请输入日记内容');
      return;
    }

    try {
      setSubmitting(true);

      const diaryData = {
        id: isEditMode && editId ? editId : `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: title.trim() || '无标题',
        content: content.trim(),
        mood: selectedMood,
        mood_intensity: selectedMood ? moodIntensity : null,
        weather: selectedWeather,
        tags: tags,
        images: images,
        location: location,
        template_id: selectedTemplate,
        created_at: diaryDate.toISOString(),
        updated_at: new Date().toISOString(),
        is_uploaded: false,
      };

      // 如果是编辑模式
      if (isEditMode && editId) {
        // 如果是云端日记
        if (!editId.startsWith('local_') && token) {
          /**
           * 服务端文件：server/main.py
           * 接口：PUT /api/v1/diaries/{diary_id}
           * Path 参数：diary_id: string
           * Body 参数：title, content, mood, mood_intensity, weather, tags, images, location, template_id
           * Headers: Authorization: Bearer {token}
           */
          const response = await fetch(buildApiUrl(`/api/v1/diaries/${editId}`), {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              title: diaryData.title,
              content: diaryData.content,
              mood: diaryData.mood,
              mood_intensity: diaryData.mood_intensity,
              weather: diaryData.weather,
              tags: diaryData.tags,
              images: diaryData.images,
              location: diaryData.location,
              template_id: diaryData.template_id,
              created_at: diaryData.created_at,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to update diary');
          }

          Alert.alert('成功', '日记已更新', [
            { text: '确定', onPress: () => router.back() },
          ]);
        } else {
          // 如果是本地日记，直接更新本地存储
          await saveDiaryLocally(diaryData);
          Alert.alert('成功', '日记已更新', [
            { text: '确定', onPress: () => router.back() },
          ]);
        }
      } else {
        // 新增模式
        // 先保存到本地
        await saveDiaryLocally(diaryData);

        // 如果是在线模式且有token，上传到云端
        if (!isOfflineMode && token) {
          try {
            /**
             * 服务端文件：server/main.py
             * 接口：POST /api/v1/diaries
             * Body 参数：title, content, mood, mood_intensity, weather, tags, images, location, template_id
             * Headers: Authorization: Bearer {token}
             */
            const response = await fetch(buildApiUrl('/api/v1/diaries'), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                title: diaryData.title,
                content: diaryData.content,
                mood: diaryData.mood,
                mood_intensity: diaryData.mood_intensity,
                weather: diaryData.weather,
                tags: diaryData.tags,
                images: diaryData.images,
                location: diaryData.location,
                template_id: diaryData.template_id,
              }),
            });

            if (!response.ok) {
              throw new Error('Failed to upload diary to cloud');
            }

            const data = await response.json();

            // 更新本地日记的ID和上传状态
            await markDiaryAsUploaded(diaryData.id);

            Alert.alert('成功', '日记已保存到云端', [
              { text: '确定', onPress: () => router.back() },
            ]);
          } catch (error) {
            console.error('Error uploading diary to cloud:', error);
            Alert.alert('部分成功', '日记已保存到本地，但上传云端失败', [
              { text: '确定', onPress: () => router.back() },
            ]);
          }
        } else {
          const message = isOfflineMode
            ? '日记已保存到本地（离线模式）'
            : '日记已保存到本地';

          Alert.alert('成功', message, [
            { text: '确定', onPress: () => router.back() },
          ]);
        }
      }
    } catch (error) {
      console.error('Error saving diary:', error);
      Alert.alert('错误', '保存失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingDiary) {
    return (
      <Screen safeAreaEdges={['left', 'right', 'top']}>
        <View style={[styles.container, { backgroundColor: background }]}>
          <View style={[styles.loadingContainer]}>
            <ActivityIndicator size="large" color={accent} />
            <Text style={[styles.loadingText, { color: muted }]}>加载中...</Text>
          </View>
        </View>
      </Screen>
    );
  }

  // 格式化日期显示
  const formatDate = () => {
    return diaryDate.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  // 格式化时间显示
  const formatTime = () => {
    return diaryDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  // 日期变化处理
  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDiaryDate(selectedDate);
    }
  };

  // 时间变化处理
  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedTime) {
      setDiaryDate(selectedTime);
    }
  };

  return (
    <Screen safeAreaEdges={['left', 'right', 'bottom']}>
      <View style={[styles.container, { backgroundColor: background }]}>
        {/* 顶部导航栏 */}
        <View style={[styles.header, { paddingTop: insets.top, borderBottomColor: border }]}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              if (content.trim() || images.length > 0) {
                setShowBackConfirmDialog(true);
              } else {
                router.back();
              }
            }}
            activeOpacity={0.6}
          >
            <FontAwesome6 name="xmark" size={24} color={foreground} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            {!isEditMode && (
              <TouchableOpacity
                style={[styles.headerTag, { backgroundColor: surface, borderColor: border }]}
                onPress={() => setShowTemplateModal(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.headerTagText, { color: muted }]}>
                  {selectedTemplate
                    ? TEMPLATES.find(t => t.id === selectedTemplate)?.title || '模板'
                    : '选择模板'}
                </Text>
                <FontAwesome6 name="chevron-down" size={12} color={muted} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: `${accent}15` }]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.6}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={accent} />
            ) : (
              <Text style={[styles.headerButtonText, { color: accent }]}>完成</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 日期显示 */}
          <View style={styles.metaSection}>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
              style={styles.dateTouchable}
            >
              <Text style={[styles.dateText, { color: muted }]}>
                {formatDate()}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowTimePicker(true)}
              activeOpacity={0.7}
              style={styles.dateTouchable}
            >
              <Text style={[styles.timeText, { color: muted }]}>
                {formatTime()}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 天气和天气显示 */}
          <View style={styles.metaSection}>
            <TouchableOpacity
              style={styles.metaItem}
              onPress={handleOpenWeather}
              activeOpacity={0.7}
            >
              <FontAwesome6
                name={selectedWeather ? (WEATHERS.find(w => w.id === selectedWeather)?.icon as any) : 'cloud-sun'}
                size={18}
                color={selectedWeather ? accent : muted}
              />
              <Text style={[styles.metaText, { color: selectedWeather ? foreground : muted }]}>
                {selectedWeather ? WEATHERS.find(w => w.id === selectedWeather)?.label : '天气'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.metaItem}
              onPress={handleOpenMood}
              activeOpacity={0.7}
            >
              <FontAwesome6
                name={selectedMood ? (MOODS.find(m => m.id === selectedMood)?.icon as any) : 'face-smile'}
                size={18}
                color={selectedMood ? accent : muted}
              />
              <Text style={[styles.metaText, { color: selectedMood ? foreground : muted }]}>
                {selectedMood ? MOODS.find(m => m.id === selectedMood)?.label : '心情'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 标题输入 */}
          <TextInput
            style={[styles.titleInput, { color: foreground }]}
            placeholder="标题"
            placeholderTextColor={muted}
            value={title}
            onChangeText={setTitle}
          />

          {/* 内容输入 */}
          <TextInput
            style={[styles.contentInput, { color: foreground }]}
            placeholder="开始写下你的想法..."
            placeholderTextColor={muted}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            autoFocus={!isEditMode}
          />

          {/* 图片显示 */}
          {images.length > 0 && (
            <View style={styles.imageSection}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {images.map((uri, index) => (
                  <View key={index} style={styles.imagePreview}>
                    <Image
                      source={{ uri }}
                      style={styles.previewImage}
                    />
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => handleRemoveImage(index)}
                    >
                      <FontAwesome6 name="xmark" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* 标签显示 */}
          {tags.length > 0 && (
            <View style={styles.tagSection}>
              {tags.map((tag) => (
                <View key={tag} style={[styles.tagBadge, { backgroundColor: `${accent}15` }]}>
                  <Text style={[styles.tagText, { color: accent }]}>#{tag}</Text>
                  <TouchableOpacity
                    style={styles.removeTagButton}
                    onPress={() => handleRemoveTag(tag)}
                    activeOpacity={0.7}
                  >
                    <FontAwesome6 name="xmark" size={12} color={accent} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* 位置信息 */}
          {location && typeof location.latitude === 'number' && typeof location.longitude === 'number' && (
            <View style={styles.locationSection}>
              <FontAwesome6 name="location-dot" size={14} color={muted} />
              <Text style={[styles.locationText, { color: muted }]}>
                {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
              </Text>
            </View>
          )}

          {/* AI建议显示（嵌入式，参考WPS） */}
          {(aiSuggestionLoading || aiSuggestion) && (
            <View style={[styles.aiSuggestionBox, { backgroundColor: `${accent}05`, borderColor: `${accent}20`, borderWidth: 1 }]}>
              <View style={styles.aiSuggestionHeader}>
                <FontAwesome6 name="robot" size={16} color={accent} />
                <Text style={[styles.aiSuggestionTitle, { color: accent }]}>
                  {aiActionType === 'continue' && 'AI续写建议'}
                  {aiActionType === 'inspiration' && '写作灵感'}
                  {aiActionType === 'polish' && '润色建议'}
                  {aiActionType === 'analyze' && '情绪分析'}
                </Text>
                <TouchableOpacity onPress={() => setAiSuggestion('')} activeOpacity={0.6}>
                  <FontAwesome6 name="xmark" size={16} color={muted} />
                </TouchableOpacity>
              </View>

              {aiSuggestionLoading && (
                <View style={styles.aiSuggestionLoading}>
                  <ActivityIndicator size="small" color={accent} />
                  <Text style={[styles.aiSuggestionLoadingText, { color: muted }]}>AI正在思考...</Text>
                </View>
              )}

              {!aiSuggestionLoading && aiSuggestion && (
                <>
                  <Text style={[styles.aiSuggestionText, { color: foreground }]}>{aiSuggestion}</Text>

                  {(aiActionType === 'continue' || aiActionType === 'polish') && (
                    <TouchableOpacity
                      style={[styles.aiSuggestionApplyBtn, { backgroundColor: accent }]}
                      onPress={handleApplySuggestion}
                      activeOpacity={0.7}
                    >
                      <FontAwesome6 name="check" size={16} color="#FFFFFF" />
                      <Text style={styles.aiSuggestionApplyBtnText}>
                        {aiActionType === 'continue' ? '接受续写' : '应用润色'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* 底部工具栏 */}
        <View style={[styles.toolbar, { backgroundColor: surface, borderTopColor: border, paddingTop: insets.bottom }]}>
          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={handleGetLocation}
            activeOpacity={0.7}
          >
            <FontAwesome6
              name={location ? 'location-dot' : 'location'}
              size={20}
              color={location ? accent : muted}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={handlePickImage}
            activeOpacity={0.7}
          >
            <FontAwesome6 name="image" size={20} color={accent} />
            {images.length > 0 && (
              <View style={[styles.badge, { backgroundColor: accent }]}>
                <Text style={styles.badgeText}>{images.length}</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={[styles.toolbarDivider, { backgroundColor: border }]} />

          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={() => handleAIAction('continue')}
            disabled={aiSuggestionLoading}
            activeOpacity={0.7}
          >
            <FontAwesome6 name="pen-fancy" size={20} color={accent} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={() => handleAIAction('inspiration')}
            disabled={aiSuggestionLoading}
            activeOpacity={0.7}
          >
            <FontAwesome6 name="lightbulb" size={20} color={accent} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={() => handleAIAction('polish')}
            disabled={aiSuggestionLoading}
            activeOpacity={0.7}
          >
            <FontAwesome6 name="wand-magic-sparkles" size={20} color={accent} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={() => handleAIAction('analyze')}
            disabled={aiSuggestionLoading}
            activeOpacity={0.7}
          >
            <FontAwesome6 name="heart-pulse" size={20} color={accent} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 模板选择弹窗 */}
      <Modal visible={showTemplateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: foreground }]}>选择模板</Text>
              <TouchableOpacity onPress={() => setShowTemplateModal(false)}>
                <FontAwesome6 name="xmark" size={24} color={foreground} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {TEMPLATES.map((template) => (
                <TouchableOpacity
                  key={template.id}
                  style={[
                    styles.templateItem,
                    {
                      backgroundColor: selectedTemplate === template.id ? `${accent}10` : 'transparent',
                      borderColor: selectedTemplate === template.id ? accent : border,
                      borderWidth: 1,
                    },
                  ]}
                  onPress={() => handleSelectTemplate(template)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.templateItemTitle, { color: foreground }]}>{template.title}</Text>
                  <Text style={[styles.templateItemPrompt, { color: muted }]}>{template.prompt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 天气选择弹窗 */}
      <Modal visible={showWeatherModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowWeatherModal(false)}
        >
          <View style={[styles.pickerModal, { backgroundColor: surface }]}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setShowWeatherModal(false)}>
                <Text style={[styles.pickerCancel, { color: muted }]}>取消</Text>
              </TouchableOpacity>
              <Text style={[styles.pickerTitle, { color: foreground }]}>选择天气</Text>
              <View style={{ width: 40 }} />
            </View>
            <View style={styles.weatherGrid}>
              {WEATHERS.map((weather) => (
                <TouchableOpacity
                  key={weather.id}
                  style={[
                    styles.weatherItem,
                    {
                      backgroundColor: selectedWeather === weather.id ? `${accent}15` : 'transparent',
                      borderColor: selectedWeather === weather.id ? accent : border,
                      borderWidth: selectedWeather === weather.id ? 1 : 0,
                    },
                  ]}
                  onPress={() => handleSelectWeather(weather.id)}
                  activeOpacity={0.7}
                >
                  <FontAwesome6 name={weather.icon as any} size={32} color={accent} />
                  <Text style={[styles.weatherLabel, { color: foreground }]}>{weather.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 心情选择弹窗 */}
      <Modal visible={showMoodModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMoodModal(false)}
        >
          <View style={[styles.pickerModal, { backgroundColor: surface }]}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setShowMoodModal(false)}>
                <Text style={[styles.pickerCancel, { color: muted }]}>取消</Text>
              </TouchableOpacity>
              <Text style={[styles.pickerTitle, { color: foreground }]}>选择心情</Text>
              <View style={{ width: 40 }} />
            </View>
            <View style={styles.moodGrid}>
              {MOODS.map((mood) => (
                <TouchableOpacity
                  key={mood.id}
                  style={[
                    styles.moodItem,
                    {
                      backgroundColor: selectedMood === mood.id ? mood.color : 'transparent',
                      borderColor: selectedMood === mood.id ? mood.color : border,
                      borderWidth: selectedMood === mood.id ? 2 : 0,
                    },
                  ]}
                  onPress={() => handleSelectMood(mood.id)}
                  activeOpacity={0.7}
                >
                  <FontAwesome6
                    name={mood.icon as any}
                    size={32}
                    color={selectedMood === mood.id ? '#FFFFFF' : mood.color}
                  />
                  <Text
                    style={[
                      styles.moodLabel,
                      { color: selectedMood === mood.id ? '#FFFFFF' : foreground },
                    ]}
                  >
                    {mood.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 返回确认对话框 */}
      <Modal
        visible={showBackConfirmDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBackConfirmDialog(false)}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
          activeOpacity={1}
          onPress={() => setShowBackConfirmDialog(false)}
        >
          <View style={[styles.confirmDialog, { backgroundColor: surface }]}>
            <FontAwesome6 name="triangle-exclamation" size={40} color={accent} />
            <Text style={[styles.confirmDialogTitle, { color: foreground }]}>确认离开</Text>
            <Text style={[styles.confirmDialogText, { color: muted }]}>
              您有未保存的内容，确定要离开吗？
            </Text>
            <View style={styles.confirmDialogButtons}>
              <TouchableOpacity
                style={[styles.confirmDialogButton, { backgroundColor: `${background}80` }]}
                onPress={() => {
                  setShowBackConfirmDialog(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.confirmDialogButtonText, { color: foreground }]}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmDialogButton, { backgroundColor: accent }]}
                onPress={() => {
                  setShowBackConfirmDialog(false);
                  router.back();
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.confirmDialogButtonText, { color: '#FFFFFF' }]}>确定离开</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

  // 日期选择器
  {Platform.OS === 'web' && showDatePicker && (
    <Modal visible={showDatePicker} transparent animationType="fade">
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowDatePicker(false)}
      >
        <View style={[styles.pickerModal, { backgroundColor: surface }]}>
          <View style={styles.pickerHeader}>
            <TouchableOpacity onPress={() => setShowDatePicker(false)}>
              <Text style={[styles.pickerCancel, { color: muted }]}>取消</Text>
            </TouchableOpacity>
            <Text style={[styles.pickerTitle, { color: foreground }]}>选择日期</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(false)}>
              <Text style={[styles.pickerConfirm, { color: accent }]}>确认</Text>
            </TouchableOpacity>
          </View>
          <input
            type="date"
            value={diaryDate.toISOString().split('T')[0]}
            onChange={(e) => {
              if (e.target.value) {
                const newDate = new Date(e.target.value);
                newDate.setHours(diaryDate.getHours(), diaryDate.getMinutes());
                setDiaryDate(newDate);
              }
            }}
            style={{
              padding: 16,
              fontSize: 16,
              borderWidth: 1,
              borderColor: border,
              borderRadius: 8,
            }}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  )}

  {Platform.OS !== 'web' && showDatePicker && (
    <DateTimePicker
      value={diaryDate}
      mode="date"
      display={Platform.OS === 'ios' ? 'compact' : 'default'}
      onChange={handleDateChange}
      locale="zh-CN"
    />
  )}

  {/* 时间选择器 */}
  {Platform.OS === 'web' && showTimePicker && (
    <Modal visible={showTimePicker} transparent animationType="fade">
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowTimePicker(false)}
      >
        <View style={[styles.pickerModal, { backgroundColor: surface }]}>
          <View style={styles.pickerHeader}>
            <TouchableOpacity onPress={() => setShowTimePicker(false)}>
              <Text style={[styles.pickerCancel, { color: muted }]}>取消</Text>
            </TouchableOpacity>
            <Text style={[styles.pickerTitle, { color: foreground }]}>选择时间</Text>
            <TouchableOpacity onPress={() => setShowTimePicker(false)}>
              <Text style={[styles.pickerConfirm, { color: accent }]}>确认</Text>
            </TouchableOpacity>
          </View>
          <input
            type="time"
            value={`${diaryDate.getHours().toString().padStart(2, '0')}:${diaryDate.getMinutes().toString().padStart(2, '0')}`}
            onChange={(e) => {
              if (e.target.value) {
                const [hours, minutes] = e.target.value.split(':').map(Number);
                const newDate = new Date(diaryDate);
                newDate.setHours(hours, minutes);
                setDiaryDate(newDate);
              }
            }}
            style={{
              padding: 16,
              fontSize: 16,
              borderWidth: 1,
              borderColor: border,
              borderRadius: 8,
            }}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  )}

  {Platform.OS !== 'web' && showTimePicker && (
    <DateTimePicker
      value={diaryDate}
      mode="time"
      display={Platform.OS === 'ios' ? 'compact' : 'default'}
      onChange={handleTimeChange}
      locale="zh-CN"
    />
  )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // 顶部导航栏
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 100,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  headerTagText: {
    fontSize: 14,
  },
  // 滚动视图
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  // 元信息区域
  metaSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 24,
  },
  dateTouchable: {
    paddingVertical: 4,
  },
  dateText: {
    fontSize: 14,
  },
  timeText: {
    fontSize: 14,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
  },
  // 标题输入
  titleInput: {
    fontSize: 28,
    fontWeight: '700',
    paddingVertical: 8,
    marginBottom: 8,
  },
  // 内容输入
  contentInput: {
    fontSize: 18,
    lineHeight: 28,
    minHeight: 400,
    paddingVertical: 8,
    textAlignVertical: 'top',
  },
  // 图片区域
  imageSection: {
    marginVertical: 16,
  },
  imagePreview: {
    marginRight: 12,
    position: 'relative',
  },
  previewImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 标签区域
  tagSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 12,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 14,
    marginRight: 4,
  },
  removeTagButton: {
    padding: 2,
  },
  // 位置信息
  locationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 8,
  },
  locationText: {
    fontSize: 13,
  },
  // AI建议框
  aiSuggestionBox: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  aiSuggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiSuggestionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  aiSuggestionLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  aiSuggestionLoadingText: {
    fontSize: 14,
    marginLeft: 8,
  },
  aiSuggestionText: {
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 12,
  },
  aiSuggestionApplyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  aiSuggestionApplyBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  // 底部工具栏
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  toolbarButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    position: 'relative',
  },
  toolbarDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
    marginHorizontal: 4,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // 加载中
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
  },
  // 弹窗通用
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  // 选择器弹窗
  pickerModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 20,
  },
  pickerCancel: {
    fontSize: 16,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  pickerConfirm: {
    fontSize: 16,
    fontWeight: '600',
  },
  // 模板项
  templateItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  templateItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  templateItemPrompt: {
    fontSize: 14,
  },
  // 天气网格
  weatherGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  weatherItem: {
    width: (width - 56) / 3,
    alignItems: 'center',
    paddingVertical: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  weatherLabel: {
    fontSize: 13,
    marginTop: 8,
  },
  // 心情网格
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  moodItem: {
    width: (width - 56) / 4,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  moodLabel: {
    fontSize: 12,
    marginTop: 6,
  },
  // 确认对话框
  confirmDialog: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    width: '85%',
    alignSelf: 'center',
  },
  confirmDialogTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  confirmDialogText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  confirmDialogButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  confirmDialogButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmDialogButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
