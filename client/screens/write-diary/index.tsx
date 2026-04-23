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

// AI消息类型
interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

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
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiMessages, setAIMessages] = useState<AIMessage[]>([]);
  const [aiInput, setAIInput] = useState('');
  const [aiLoading, setAILoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

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

  // 初始化时发送AI问候
  useEffect(() => {
    if (!isEditMode) {
      setAIMessages([
        {
          id: 'init',
          role: 'assistant',
          content: '你好！我是你的AI写作助手。在写日记的过程中，如果你有任何想法需要分享，或者希望我给你一些建议，随时都可以告诉我。我会一直陪伴着你。',
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }, [isEditMode]);

  // 发送消息给AI
  const handleSendAIMessage = async () => {
    if (!aiInput.trim() || aiLoading) return;

    const userMessage: AIMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: aiInput.trim(),
      timestamp: new Date().toISOString(),
    };

    setAIMessages(prev => [...prev, userMessage]);
    setAIInput('');
    setAILoading(true);

    try {
      const sseUrl = buildApiUrl('/api/v1/ai/chat');

      // 构建消息历史
      const messageHistory = aiMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // 使用 FormData 发送请求
      const formData = new FormData();
      formData.append('messages', JSON.stringify([
        ...messageHistory,
        { role: 'user', content: userMessage.content },
      ]));

      // 创建 SSE 连接
      const sse = new RNSSE(sseUrl, {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let aiResponse = '';

      sse.addEventListener('message', (event) => {
        if (event.data === '[DONE]') {
          sse.close();
          setAILoading(false);
          return;
        }

        try {
          const data = JSON.parse(event.data);
          if (data.content) {
            aiResponse += data.content;
            setAIMessages(prev => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];
              if (lastMessage && lastMessage.role === 'assistant' && lastMessage.id === 'ai_response') {
                lastMessage.content = aiResponse;
              } else {
                newMessages.push({
                  id: 'ai_response',
                  role: 'assistant',
                  content: aiResponse,
                  timestamp: new Date().toISOString(),
                });
              }
              return newMessages;
            });
          }
        } catch (e) {
          console.error('Error parsing SSE data:', e);
        }
      });

      sse.addEventListener('error', (error) => {
        console.error('SSE error:', error);
        sse.close();
        setAILoading(false);
        Alert.alert('错误', 'AI响应失败，请重试');
      });

    } catch (error) {
      console.error('Error sending AI message:', error);
      setAILoading(false);
      Alert.alert('错误', '发送消息失败，请重试');
    }
  };

  // 选择模板
  const handleSelectTemplate = (template: typeof TEMPLATES[0]) => {
    setSelectedTemplate(template.id);
    setContent(template.prompt);
    setShowTemplateModal(false);

    // 发送给AI，让AI了解用户选择了什么模板
    setAIMessages(prev => [...prev, {
      id: `system_${Date.now()}`,
      role: 'assistant',
      content: `我注意到你选择了"${template.title}"模板，这是一个很棒的选择！${template.prompt}`,
      timestamp: new Date().toISOString(),
    }]);
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
                  Alert.alert('提示', '确定要离开吗？内容将不会保存', [
                    { text: '取消', style: 'cancel' },
                    { text: '确定', onPress: () => router.back() },
                  ]);
                } else {
                  console.log('[WriteDiary] Going back');
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
              onPress={() => setShowAIChat(true)}
              activeOpacity={0.7}
            >
              <FontAwesome6 name="robot" size={20} color={accent} />
              <View style={styles.aiAssistantButtonContent}>
                <Text style={[styles.aiAssistantButtonText, { color: foreground }]}>AI写作助手</Text>
                <Text style={[styles.aiAssistantButtonSubtext, { color: muted }]}>陪伴你写日记，提供写作建议</Text>
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
            {location && (
              <View style={[styles.locationInfo, { backgroundColor: `${accent}10`, borderColor: `${accent}30`, borderWidth: 1 }]}>
                <FontAwesome6 name="location-dot" size={14} color={accent} />
                <Text style={[styles.locationText, { color: foreground }]}>
                  {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </Text>
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      {/* AI聊天弹窗 */}
      <Modal
        visible={showAIChat}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAIChat(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: `${background}90` }]}>
          <View style={[styles.aiChatModalContent, { backgroundColor: surface }]}>
            <View style={[styles.aiChatHeader, { borderBottomColor: border }]}>
              <TouchableOpacity
                style={styles.aiChatBackButton}
                onPress={() => setShowAIChat(false)}
                activeOpacity={0.6}
              >
                <FontAwesome6 name="xmark" size={24} color={foreground} />
              </TouchableOpacity>
              <Text style={[styles.aiChatTitle, { color: foreground }]}>AI写作助手</Text>
              <View style={{ width: 40 }} />
            </View>

            <View style={styles.aiChatMessages}>
              <FlatList
                ref={scrollViewRef}
                data={aiMessages}
                renderItem={renderAIMessage}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.aiChatMessagesContent}
                onContentSizeChange={() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }}
              />
              {aiLoading && (
                <View style={styles.aiLoadingContainer}>
                  <ActivityIndicator size="small" color={accent} />
                  <Text style={[styles.aiLoadingText, { color: muted }]}>AI正在思考...</Text>
                </View>
              )}
            </View>

            <View style={[styles.aiChatInputArea, { borderTopColor: border }]}>
              <TextInput
                style={[styles.aiChatInput, { color: foreground, backgroundColor: `${background}50`, borderColor: border }]}
                placeholder="和AI助手聊聊..."
                placeholderTextColor={muted}
                value={aiInput}
                onChangeText={setAIInput}
                multiline
              />
              <TouchableOpacity
                style={[styles.aiChatSendButton, { backgroundColor: accent }]}
                onPress={handleSendAIMessage}
                disabled={aiLoading || !aiInput.trim()}
                activeOpacity={0.7}
              >
                <FontAwesome6 name="paper-plane" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
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
    justifyContent: 'flex-end',
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
});
