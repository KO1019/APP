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
  FlatList,
} from 'react-native';
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
import RNSSE from 'react-native-sse';
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
  const [location, setLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showWeatherModal, setShowWeatherModal] = useState(false);
  const [showMoodIntensityModal, setShowMoodIntensityModal] = useState(false);

  // 编辑模式：是否正在编辑现有日记
  const [isEditMode, setIsEditMode] = useState(false);
  const [loadingDiary, setLoadingDiary] = useState(false);
  const [diary, setDiary] = useState<DiaryData | null>(null);

  // AI陪伴功能状态
  const [showAIPanel, setShowAIPanel] = useState(false); // AI伴写面板
  const [aiActionType, setAIActionType] = useState<'continue' | 'inspiration' | 'polish' | 'analyze'>('continue'); // AI操作类型
  const [aiLoading, setAILoading] = useState(false);
  const [aiResult, setAIResult] = useState(''); // AI生成的结果

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
  }, [editId, token]); // 移除 router 依赖，避免无限循环

  // 处理AI伴写功能
  const handleAIAction = async (action: AIActionType) => {
    if (aiLoading) return;

    setAIActionType(action);
    setAILoading(true);
    setAIResult('');

    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('错误', '请先登录');
        return;
      }

      // 根据不同操作类型构建不同的prompt
      let prompt = '';
      switch (action) {
        case 'continue':
          prompt = `请根据以下日记内容，帮我续写2-3句话，保持原有的写作风格和情绪：

${content || '(日记内容为空，请先开始写作)'}

要求：
1. 保持原有的写作风格和语气
2. 延续当前的情绪氛围
3. 每句话不要太长，简洁自然
4. 直接给出续写内容，不要添加其他解释`;
          break;
        case 'inspiration':
          prompt = `请根据以下日记内容，给我3-5个写作灵感和思路建议：

${content || '(日记内容为空，请先开始写作)'}

要求：
1. 从不同角度提供灵感（情感、事件、思考等）
2. 每个灵感都要具体可操作
3. 帮助用户深入思考和表达
4. 用列表形式呈现，每个灵感单独一行`;
          break;
        case 'polish':
          prompt = `请帮我对以下日记内容进行润色和优化，让表达更加流畅自然：

${content || '(日记内容为空，请先开始写作)'}

要求：
1. 保持原有的意思和情感
2. 优化语句表达，让文字更流畅
3. 适当调整结构，让逻辑更清晰
4. 只返回优化后的完整日记内容，不要添加其他说明`;
          break;
        case 'analyze':
          prompt = `请分析以下日记内容的情绪和特点：

${content || '(日记内容为空，请先开始写作)'}

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
          Authorization: `Bearer ${token}`,
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
        setAIResult(result.content);
      }
    } catch (error) {
      console.error('Error in AI action:', error);
      Alert.alert('错误', 'AI处理失败，请重试');
    } finally {
      setAILoading(false);
    }
  };

  // 应用AI结果（续写或润色）
  const handleApplyAIResult = () => {
    if (aiActionType === 'continue') {
      // 续写：追加到内容后面
      setContent(prev => prev + ' ' + aiResult);
    } else if (aiActionType === 'polish') {
      // 润色：替换整个内容
      setContent(aiResult);
    }
    setAIResult('');
    setShowAIPanel(false);
  };

  // 选择模板
  const handleSelectTemplate = (template: typeof TEMPLATES[0]) => {
    setSelectedTemplate(template.id);
    setContent(template.prompt);
    setShowTemplateModal(false);
  };
  // 触发HMR更新 - 修复编译问题

  // 旧的AI聊天功能（已废弃，保留函数避免编译错误）
  const handleSendAIMessage = async () => {
    // AI聊天功能已替换为AI伴写功能
    console.log('AI聊天功能已废弃');
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
        const newImages = result.assets.map(asset => asset.uri);
        setImages([...images, ...newImages].slice(0, 9)); // 最多9张
        console.log('[WriteDiary] Images added:', newImages.length);
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
        lat: locationData.coords.latitude,
        lng: locationData.coords.longitude,
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

  // 打开天气选择弹窗
  const handleOpenWeatherModal = () => {
    console.log('[WriteDiary] Open weather modal');
    setShowWeatherModal(true);
  };

  // 打开情绪强度弹窗
  const handleOpenMoodIntensityModal = () => {
    console.log('[WriteDiary] Open mood intensity modal');
    setShowMoodIntensityModal(true);
  };

  // 选择情绪
  const handleSelectMood = (moodId: string) => {
    console.log('[WriteDiary] Mood selected:', moodId);
    setSelectedMood(moodId);
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
        title: title.trim() || new Date().toLocaleDateString('zh-CN'),
        content: content.trim(),
        mood: selectedMood,
        mood_intensity: selectedMood ? moodIntensity : null,
        weather: selectedWeather,
        tags: tags,
        images: images,
        location: location,
        template_id: selectedTemplate,
        created_at: isEditMode && editId && !editId.startsWith('local_') && diary ? diary.created_at : new Date().toISOString(),
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

  // 渲染AI消息
  const renderAIMessage = ({ item }: { item: AIMessage }) => {
    const isUser = item.role === 'user';

    return (
      <View style={[
        styles.aiMessageBubble,
        isUser
          ? styles.aiMessageBubbleUser
          : { backgroundColor: surface, borderColor: border, borderWidth: 1 },
      ]}>
        <Text style={[
          styles.aiMessageText,
          { color: foreground },
        ]}>
          {item.content}
        </Text>
      </View>
    );
  };

  if (loadingDiary) {
    return (
      <Screen safeAreaEdges={['left', 'right', 'top']}>
        <View style={[styles.container, { backgroundColor: background }]}>
          <View style={[styles.header, { paddingTop: insets.top + 12, zIndex: 100 }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                console.log('[WriteDiary] Back button clicked (loading mode)');
                router.back();
              }}
              activeOpacity={0.6}
            >
              <FontAwesome6 name="arrow-left" size={24} color={foreground} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: foreground }]}>
              {isEditMode ? '编辑日记' : '写日记'}
            </Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={accent} />
            <Text style={[styles.loadingText, { color: muted }]}>加载中...</Text>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen safeAreaEdges={['left', 'right', 'bottom']}>
      <View style={[styles.container, { backgroundColor: background }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          style={styles.keyboardContainer}
        >
          <View style={[styles.header, { paddingTop: insets.top + 12, zIndex: 100 }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                console.log('[WriteDiary] Back button clicked, content:', content.trim(), 'images:', images.length);
                if (content.trim() || images.length > 0) {
                  console.log('[WriteDiary] Showing confirm dialog');
                  setShowBackConfirmDialog(true);
                } else {
                  console.log('[WriteDiary] Going back directly');
                  router.back();
                }
              }}
              activeOpacity={0.6}
            >
              <FontAwesome6 name="xmark" size={24} color={foreground} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: foreground }]}>
              {isEditMode ? '编辑日记' : '写日记'}
            </Text>
            <TouchableOpacity
              style={[styles.saveButton, submitting && styles.saveButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.6}
            >
              <Text style={[styles.saveButtonText, { color: submitting ? '#999' : accent }]}>
                {submitting ? '保存中...' : '保存'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            pointerEvents="box-none"
          >
            {/* AI陪伴按钮 */}
            <TouchableOpacity
              style={[styles.aiAssistantButton, { backgroundColor: `${accent}15`, borderColor: `${accent}40`, borderWidth: 1 }]}
              onPress={() => setShowAIPanel(true)}
              activeOpacity={0.7}
            >
              <FontAwesome6 name="robot" size={20} color={accent} />
              <View style={styles.aiAssistantButtonContent}>
                <Text style={[styles.aiAssistantButtonText, { color: foreground }]}>AI伴写</Text>
                <Text style={[styles.aiAssistantButtonSubtext, { color: muted }]}>智能续写·灵感提示·润色优化</Text>
              </View>
              <FontAwesome6 name="chevron-right" size={16} color={muted} />
            </TouchableOpacity>

            {/* 模板选择 */}
            {!isEditMode && (
              <TouchableOpacity
                style={[styles.templateSelector, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}
                onPress={() => setShowTemplateModal(true)}
                activeOpacity={0.7}
              >
                <FontAwesome6 name="file-lines" size={20} color={accent} />
                <Text style={[styles.templateSelectorText, { color: foreground }]}>
                  {selectedTemplate
                    ? TEMPLATES.find(t => t.id === selectedTemplate)?.title || '选择模板'
                    : '选择写作模板'}
                </Text>
                <FontAwesome6 name="chevron-right" size={16} color={muted} />
              </TouchableOpacity>
            )}

            {/* 天气选择 */}
            <TouchableOpacity
              style={[styles.toolBar, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}
              onPress={handleOpenWeatherModal}
              activeOpacity={0.7}
            >
              <FontAwesome6
                name={selectedWeather ? (WEATHERS.find(w => w.id === selectedWeather)?.icon as any) : 'cloud-sun'}
                size={20}
                color={accent}
              />
              <Text style={[styles.toolBarText, { color: foreground }]}>
                {selectedWeather ? WEATHERS.find(w => w.id === selectedWeather)?.label : '选择天气'}
              </Text>
              <FontAwesome6 name="chevron-right" size={16} color={muted} />
            </TouchableOpacity>

            {/* 位置和图片工具栏 */}
            <View style={[styles.toolBar, { backgroundColor: surface, borderColor: border, borderWidth: 1, paddingHorizontal: 12 }]}>
              <TouchableOpacity
                style={styles.toolButton}
                onPress={handleGetLocation}
                activeOpacity={0.7}
              >
                <FontAwesome6
                  name={location ? 'location-dot' : 'location'}
                  size={18}
                  color={location ? accent : muted}
                />
              </TouchableOpacity>

              <View style={[styles.toolDivider, { backgroundColor: border }]} />

              <TouchableOpacity
                style={styles.toolButton}
                onPress={handlePickImage}
                activeOpacity={0.7}
              >
                <FontAwesome6 name="image" size={18} color={accent} />
              </TouchableOpacity>

              <View style={[styles.toolDivider, { backgroundColor: border }]} />

              <TouchableOpacity
                style={styles.toolButton}
                onPress={handleOpenMoodIntensityModal}
                activeOpacity={0.7}
              >
                <FontAwesome6 name="sliders" size={18} color={selectedMood ? accent : muted} />
              </TouchableOpacity>

              <Text style={[styles.toolButtonLabel, { color: muted }]}>
                {images.length > 0 ? `${images.length} 张图片` : ''}
              </Text>
            </View>

            {/* 图片预览 */}
            {images.length > 0 && (
              <View style={styles.imagePreviewContainer}>
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

            {/* 标题输入（可选） */}
            <TextInput
              style={[styles.titleInput, { color: foreground, borderColor: border }]}
              placeholder="添加标题（可选）"
              placeholderTextColor={muted}
              value={title}
              onChangeText={setTitle}
            />

            {/* 内容输入 */}
            <TextInput
              style={[styles.contentInput, { color: foreground }]}
              placeholder="写下你的想法..."
              placeholderTextColor={muted}
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
            />

            {/* 情绪选择 */}
            <View style={styles.moodSection}>
              <Text style={[styles.sectionLabel, { color: muted }]}>当前心情</Text>
              <View style={styles.moodContainer}>
                {MOODS.map((mood) => (
                  <TouchableOpacity
                    key={mood.id}
                    style={[
                      styles.moodButton,
                      {
                        backgroundColor: selectedMood === mood.id ? mood.color : surface,
                        borderColor: selectedMood === mood.id ? mood.color : border,
                        borderWidth: selectedMood === mood.id ? 2 : 1,
                      },
                    ]}
                    onPress={() => handleSelectMood(mood.id)}
                    activeOpacity={0.7}
                  >
                    <FontAwesome6
                      name={mood.icon as any}
                      size={24}
                      color={selectedMood === mood.id ? '#FFFFFF' : mood.color}
                    />
                    <Text
                      style={[
                        styles.moodLabel,
                        { color: selectedMood === mood.id ? '#FFFFFF' : mood.color },
                      ]}
                    >
                      {mood.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 标签输入 */}
            <View style={[styles.tagSection, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}>
              <Text style={[styles.sectionLabel, { color: muted }]}>添加标签</Text>
              <View style={styles.tagList}>
                {tags.map((tag) => (
                  <View key={tag} style={[styles.tagBadge, { backgroundColor: `${accent}20` }]}>
                    <Text style={[styles.tagText, { color: accent }]}>{tag}</Text>
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
              <View style={styles.tagInputRow}>
                <TextInput
                  style={[styles.tagInput, { color: foreground }]}
                  placeholder="输入标签..."
                  placeholderTextColor={muted}
                  value={tagInput}
                  onChangeText={setTagInput}
                  onSubmitEditing={handleAddTag}
                />
                <TouchableOpacity
                  style={[styles.addTagBtn, { backgroundColor: accent }]}
                  onPress={handleAddTag}
                  activeOpacity={0.7}
                >
                  <FontAwesome6 name="plus" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* 位置信息 */}
            {location && location.latitude && location.longitude && (
              <View style={[styles.locationInfo, { backgroundColor: `${accent}10`, borderColor: `${accent}30`, borderWidth: 1 }]}>
                <FontAwesome6 name="location-dot" size={14} color={accent} />
                <Text style={[styles.locationText, { color: foreground }]}>
                  {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                </Text>
              </View>
            )}
            {/* 触发HMR更新 - 修复.toFixed错误 */}

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      {/* AI伴写面板 */}
      <Modal
        visible={showAIPanel}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAIPanel(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: `${background}90` }]}>
          <View style={[styles.aiModalContent, { backgroundColor: surface }]}>
            {/* 头部 */}
            <View style={[styles.aiModalHeader, { borderBottomColor: `${accent}20` }]}>
              <TouchableOpacity
                style={styles.aiModalCloseBtn}
                onPress={() => setShowAIPanel(false)}
                activeOpacity={0.6}
              >
                <FontAwesome6 name="xmark" size={24} color={foreground} />
              </TouchableOpacity>
              <Text style={[styles.aiModalTitle, { color: foreground }]}>AI伴写助手</Text>
              <View style={{ width: 40 }} />
            </View>

            {/* 操作按钮 */}
            <ScrollView style={styles.aiModalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.aiActionsGrid}>
                {/* 续写 */}
                <TouchableOpacity
                  style={[styles.aiActionButton, { backgroundColor: `${accent}10`, borderColor: `${accent}30` }]}
                  onPress={() => handleAIAction('continue')}
                  disabled={aiLoading}
                  activeOpacity={0.7}
                >
                  <View style={[styles.aiActionIcon, { backgroundColor: `${accent}20` }]}>
                    <FontAwesome6 name="pen-fancy" size={24} color={accent} />
                  </View>
                  <Text style={[styles.aiActionTitle, { color: foreground }]}>智能续写</Text>
                  <Text style={[styles.aiActionDesc, { color: muted }]}>自动续写2-3句话</Text>
                  <Text style={[styles.aiActionHint, { color: `${accent}70` }]}>基于当前内容</Text>
                </TouchableOpacity>

                {/* 灵感 */}
                <TouchableOpacity
                  style={[styles.aiActionButton, { backgroundColor: `${accent}10`, borderColor: `${accent}30` }]}
                  onPress={() => handleAIAction('inspiration')}
                  disabled={aiLoading}
                  activeOpacity={0.7}
                >
                  <View style={[styles.aiActionIcon, { backgroundColor: `${accent}20` }]}>
                    <FontAwesome6 name="lightbulb" size={24} color={accent} />
                  </View>
                  <Text style={[styles.aiActionTitle, { color: foreground }]}>写作灵感</Text>
                  <Text style={[styles.aiActionDesc, { color: muted }]}>获取3-5个思路</Text>
                  <Text style={[styles.aiActionHint, { color: `${accent}70` }]}>突破创作瓶颈</Text>
                </TouchableOpacity>

                {/* 润色 */}
                <TouchableOpacity
                  style={[styles.aiActionButton, { backgroundColor: `${accent}10`, borderColor: `${accent}30` }]}
                  onPress={() => handleAIAction('polish')}
                  disabled={aiLoading}
                  activeOpacity={0.7}
                >
                  <View style={[styles.aiActionIcon, { backgroundColor: `${accent}20` }]}>
                    <FontAwesome6 name="wand-magic-sparkles" size={24} color={accent} />
                  </View>
                  <Text style={[styles.aiActionTitle, { color: foreground }]}>智能润色</Text>
                  <Text style={[styles.aiActionDesc, { color: muted }]}>优化表达流畅度</Text>
                  <Text style={[styles.aiActionHint, { color: `${accent}70` }]}>保持原意不变</Text>
                </TouchableOpacity>

                {/* 分析 */}
                <TouchableOpacity
                  style={[styles.aiActionButton, { backgroundColor: `${accent}10`, borderColor: `${accent}30` }]}
                  onPress={() => handleAIAction('analyze')}
                  disabled={aiLoading}
                  activeOpacity={0.7}
                >
                  <View style={[styles.aiActionIcon, { backgroundColor: `${accent}20` }]}>
                    <FontAwesome6 name="heart-pulse" size={24} color={accent} />
                  </View>
                  <Text style={[styles.aiActionTitle, { color: foreground }]}>情绪分析</Text>
                  <Text style={[styles.aiActionDesc, { color: muted }]}>识别日记情绪</Text>
                  <Text style={[styles.aiActionHint, { color: `${accent}70` }]}>获取反馈建议</Text>
                </TouchableOpacity>
              </View>

              {/* AI结果展示 */}
              {aiLoading && (
                <View style={styles.aiLoadingBox}>
                  <ActivityIndicator size="small" color={accent} />
                  <Text style={[styles.aiLoadingText, { color: muted }]}>AI正在思考...</Text>
                </View>
              )}

              {aiResult && !aiLoading && (
                <View style={styles.aiResultBox}>
                  <Text style={[styles.aiResultLabel, { color: foreground }]}>AI建议：</Text>
                  <Text style={[styles.aiResultText, { color: foreground }]}>{aiResult}</Text>

                  {(aiActionType === 'continue' || aiActionType === 'polish') && (
                    <TouchableOpacity
                      style={[styles.aiApplyButton, { backgroundColor: accent }]}
                      onPress={handleApplyAIResult}
                      activeOpacity={0.7}
                    >
                      <FontAwesome6 name="check" size={16} color="#FFFFFF" />
                      <Text style={styles.aiApplyButtonText}>
                        {aiActionType === 'continue' ? '应用续写' : '应用润色'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 模板选择弹窗 */}
      <Modal visible={showTemplateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: foreground }]}>选择写作模板</Text>
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
      <Modal visible={showWeatherModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: foreground }]}>选择天气</Text>
              <TouchableOpacity onPress={() => setShowWeatherModal(false)}>
                <FontAwesome6 name="xmark" size={24} color={foreground} />
              </TouchableOpacity>
            </View>
            <View style={styles.weatherGrid}>
              {WEATHERS.map((weather) => (
                <TouchableOpacity
                  key={weather.id}
                  style={[
                    styles.weatherItem,
                    {
                      backgroundColor: selectedWeather === weather.id ? `${accent}20` : `${background}50`,
                      borderColor: selectedWeather === weather.id ? accent : border,
                      borderWidth: 1,
                    },
                  ]}
                  onPress={() => {
                    setSelectedWeather(weather.id);
                    setShowWeatherModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <FontAwesome6 name={weather.icon as any} size={32} color={accent} />
                  <Text style={[styles.weatherLabel, { color: foreground }]}>{weather.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* 情绪强度弹窗 */}
      <Modal visible={showMoodIntensityModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: foreground }]}>心情强度</Text>
              <TouchableOpacity onPress={() => setShowMoodIntensityModal(false)}>
                <FontAwesome6 name="xmark" size={24} color={foreground} />
              </TouchableOpacity>
            </View>
            <View style={styles.intensityContainer}>
              <Text style={[styles.intensityValue, { color: accent }]}>{moodIntensity}</Text>
              <Slider
                style={styles.intensitySlider}
                minimumValue={0}
                maximumValue={100}
                step={1}
                value={moodIntensity}
                onValueChange={setMoodIntensity}
                minimumTrackTintColor={accent}
                maximumTrackTintColor={border}
                thumbTintColor={accent}
              />
              <View style={styles.intensityLabels}>
                <Text style={[styles.intensityLabel, { color: muted }]}>微弱</Text>
                <Text style={[styles.intensityLabel, { color: muted }]}>强烈</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.intensityConfirmBtn, { backgroundColor: accent }]}
              onPress={() => setShowMoodIntensityModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.intensityConfirmText}>确认</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 返回确认对话框 */}
      <Modal
        visible={showBackConfirmDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBackConfirmDialog(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
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
                  console.log('[WriteDiary] Cancel back');
                  setShowBackConfirmDialog(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.confirmDialogButtonText, { color: foreground }]}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmDialogButton, { backgroundColor: accent }]}
                onPress={() => {
                  console.log('[WriteDiary] Confirm back');
                  setShowBackConfirmDialog(false);
                  router.back();
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.confirmDialogButtonText, { color: '#FFFFFF' }]}>确定离开</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    backgroundColor: 'transparent',
    elevation: 1, // Android 阴影
    zIndex: 100, // 确保在其他元素上方
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 101,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  aiAssistantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  aiAssistantButtonContent: {
    flex: 1,
    marginLeft: 12,
  },
  aiAssistantButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
  aiAssistantButtonSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  templateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  templateSelectorText: {
    fontSize: 15,
    fontWeight: '500',
  },
  toolBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  toolBarText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
  },
  toolButton: {
    padding: 8,
  },
  toolDivider: {
    width: 1,
    height: 20,
  },
  toolButtonLabel: {
    fontSize: 12,
    marginLeft: 8,
  },
  imagePreviewContainer: {
    marginBottom: 12,
  },
  imagePreview: {
    marginRight: 8,
    position: 'relative',
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  titleInput: {
    fontSize: 18,
    fontWeight: '600',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  contentInput: {
    fontSize: 16,
    minHeight: 200,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  moodSection: {
    marginBottom: 16,
  },
  moodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  moodButton: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    minWidth: 70,
  },
  moodLabel: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  tagSection: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 13,
    marginRight: 6,
  },
  removeTagButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagInput: {
    flex: 1,
    fontSize: 14,
    padding: 10,
    borderRadius: 8,
    marginRight: 8,
  },
  addTagBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 13,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  templateItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  templateItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  templateItemPrompt: {
    fontSize: 14,
  },
  weatherGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  weatherItem: {
    width: (width - 40 - 24) / 3,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  weatherLabel: {
    fontSize: 13,
    marginTop: 8,
  },
  intensityContainer: {
    paddingVertical: 20,
  },
  intensityValue: {
    fontSize: 48,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  intensitySlider: {
    width: '100%',
    height: 40,
  },
  intensityLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  intensityLabel: {
    fontSize: 13,
  },
  intensityConfirmBtn: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  intensityConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  aiChatModalContent: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  aiChatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  aiChatBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiChatTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  aiChatMessages: {
    flex: 1,
  },
  aiChatMessagesContent: {
    padding: 16,
  },
  aiMessageBubble: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  aiMessageBubbleUser: {
    backgroundColor: '#007AFF',
    marginLeft: 40,
  },
  aiMessageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  aiLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginTop: 8,
  },
  aiLoadingText: {
    fontSize: 14,
    marginLeft: 8,
  },
  aiChatInputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
  },
  aiChatInput: {
    flex: 1,
    fontSize: 15,
    padding: 12,
    borderRadius: 20,
    maxHeight: 100,
    marginRight: 12,
    borderWidth: 1,
  },
  aiChatSendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmDialog: {
    backgroundColor: '#FFFFFF',
    width: width * 0.85,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  confirmDialogTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  confirmDialogText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  confirmDialogButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  confirmDialogButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmDialogButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // AI伴写面板样式
  aiModalContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  aiModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  aiModalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiModalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  aiModalBody: {
    flex: 1,
    padding: 20,
  },
  aiActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  aiActionButton: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 8,
  },
  aiActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiActionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  aiActionDesc: {
    fontSize: 13,
    marginBottom: 2,
  },
  aiActionHint: {
    fontSize: 11,
  },
  aiLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 20,
    backgroundColor: 'rgba(234, 88, 12, 0.05)',
    borderRadius: 12,
  },
  aiLoadingText: {
    fontSize: 14,
  },
  aiResultBox: {
    padding: 16,
    backgroundColor: 'rgba(234, 88, 12, 0.05)',
    borderRadius: 12,
    gap: 12,
  },
  aiResultLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  aiResultText: {
    fontSize: 15,
    lineHeight: 22,
  },
  aiApplyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    alignSelf: 'flex-start',
  },
  aiApplyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
