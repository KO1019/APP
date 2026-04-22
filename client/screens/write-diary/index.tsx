import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePassword } from '@/contexts/PasswordContext';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { saveDiaryLocally, markDiaryAsUploaded } from '@/utils/localStorage';
import { buildApiUrl } from '@/utils';
import { FontAwesome6 } from '@expo/vector-icons';
import { useCSSVariable } from 'uniwind';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

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

export default function WriteDiaryScreen() {
  const router = useSafeRouter();
  const insets = useSafeAreaInsets();
  const { encryptData } = usePassword();
  const { token, isOfflineMode, user } = useAuth();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [moodIntensity, setMoodIntensity] = useState(50);
  const [selectedWeather, setSelectedWeather] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 新增功能
  const [images, setImages] = useState<string[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showWeatherModal, setShowWeatherModal] = useState(false);
  const [showMoodIntensityModal, setShowMoodIntensityModal] = useState(false);

  const [background, surface, accent, foreground, muted, border] = useCSSVariable([
    '--color-background',
    '--color-surface',
    '--color-accent',
    '--color-foreground',
    '--color-muted',
    '--color-border',
  ]) as string[];

  // 选择模板
  const handleSelectTemplate = (template: typeof TEMPLATES[0]) => {
    setSelectedTemplate(template.id);
    setContent(template.prompt);
    setShowTemplateModal(false);
  };

  // 选择图片
  const handlePickImage = async () => {
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
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  // 删除图片
  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  // 获取位置
  const handleGetLocation = async () => {
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
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  // 添加标签
  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  // 删除标签
  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  // 提交日记
  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('提示', '请输入日记内容');
      return;
    }

    if (!token) {
      Alert.alert('提示', '请先登录');
      return;
    }

    try {
      setSubmitting(true);

      // 创建日记数据
      const diaryData = {
        id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: title.trim() || new Date().toLocaleDateString('zh-CN'),
        content: content.trim(),
        mood: selectedMood,
        mood_intensity: selectedMood ? moodIntensity : null,
        weather: selectedWeather,
        tags: tags,
        images: images,
        location: location,
        template_id: selectedTemplate,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_uploaded: false,
      };

      // 先保存到本地
      await saveDiaryLocally(diaryData);

      // 如果是在线模式且用户开启了云端同步，上传到云端
      if (!isOfflineMode && user?.cloud_sync_enabled) {
        try {
          /**
           * 服务端文件：server/main.py
           * 接口：POST /api/v1/diaries
           * Body 参数：title, content, mood, mood_intensity, weather, tags, images, location, template_id
           */
          const response = await fetch(buildApiUrl('/api/v1/diaries'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
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
          : '日记已保存到本地（云端同步已关闭）';

        Alert.alert('成功', message, [
          { text: '确定', onPress: () => router.back() },
        ]);
      }
    } catch (error) {
      console.error('Error creating diary:', error);
      Alert.alert('错误', '保存失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen safeAreaEdges={['left', 'right', 'bottom']}>
      <View style={[styles.container, { backgroundColor: background }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                if (content.trim() || images.length > 0) {
                  Alert.alert('提示', '确定要离开吗？内容将不会保存', [
                    { text: '取消', style: 'cancel' },
                    { text: '确定', onPress: () => router.back() },
                  ]);
                } else {
                  router.back();
                }
              }}
              activeOpacity={0.6}
            >
              <FontAwesome6 name="xmark" size={24} color={foreground} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: foreground }]}>写日记</Text>
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

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* 模板选择 */}
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

            {/* 天气选择 */}
            <TouchableOpacity
              style={[styles.toolBar, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}
              onPress={() => setShowWeatherModal(true)}
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
                onPress={() => setShowMoodIntensityModal(true)}
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
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
                    onPress={() => setSelectedMood(mood.id)}
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
              </ScrollView>
            </View>

            {/* 标签输入 */}
            <View style={[styles.tagSection, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}>
              <Text style={[styles.sectionLabel, { color: muted }]}>添加标签</Text>
              <View style={styles.tagList}>
                {tags.map((tag) => (
                  <View key={tag} style={[styles.tagBadge, { backgroundColor: `${accent}20` }]}>
                    <Text style={[styles.tagText, { color: accent }]}>{tag}</Text>
                    <TouchableOpacity onPress={() => handleRemoveTag(tag)}>
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
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
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
    marginBottom: 20,
  },
  moodSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  moodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
  },
  moodLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  tagSection: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    gap: 8,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  tagText: {
    fontSize: 13,
  },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tagInput: {
    flex: 1,
    fontSize: 14,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  addTagBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  locationText: {
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
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
    marginBottom: 8,
  },
  templateItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  templateItemPrompt: {
    fontSize: 14,
  },
  weatherGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  weatherItem: {
    width: (width - 64) / 3,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  weatherLabel: {
    fontSize: 12,
    marginTop: 8,
  },
  intensityContainer: {
    padding: 20,
  },
  intensityValue: {
    fontSize: 48,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  intensitySlider: {
    width: '100%',
    height: 40,
    marginBottom: 12,
  },
  intensityLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  intensityLabel: {
    fontSize: 13,
  },
  intensityConfirmBtn: {
    margin: 16,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  intensityConfirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
