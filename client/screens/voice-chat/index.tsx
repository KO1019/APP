import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Audio, AVPlaybackStatus, AVPlaybackStatusSuccess } from 'expo-av';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useCSSVariable } from 'uniwind';
import Toast from 'react-native-toast-message';
import { createFormDataFile } from '@/utils';

export default function VoiceChatScreen() {
  const router = useSafeRouter();
  const { token } = useAuth();

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [userText, setUserText] = useState<string | null>(null);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const [background, surface, accent, foreground, muted, border] = useCSSVariable([
    '--color-background',
    '--color-surface',
    '--color-accent',
    '--color-foreground',
    '--color-muted',
    '--color-border',
  ]) as string[];

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('需要权限', '请授予麦克风权限以使用语音功能');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      recordingRef.current = recording;

      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();

      setIsRecording(true);
      Toast.show({ type: 'info', text1: '开始录音' });
    } catch (error) {
      console.error('Failed to start recording:', error);
      Toast.show({ type: 'error', text1: '录音失败' });
    }
  };

  const stopRecording = async () => {
    try {
      if (!recordingRef.current) return;

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      setIsRecording(false);

      if (uri) {
        await uploadAndProcessAudio(uri);
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Toast.show({ type: 'error', text1: '停止录音失败' });
      setIsRecording(false);
    }
  };

  const uploadAndProcessAudio = async (audioUri: string) => {
    try {
      setIsProcessing(true);

      // 创建FormData文件
      const file = await createFormDataFile(audioUri, 'voice.m4a', 'audio/m4a');

      const formData = new FormData();
      formData.append('audio', file as any);
      formData.append('mode', 'chat'); // 或 'diary' 用于记日记

      /**
       * 服务端文件：server/src/index.ts
       * 接口：POST /api/v1/voice/chat
       * Headers: Authorization: Bearer {token}
       * Body: FormData { audio: File, mode: 'chat' | 'diary', diaryId?: string }
       */
      const apiResponse = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/voice/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // 不设置 Content-Type，让 fetch 自动设置
        },
        body: formData,
      });

      const data = await apiResponse.json();

      if (!apiResponse.ok) {
        throw new Error(data.error || '处理失败');
      }

      setUserText(data.text);
      setAiResponse(data.aiText);

      // 如果有音频URL，自动播放
      if (data.audioUrl && data.audioUrl !== 'https://example.com/speech.mp3') {
        // 构建完整的音频URL
        const fullAudioUrl = data.audioUrl.startsWith('http')
          ? data.audioUrl
          : `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}${data.audioUrl}`;
        setCurrentAudioUrl(fullAudioUrl);
        await playAudio(fullAudioUrl);
      } else if (aiResponse) {
        Toast.show({ type: 'success', text1: '对话完成', text2: '请查看回复文本' });
      }
    } catch (error: any) {
      console.error('Error processing audio:', error);
      Toast.show({ type: 'error', text1: error.message || '处理语音失败' });
    } finally {
      setIsProcessing(false);
    }
  };

  const playAudio = async (audioUrl: string) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        {},
        onPlaybackStatusUpdate
      );

      soundRef.current = sound;
      await sound.playAsync();
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing audio:', error);
      Toast.show({ type: 'error', text1: '播放语音失败' });
    }
  };

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      const statusSuccess = status as AVPlaybackStatusSuccess;
      if (statusSuccess.didJustFinish) {
        setIsPlaying(false);
      }
    }
  };

  const handleRecordingPress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleDiaryMode = async () => {
    if (isRecording) {
      Alert.alert('录音中', '请先停止录音');
      return;
    }

    Alert.alert(
      '记日记模式',
      '录音后会自动保存为日记，是否继续？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '开始',
          onPress: async () => {
            await startRecording();
            // 保存模式状态，停止录音时会自动使用日记模式
            Toast.show({ type: 'info', text1: '日记模式：开始录音' });
          },
        },
      ]
    );
  };

  return (
    <Screen>
      <View style={[styles.container, { backgroundColor: background }]}>
        {/* 顶部状态栏 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <FontAwesome6 name="arrow-left" size={24} color={foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: foreground }]}>语音陪伴</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* 对话内容 */}
        <View style={styles.content}>
          {isProcessing && (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={accent} />
              <Text style={[styles.statusText, { color: muted }]}>
                正在处理...
              </Text>
            </View>
          )}

          {!isProcessing && userText && (
            <View style={styles.chatContainer}>
              <View style={[styles.userBubble, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}>
                <Text style={[styles.userLabel, { color: muted }]}>你</Text>
                <Text style={[styles.userText, { color: foreground }]}>{userText}</Text>
              </View>

              {aiResponse && (
                <View style={[styles.aiBubble, { backgroundColor: `${accent}10` }]}>
                  <FontAwesome6 name="robot" size={20} color={accent} style={styles.aiIcon} />
                  <View style={styles.aiContent}>
                    <Text style={[styles.aiLabel, { color: accent }]}>AI助手</Text>
                    <Text style={[styles.aiText, { color: foreground }]}>{aiResponse}</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {!isProcessing && !userText && !isRecording && (
            <View style={styles.centerContainer}>
              <FontAwesome6 name="microphone-lines" size={64} color={muted} style={styles.icon} />
              <Text style={[styles.welcomeText, { color: foreground }]}>语音陪伴</Text>
              <Text style={[styles.welcomeSubtext, { color: muted }]}>
                点击下方按钮开始录音，与AI进行语音对话
              </Text>
            </View>
          )}
        </View>

        {/* 底部操作区 */}
        <View style={[styles.footer, { backgroundColor: surface, borderTopColor: border, borderTopWidth: 1 }]}>
          {/* 记日记按钮 */}
          <TouchableOpacity
            style={[styles.diaryButton, { backgroundColor: `${foreground}10` }]}
            onPress={handleDiaryMode}
            disabled={isRecording || isProcessing}
            activeOpacity={0.8}
          >
            <FontAwesome6 name="book" size={20} color={foreground} />
            <Text style={[styles.diaryButtonText, { color: foreground }]}>记日记</Text>
          </TouchableOpacity>

          {/* 录音按钮 */}
          <TouchableOpacity
            style={[
              styles.recordButton,
              { backgroundColor: isRecording ? '#EF4444' : accent },
            ]}
            onPress={handleRecordingPress}
            disabled={isProcessing}
            activeOpacity={0.8}
          >
            {isRecording ? (
              <FontAwesome6 name="stop" size={32} color="#FFFFFF" />
            ) : (
              <FontAwesome6 name="microphone" size={32} color="#FFFFFF" />
            )}
          </TouchableOpacity>

          {/* 播放按钮 */}
          <TouchableOpacity
            style={[styles.playButton, { backgroundColor: `${foreground}10` }]}
            onPress={async () => {
              if (currentAudioUrl) {
                try {
                  await playAudio(currentAudioUrl);
                } catch (error) {
                  Toast.show({ type: 'error', text1: '播放失败' });
                }
              }
            }}
            disabled={!currentAudioUrl || isPlaying}
            activeOpacity={0.8}
          >
            <FontAwesome6 name={isPlaying ? 'pause' : 'play'} size={20} color={foreground} />
            <Text style={[styles.playButtonText, { color: foreground }]}>
              {isPlaying ? '暂停' : '播放'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  icon: {
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  welcomeSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  statusText: {
    fontSize: 16,
    marginTop: 16,
  },
  chatContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  userBubble: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    maxWidth: '80%',
    alignSelf: 'flex-end',
  },
  userLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  userText: {
    fontSize: 16,
    lineHeight: 24,
  },
  aiBubble: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    maxWidth: '80%',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 12,
  },
  aiIcon: {
    marginTop: 2,
  },
  aiContent: {
    flex: 1,
  },
  aiLabel: {
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '600',
  },
  aiText: {
    fontSize: 16,
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  diaryButton: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  diaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  playButton: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  playButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
