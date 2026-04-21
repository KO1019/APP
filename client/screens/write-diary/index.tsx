import React, { useState, useRef } from 'react';
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
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { usePassword } from '@/contexts/PasswordContext';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

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

// 引导问题
const GUIDING_QUESTIONS = [
  '今天最值得记录的一件事是什么？',
  '此时此刻你最大的感受是什么？',
  '今天有什么让你感到意外或惊喜的事情吗？',
  '如果你今天可以改变一件事，会是什么？',
  '今天学到了什么新东西？',
  '今天谁让你感到温暖？',
];

export default function WriteDiaryScreen() {
  const router = useSafeRouter();
  const { encryptData, offlineMode } = usePassword();
  const { token } = useAuth();

  const [content, setContent] = useState('');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(GUIDING_QUESTIONS[0]);
  const [submitting, setSubmitting] = useState(false);

  // 语音相关状态
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  // 动画
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const getThemeColors = () => ({
    background: '#F0F0F3',
    surface: '#F0F0F3',
    accent: '#6C63FF',
    foreground: '#2D3436',
    muted: '#636E72',
    border: '#E8E8EB',
    shadowDark: '#D1D9E6',
    shadowLight: '#FFFFFF',
  });

  const colors = getThemeColors();

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('提示', '需要麦克风权限才能使用语音输入');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      recordingRef.current = recording;
      setIsRecording(true);

      // 开始脉冲动画
      pulseAnimation();
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('错误', '无法启动录音');
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();

      if (uri) {
        // 读取音频文件
        const audioData = await (FileSystem as any).readAsStringAsync(uri, {
          encoding: (FileSystem as any).EncodingType.Base64,
        });

        // 这里应该调用语音识别API将音频转换为文本
        // 暂时使用模拟文本
        const transcribedText = '[语音识别功能正在开发中]\n' + content;
        setContent(transcribedText);
      }

      setRecording(null);
      recordingRef.current = null;
      setIsRecording(false);

      // 停止动画
      pulseAnim.setValue(1);
    } catch (err) {
      console.error('Failed to stop recording', err);
      Alert.alert('错误', '录音处理失败');
    }
  };

  const pulseAnimation = () => {
    if (!isRecording) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const toggleRecording = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
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

  const handleSubmit = async () => {
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

      // 加密日记内容
      const encryptedContent = encryptData(content.trim());

      /**
       * 服务端文件：server/src/index.ts
       * 接口：POST /api/v1/diaries
       * Body 参数：content: string, mood: string, tags: string[]
       */
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/diaries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
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

  const refreshQuestion = () => {
    const randomIndex = Math.floor(Math.random() * GUIDING_QUESTIONS.length);
    setCurrentQuestion(GUIDING_QUESTIONS[randomIndex]);
  };

  return (
    <Screen>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                if (content.trim() || selectedMood) {
                  Alert.alert('提示', '确定要离开吗？内容将不会保存', [
                    { text: '取消', style: 'cancel' },
                    { text: '确定', onPress: () => router.back() },
                  ]);
                } else {
                  router.back();
                }
              }}
            >
              <FontAwesome6 name="xmark" size={24} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.foreground }]}>写日记</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.contentContainer} contentContainerStyle={styles.scrollContent}>
            {/* 引导问题卡片 */}
            <View style={styles.shadowDark}>
              <View style={styles.shadowLight}>
                <View style={styles.questionHeader}>
                  <View style={[styles.iconContainer, { backgroundColor: 'rgba(108,99,255,0.12)' }]}>
                    <FontAwesome6 name="lightbulb" size={20} color="#6C63FF" />
                  </View>
                  <TouchableOpacity onPress={refreshQuestion}>
                    <FontAwesome6 name="rotate" size={16} color="#6C63FF" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.questionText}>{currentQuestion}</Text>
              </View>
            </View>

            {/* 情绪选择 */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>今天的心情</Text>
            </View>

            <View style={styles.moodGrid}>
              {MOODS.map((mood) => (
                <TouchableOpacity
                  key={mood.id}
                  onPress={() => setSelectedMood(mood.id)}
                  style={[
                    styles.moodItem,
                    selectedMood === mood.id && styles.moodItemSelected,
                    { backgroundColor: selectedMood === mood.id ? mood.color : '#F0F0F3' },
                  ]}
                >
                  <FontAwesome6 name={mood.icon as any} size={28} color={selectedMood === mood.id ? '#FFFFFF' : '#636E72'} />
                  <Text
                    style={[
                      styles.moodLabel,
                      { color: selectedMood === mood.id ? '#FFFFFF' : colors.muted },
                    ]}
                  >
                    {mood.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 标签输入 */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>标签</Text>
            </View>

            <View style={[styles.shadowDark, { marginBottom: 8 }]}>
              <View style={[styles.shadowLight, styles.tagInputContainer]}>
                <TextInput
                  style={[styles.tagInput, { color: colors.foreground }]}
                  placeholder="添加标签..."
                  placeholderTextColor="#B2BEC3"
                  value={tagInput}
                  onChangeText={setTagInput}
                  onSubmitEditing={handleAddTag}
                />
                <TouchableOpacity onPress={handleAddTag} style={styles.addTagButton}>
                  <FontAwesome6 name="plus" size={18} color="#6C63FF" />
                </TouchableOpacity>
              </View>
            </View>

            {tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                    <TouchableOpacity onPress={() => handleRemoveTag(tag)} style={styles.removeTag}>
                      <FontAwesome6 name="xmark" size={12} color="#6C63FF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* 日记内容输入 */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>写下你的想法</Text>
              <Text style={[styles.charCount, { color: colors.muted }]}>{content.length} 字</Text>
            </View>

            <View style={[styles.shadowDark]}>
              <View style={[styles.shadowLight, styles.textareaContainer]}>
                <TextInput
                  style={[styles.textarea, { color: colors.foreground }]}
                  placeholder="开始写吧..."
                  placeholderTextColor="#B2BEC3"
                  value={content}
                  onChangeText={setContent}
                  multiline
                  textAlignVertical="top"
                  autoFocus
                />

                {/* 语音输入按钮 */}
                <TouchableOpacity
                  onPress={toggleRecording}
                  style={styles.voiceButton}
                  activeOpacity={0.8}
                >
                  <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <FontAwesome6
                      name={isRecording ? 'microphone-lines' : 'microphone'}
                      size={22}
                      color={isRecording ? '#FF6B6B' : '#6C63FF'}
                    />
                  </Animated.View>
                </TouchableOpacity>

                {isRecording && (
                  <View style={styles.recordingIndicator}>
                    <FontAwesome6 name="circle" size={8} color="#FF6B6B" />
                    <Text style={styles.recordingText}>录音中...</Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          {/* 底部保存按钮 */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
              style={{ opacity: submitting ? 0.6 : 1 }}
            >
              <LinearGradient
                colors={['#6C63FF', '#896BFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitButton}
              >
                {submitting ? (
                  <Text style={styles.submitButtonText}>保存中...</Text>
                ) : (
                  <>
                    <FontAwesome6 name="paper-plane" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.submitButtonText}>保存日记</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  backButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2D3436',
  },
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 140,
  },

  // 双层阴影样式
  shadowDark: {
    shadowColor: '#D1D9E6',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    borderRadius: 24,
    marginBottom: 16,
    ...Platform.select({
      android: {
        elevation: 6,
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.5)',
      },
    }),
  },
  shadowLight: {
    shadowColor: '#FFFFFF',
    shadowOffset: { width: -6, height: -6 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    backgroundColor: '#F0F0F3',
    borderRadius: 24,
    padding: 20,
    ...Platform.select({
      android: {
        elevation: 6,
      },
    }),
  },

  // 引导问题
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#2D3436',
    fontWeight: '500',
  },

  // 区块标题
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3436',
  },
  charCount: {
    fontSize: 13,
    color: '#636E72',
  },

  // 情绪选择网格
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  moodItem: {
    width: (width - 48 - 24) / 3,
    marginHorizontal: 6,
    marginBottom: 12,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  moodItemSelected: {
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  moodLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#636E72',
    marginTop: 6,
  },

  // 标签
  tagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 0,
  },
  tagInput: {
    flex: 1,
    fontSize: 15,
    color: '#2D3436',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  addTagButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(108,99,255,0.10)',
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6C63FF',
    marginRight: 6,
  },
  removeTag: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 文本输入框
  textareaContainer: {
    minHeight: 200,
    padding: 0,
    position: 'relative',
  },
  textarea: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: '#2D3436',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 60,
  },
  voiceButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingIndicator: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingText: {
    fontSize: 13,
    color: '#FF6B6B',
    marginLeft: 6,
    fontWeight: '600',
  },

  // 底部按钮
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F0F0F3',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#D1D9E6',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    ...Platform.select({
      android: {
        elevation: 6,
      },
    }),
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
    paddingVertical: 16,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
