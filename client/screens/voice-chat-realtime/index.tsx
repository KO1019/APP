import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useCSSVariable } from 'uniwind';
import Toast from 'react-native-toast-message';

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function VoiceChatRealtimeScreen() {
  const router = useSafeRouter();
  const { token } = useAuth();

  // 核心状态
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [recordMode, setRecordMode] = useState(false); // 记录模式开关

  // 对话历史
  const [messages, setMessages] = useState<ConversationMessage[]>([]);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioBufferRef = useRef<Buffer[] | null>(null);
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioFileNameCounterRef = useRef(0);
  const handleMessageRef = useRef<(message: any) => void | Promise<void>>(() => {});

  const [background, surface, accent, foreground, muted, border] = useCSSVariable([
    '--color-background',
    '--color-surface',
    '--color-accent',
    '--color-foreground',
    '--color-muted',
    '--color-border',
  ]) as string[];

  // 保存对话为日记
  const saveConversationAsDiary = useCallback(async () => {
    try {
      // 获取最近的用户和AI对话
      const userMessages = messages.filter(m => m.role === 'user');
      const aiMessages = messages.filter(m => m.role === 'assistant');

      if (userMessages.length === 0) return;

      const lastUserMessage = userMessages[userMessages.length - 1];
      const lastAiMessage = aiMessages[aiMessages.length - 1];

      // 组合对话内容作为日记
      const diaryContent = `对话记录：\n\n我：${lastUserMessage.content}\n\nAI：${lastAiMessage?.content || ''}`;

      /**
       * 服务端文件：server/src/index.ts
       * 接口：POST /api/v1/diaries
       * Body 参数：content: string, emotion: string, title: string
       */
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/diaries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: diaryContent,
          emotion: 'neutral',
          title: '语音对话日记',
        }),
      });

      if (response.ok) {
        Toast.show({
          type: 'success',
          text1: '已保存',
          text2: '对话已自动保存为日记',
        });
      }
    } catch (error) {
      console.error('Failed to save diary:', error);
    }
  }, [messages, token]);

  // 播放收集的音频
  const playCollectedAudio = async () => {
    if (!audioBufferRef.current || audioBufferRef.current.length === 0) return;

    try {
      const totalLength = audioBufferRef.current.reduce((sum, buf) => sum + buf.length, 0);
      const combinedBuffer = Buffer.alloc(totalLength);
      let offset = 0;
      for (const buf of audioBufferRef.current) {
        buf.copy(combinedBuffer, offset);
        offset += buf.length;
      }

      const tempDir = (FileSystem as any).documentDirectory!;
      audioFileNameCounterRef.current += 1;
      const fileName = `tts_${audioFileNameCounterRef.current}.mp3`;
      const tempFile = `${tempDir}${fileName}`;
      await (FileSystem as any).writeAsStringAsync(
        tempFile,
        combinedBuffer.toString('base64'),
        { encoding: 'base64' }
      );

      await playAudio(tempFile);
      audioBufferRef.current = null;
    } catch (error) {
      console.error('Failed to play audio:', error);
      audioBufferRef.current = null;
    }
  };

  // 播放音频
  const playAudio = async (audioUri: string) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        {},
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            console.log('Audio playback finished');
          }
        }
      );

      soundRef.current = sound;
      await sound.playAsync();
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  // WebSocket连接函数
  const connectWebSocket = useCallback(() => {
    try {
      const wsUrl = `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL.replace('http', 'ws')}/api/v1/voice/realtime`;
      const ws = new WebSocket(wsUrl) as any;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
      };

      ws.onmessage = (event: any) => {
        try {
          const message = JSON.parse(event.data);
          if (handleMessageRef.current) {
            handleMessageRef.current(message);
          }
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      };

      ws.onerror = (error: any) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        setIsConnected(false);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }, []);

  // 处理WebSocket消息
  const handleMessage = useCallback(async (message: any) => {
    console.log('Received message:', message.type);

    switch (message.type) {
      case 'asr_result':
        // 语音识别结果
        if (message.data && message.data.results && message.data.results.length > 0) {
          const result = message.data.results[0];
          if (result.text && !result.is_interim) {
            setMessages(prev => [...prev, { role: 'user', content: result.text }]);
          }
        }
        break;

      case 'chat_response': {
        // AI回复
        const aiContent = message.data.content;
        setMessages(prev => [...prev, { role: 'assistant', content: aiContent }]);

        // 如果开启记录模式，自动保存日记
        if (recordMode) {
          saveConversationAsDiary();
        }
        break;
      }

      case 'tts_audio':
        // 音频数据
        if (audioBufferRef.current === null) {
          audioBufferRef.current = [];
          setTimeout(() => playCollectedAudio(), 500);
        }
        audioBufferRef.current.push(Buffer.from(message.data, 'base64'));
        break;

      case 'tts_ended':
        // 音频播放结束
        if (audioBufferRef.current && audioBufferRef.current.length > 0) {
          await playCollectedAudio();
        }
        break;

      case 'asr_ended':
        // 语音识别结束
        setIsProcessing(false);
        break;

      case 'error':
        Toast.show({ type: 'error', text1: '错误', text2: message.message });
        setIsProcessing(false);
        break;

      case 'connection_closed':
        setIsConnected(false);
        Toast.show({ type: 'info', text1: '连接已断开，正在重连...' });
        setTimeout(() => connectWebSocket(), 3000);
        break;
    }
  }, [recordMode, saveConversationAsDiary, connectWebSocket]);

  // 更新 handleMessage ref
  useEffect(() => {
    handleMessageRef.current = handleMessage;
  }, [handleMessage]);

  // 初始化WebSocket连接
  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  // 开始录音
  const startRecording = async () => {
    try {
      if (!isConnected) {
        Toast.show({ type: 'error', text1: '连接中', text2: '请稍候...' });
        return;
      }

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

      const recordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      };

      await recording.prepareToRecordAsync(recordingOptions);
      await recording.startAsync();

      setIsRecording(true);
      setIsProcessing(true);

      audioIntervalRef.current = setInterval(() => {
        sendAudioData();
      }, 200);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Toast.show({ type: 'error', text1: '录音失败' });
    }
  };

  // 停止录音
  const stopRecording = async () => {
    try {
      if (!recordingRef.current) return;

      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
        audioIntervalRef.current = null;
      }

      await recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;

      setIsRecording(false);

      await sendAudioData();
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setIsRecording(false);
      setIsProcessing(false);
    }
  };

  // 发送音频数据
  const sendAudioData = async () => {
    try {
      if (!recordingRef.current || !wsRef.current) return;

      const status = await recordingRef.current.getStatusAsync();

      if (!status.isRecording || !status.uri) return;

      const audioData = await (FileSystem as any).readAsStringAsync(status.uri, {
        encoding: 'base64',
      });

      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(Buffer.from(audioData, 'base64'));
      }
    } catch (error) {
      console.error('Failed to send audio data:', error);
    }
  };

  // 处理录音按钮点击
  const handleRecordingPress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <Screen>
      <View style={[styles.container, { backgroundColor: background }]}>
        {/* 顶部标题栏 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <FontAwesome6 name="arrow-left" size={24} color={foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: foreground }]}>语音陪伴</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* 对话内容区 */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && !isProcessing && (
            <View style={styles.centerContainer}>
              <FontAwesome6 name="microphone-lines" size={80} color={muted} style={styles.icon} />
              <Text style={[styles.welcomeText, { color: foreground }]}>
                {isConnected ? '开始与AI对话' : '连接中...'}
              </Text>
              <Text style={[styles.welcomeSubtext, { color: muted }]}>
                点击下方按钮开始录音，再次点击停止
              </Text>
            </View>
          )}

          {messages.map((message, index) => (
            <View
              key={index}
              style={[
                styles.messageBubble,
                message.role === 'user'
                  ? { backgroundColor: accent, alignSelf: 'flex-end' }
                  : { backgroundColor: surface, alignSelf: 'flex-start', borderWidth: 1, borderColor: border }
              ]}
            >
              {message.role === 'assistant' && (
                <FontAwesome6 name="robot" size={16} color={accent} style={styles.aiIcon} />
              )}
              <Text
                style={[
                  styles.messageText,
                  { color: message.role === 'user' ? '#FFFFFF' : foreground }
                ]}
              >
                {message.content}
              </Text>
            </View>
          ))}

          {isProcessing && (
            <View style={[styles.messageBubble, { backgroundColor: surface, alignSelf: 'flex-start', borderWidth: 1, borderColor: border }]}>
              <ActivityIndicator size="small" color={accent} />
              <Text style={[styles.processingText, { color: muted }]}>正在处理...</Text>
            </View>
          )}
        </ScrollView>

        {/* 底部操作区 */}
        <View style={[styles.footer, { backgroundColor: surface, borderTopColor: border, borderTopWidth: 1 }]}>
          {/* 记录模式开关 */}
          <TouchableOpacity
            style={[styles.recordModeButton, { backgroundColor: recordMode ? `${accent}20` : `${surface}`, borderColor: recordMode ? accent : border }]}
            onPress={() => {
              setRecordMode(!recordMode);
              Toast.show({
                type: 'info',
                text1: recordMode ? '记录模式已关闭' : '记录模式已开启',
                text2: recordMode ? '' : '对话将自动保存为日记'
              });
            }}
          >
            <FontAwesome6
              name={recordMode ? 'file-lines' : 'file'}
              size={20}
              color={recordMode ? accent : muted}
            />
            <Text style={[styles.recordModeText, { color: recordMode ? accent : muted }]}>
              {recordMode ? '记录中' : '记录'}
            </Text>
          </TouchableOpacity>

          {/* 录音按钮 */}
          <TouchableOpacity
            style={[
              styles.recordButton,
              { backgroundColor: isRecording ? '#EF4444' : accent },
            ]}
            onPress={handleRecordingPress}
            disabled={!isConnected}
            activeOpacity={0.8}
          >
            {isRecording ? (
              <FontAwesome6 name="stop" size={36} color="#FFFFFF" />
            ) : (
              <FontAwesome6 name="microphone" size={36} color="#FFFFFF" />
            )}
          </TouchableOpacity>

          {/* 占位，保持布局平衡 */}
          <View style={{ width: 80 }} />
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
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  icon: {
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 10,
  },
  welcomeSubtext: {
    fontSize: 14,
    marginBottom: 20,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 14,
    borderRadius: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  aiIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
    flex: 1,
  },
  processingText: {
    fontSize: 14,
    marginLeft: 8,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 6,
  },
  recordModeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  recordButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
