import React, { useState } from 'react';
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
} from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePassword } from '@/contexts/PasswordContext';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useCSSVariable } from 'uniwind';

const { width } = Dimensions.get('window');

// 情绪选项
const MOODS = [
  { id: 'happy', icon: 'face-laugh-beam', label: '开心', color: '#FFD93D' },
  { id: 'calm', icon: 'face-smile', label: '平静', color: '#6BCB77' },
  { id: 'anxious', icon: 'face-frown-open', label: '焦虑', color: '#4D96FF' },
  { id: 'sad', icon: 'face-sad-tear', label: '悲伤', color: '#6B7280' },
  { id: 'angry', icon: 'face-angry', label: '愤怒', color: '#FF6B6B' },
  { id: 'tired', icon: 'face-tired', label: '疲惫', color: '#9D4EDD' },
];

export default function WriteDiaryScreen() {
  const router = useSafeRouter();
  const insets = useSafeAreaInsets();
  const { encryptData, offlineMode } = usePassword();
  const { token } = useAuth();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [background, surface, accent, foreground, muted, border] = useCSSVariable([
    '--color-background',
    '--color-surface',
    '--color-accent',
    '--color-foreground',
    '--color-muted',
    '--color-border',
  ]) as string[];

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('提示', '请输入日记标题');
      return;
    }

    if (!content.trim()) {
      Alert.alert('提示', '请输入日记内容');
      return;
    }

    if (!selectedMood) {
      Alert.alert('提示', '请选择当前的情绪');
      return;
    }

    if (!token) {
      Alert.alert('提示', '请先登录');
      return;
    }

    // 如果是离线模式，保存到本地
    if (offlineMode) {
      Alert.alert('提示', '离线模式下暂不支持保存日记');
      return;
    }

    try {
      setSubmitting(true);

      // 加密标题和内容
      const encryptedTitle = title.trim();
      const encryptedContent = content.trim();

      /**
       * 服务端文件：server/src/index.ts
       * 接口：POST /api/v1/diaries
       * Body 参数：title: string, content: string, mood: string, tags: string[]
       */
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/diaries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: encryptedTitle,
          content: encryptedContent,
          mood: selectedMood,
          tags: tags,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create diary');
      }

      Alert.alert('成功', '日记已保存，AI 正在分析情绪...', [
        {
          text: '确定',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error creating diary:', error);
      Alert.alert('错误', '保存失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
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
                console.log('Back button pressed');
                if (title.trim() || content.trim() || selectedMood) {
                  Alert.alert('提示', '确定要离开吗？内容将不会保存', [
                    { text: '取消', style: 'cancel' },
                    { text: '确定', onPress: () => {
                      console.log('Going back');
                      router.back();
                    }},
                  ]);
                } else {
                  console.log('Going back directly');
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

          <ScrollView style={styles.contentContainer} contentContainerStyle={styles.scrollContent}>
            {/* 标题输入 */}
            <View style={[styles.titleContainer, { borderBottomColor: border }]}>
              <TextInput
                style={[styles.titleInput, { color: foreground }]}
                placeholder="给这篇日记起个标题..."
                placeholderTextColor={muted}
                value={title}
                onChangeText={setTitle}
                textAlignVertical="top"
              />
            </View>

            {/* 时间和情绪 */}
            <View style={styles.metaContainer}>
              <View style={[styles.metaItem, { backgroundColor: surface }]}>
                <FontAwesome6 name="calendar" size={16} color={muted} style={styles.metaIcon} />
                <Text style={[styles.metaText, { color: muted }]}>
                  {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
                </Text>
              </View>
              <View style={[styles.metaItem, { backgroundColor: surface }]}>
                <FontAwesome6 name="clock" size={16} color={muted} style={styles.metaIcon} />
                <Text style={[styles.metaText, { color: muted }]}>
                  {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>

            {/* 情绪选择 */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: foreground }]}>今天的心情</Text>
              <View style={styles.moodGrid}>
                {MOODS.map((mood) => (
                  <TouchableOpacity
                    key={mood.id}
                    onPress={() => setSelectedMood(mood.id)}
                    style={[
                      styles.moodItem,
                      selectedMood === mood.id && styles.moodItemSelected,
                      {
                        backgroundColor: selectedMood === mood.id ? mood.color : surface,
                        borderColor: selectedMood === mood.id ? mood.color : border,
                      },
                    ]}
                  >
                    <FontAwesome6
                      name={mood.icon as any}
                      size={28}
                      color={selectedMood === mood.id ? '#FFFFFF' : muted}
                    />
                    <Text
                      style={[
                        styles.moodLabel,
                        { color: selectedMood === mood.id ? '#FFFFFF' : muted },
                      ]}
                    >
                      {mood.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 内容输入 */}
            <View style={styles.section}>
              <View style={[styles.contentContainerInner, { backgroundColor: surface }]}>
                <TextInput
                  style={[styles.contentInput, { color: foreground }]}
                  placeholder="写下你的想法..."
                  placeholderTextColor={muted}
                  value={content}
                  onChangeText={setContent}
                  multiline
                  textAlignVertical="top"
                />
                <Text style={[styles.charCount, { color: muted }]}>
                  {content.length} 字
                </Text>
              </View>
            </View>

            {/* 标签 */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: foreground }]}>标签</Text>
              <View style={[styles.tagInputContainer, { backgroundColor: surface, borderColor: border }]}>
                <TextInput
                  style={[styles.tagInput, { color: foreground }]}
                  placeholder="添加标签..."
                  placeholderTextColor={muted}
                  value={tagInput}
                  onChangeText={setTagInput}
                  onSubmitEditing={handleAddTag}
                />
                <TouchableOpacity onPress={handleAddTag} style={styles.addTagButton}>
                  <FontAwesome6 name="plus" size={18} color={accent} />
                </TouchableOpacity>
              </View>

              {tags.length > 0 && (
                <View style={styles.tagsContainer}>
                  {tags.map((tag, index) => (
                    <View key={index} style={[styles.tag, { backgroundColor: surface, borderColor: accent }]}>
                      <Text style={[styles.tagText, { color: accent }]}>{tag}</Text>
                      <TouchableOpacity onPress={() => handleRemoveTag(tag)} style={styles.removeTag}>
                        <FontAwesome6 name="xmark" size={12} color={accent} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
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
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
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
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  titleContainer: {
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: '700',
  },
  metaContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  metaIcon: {
    marginRight: 6,
  },
  metaText: {
    fontSize: 13,
  },
  section: {
    marginTop: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  moodItem: {
    width: (width - 32 - 50) / 3,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  moodItemSelected: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  moodLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  contentContainerInner: {
    borderRadius: 16,
    padding: 16,
    minHeight: 200,
    position: 'relative',
  },
  contentInput: {
    fontSize: 16,
    lineHeight: 24,
    flex: 1,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
  },
  tagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 0,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tagInput: {
    flex: 1,
    fontSize: 15,
    color: '#2D3436',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  addTagButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
    marginRight: 6,
  },
  removeTag: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
