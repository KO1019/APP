import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Audio, AVPlaybackStatus, AVPlaybackStatusSuccess } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useCSSVariable } from 'uniwind';
import Toast from 'react-native-toast-message';

export default function VoiceChatRealtimeScreen() {
  const router = useSafeRouter();
  const { token } = useAuth();

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [asrResult, setAsrResult] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioBufferRef = useRef<Buffer[] | null>(null);
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioFileNameCounterRef = useRef(0);

  const [background, surface, accent, foreground, muted, border] = useCSSVariable([
    '--color-background',
    '--color-surface',
    '--color-accent',
    '--color-foreground',
    '--color-muted',
    '--color-border',
  ]) as string[];

  const handleMessage = async (message: any) => {
    console.log('Received message:', message.type);

    switch (message.type) {
      case 'asr_result':
        // 语音识别结果
        if (message.data && message.data.results && message.data.results.length > 0) {
          const result = message.data.results[0];
          if (result.text && !result.is_interim) {
            setAsrResult(result.text);
          }
        }
        break;

      case 'chat_response':
        // AI回复
        setAiResponse(message.data.content);
        break;

      case 'tts_audio':
        // 音频数据
        if (audioBufferRef.current === null) {
          audioBufferRef.current = [];
          // 延迟播放，等待更多音频数据
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
        Toast.show({ type: 'info', text1: '连接已断开' });
        break;
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
        Toast.show({ type: 'success', text1: '已连接到语音助手' });
      };

      ws.onmessage = (event: any) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      };

      ws.onerror = (error: any) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
        Toast.show({ type: 'error', text1: '连接错误' });
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        setIsConnected(false);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      Toast.show({ type: 'error', text1: '连接失败' });
    }
  }, [handleMessage]);

  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // 初始化WebSocket连接
  useEffect(() => {
    connectWebSocket();
    return () => {
      disconnectWebSocket();
    };
  }, [connectWebSocket, disconnectWebSocket]);

  const playCollectedAudio = async () => {
    if (!audioBufferRef.current || audioBufferRef.current.length === 0) return;

    try {
      // 合并所有音频数据
      const totalLength = audioBufferRef.current.reduce((sum, buf) => sum + buf.length, 0);
      const combinedBuffer = Buffer.alloc(totalLength);
      let offset = 0;
      for (const buf of audioBufferRef.current) {
        buf.copy(combinedBuffer, offset);
        offset += buf.length;
      }

      // 保存到临时文件
      const tempDir = (FileSystem as any).documentDirectory!;
      audioFileNameCounterRef.current += 1;
      const fileName = `tts_${audioFileNameCounterRef.current}.mp3`;
      const tempFile = `${tempDir}${fileName}`;
      await (FileSystem as any).writeAsStringAsync(
        tempFile,
        combinedBuffer.toString('base64'),
        { encoding: 'base64' }
      );

      // 播放音频
      await playAudio(tempFile);

      audioBufferRef.current = null;
    } catch (error) {
      console.error('Failed to play audio:', error);
      audioBufferRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      if (!isConnected) {
        Toast.show({ type: 'error', text1: '未连接', text2: '请先连接到语音助手' });
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

      // 设置录音配置为PCM格式，16kHz采样率
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
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      };

      await recording.prepareToRecordAsync(recordingOptions);
      await recording.startAsync();

      setIsRecording(true);
      setAsrResult(null);
      setAiResponse(null);
      setIsProcessing(true);

      Toast.show({ type: 'info', text1: '开始录音' });

      // 定期发送音频数据
      audioIntervalRef.current = setInterval(() => {
        sendAudioData();
      }, 200); // 每200ms发送一次
    } catch (error) {
      console.error('Failed to start recording:', error);
      Toast.show({ type: 'error', text1: '录音失败' });
    }
  };

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

      // 发送最后的音频数据
      await sendAudioData();

      Toast.show({ type: 'info', text1: '录音结束，正在处理...' });
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Toast.show({ type: 'error', text1: '停止录音失败' });
      setIsRecording(false);
      setIsProcessing(false);
    }
  };

  const sendAudioData = async () => {
    try {
      if (!recordingRef.current || !wsRef.current) return;

      // 获取录音状态
      const status = await recordingRef.current.getStatusAsync();

      if (!status.isRecording || !status.uri) return;

      // 读取音频文件
      const audioData = await (FileSystem as any).readAsStringAsync(status.uri, {
        encoding: 'base64',
      });

      // 发送音频数据到WebSocket
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(Buffer.from(audioData, 'base64'));
      }
    } catch (error) {
      console.error('Failed to send audio data:', error);
    }
  };

  const playAudio = async (audioUri: string) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        {},
        onPlaybackStatusUpdate
      );

      soundRef.current = sound;
      await sound.playAsync();
    } catch (error) {
      console.error('Error playing audio:', error);
      Toast.show({ type: 'error', text1: '播放语音失败' });
    }
  };

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      const statusSuccess = status as AVPlaybackStatusSuccess;
      if (statusSuccess.didJustFinish) {
        console.log('Audio playback finished');
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

  return (
    <Screen>
      <View style={[styles.container, { backgroundColor: background }]}>
        {/* 顶部状态栏 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <FontAwesome6 name="arrow-left" size={24} color={foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: foreground }]}>实时语音陪伴</Text>
          <View style={[styles.statusIndicator, isConnected ? styles.connected : styles.disconnected]} />
        </View>

        {/* 对话内容 */}
        <ScrollView style={styles.content}>
          {isProcessing && (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={accent} />
              <Text style={[styles.statusText, { color: muted }]}>
                {isRecording ? '录音中...' : '正在处理...'}
              </Text>
            </View>
          )}

          {asrResult && (
            <View style={[styles.messageBubble, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}>
              <Text style={[styles.userLabel, { color: muted }]}>你</Text>
              <Text style={[styles.messageText, { color: foreground }]}>{asrResult}</Text>
            </View>
          )}

          {aiResponse && (
            <View style={[styles.messageBubble, styles.aiBubble, { backgroundColor: `${accent}10` }]}>
              <FontAwesome6 name="robot" size={20} color={accent} style={styles.aiIcon} />
              <View style={styles.aiContent}>
                <Text style={[styles.aiLabel, { color: accent }]}>AI助手</Text>
                <Text style={[styles.messageText, { color: foreground }]}>{aiResponse}</Text>
              </View>
            </View>
          )}

          {!isProcessing && !asrResult && !isRecording && (
            <View style={styles.centerContainer}>
              <FontAwesome6 name="microphone-lines" size={64} color={muted} style={styles.icon} />
              <Text style={[styles.welcomeText, { color: foreground }]}>
                {isConnected ? '实时语音陪伴' : '连接中...'}
              </Text>
              <Text style={[styles.welcomeSubtext, { color: muted }]}>
                {isConnected
                  ? '点击下方按钮开始录音，与AI进行实时语音对话'
                  : '正在连接语音助手...'}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* 底部操作区 */}
        <View style={[styles.footer, { backgroundColor: surface, borderTopColor: border, borderTopWidth: 1 }]}>
          {/* 连接状态 */}
          <Text style={[styles.statusText, { color: muted }]}>
            {isConnected ? '已连接' : '未连接'}
          </Text>

          {/* 录音按钮 */}
          <TouchableOpacity
            style={[
              styles.recordButton,
              { backgroundColor: isRecording ? '#EF4444' : accent },
            ]}
            onPress={handleRecordingPress}
            disabled={!isConnected || isProcessing && !isRecording}
            activeOpacity={0.8}
          >
            {isRecording ? (
              <FontAwesome6 name="stop" size={32} color="#FFFFFF" />
            ) : (
              <FontAwesome6 name="microphone" size={32} color="#FFFFFF" />
            )}
          </TouchableOpacity>

          {/* 断开连接按钮 */}
          <TouchableOpacity
            style={[styles.disconnectButton, { backgroundColor: `${foreground}10` }]}
            onPress={() => {
              if (isConnected) {
                disconnectWebSocket();
                Toast.show({ type: 'info', text1: '已断开连接' });
              } else {
                connectWebSocket();
              }
            }}
            activeOpacity={0.8}
          >
            <FontAwesome6 name={isConnected ? 'link-slash' : 'link'} size={20} color={foreground} />
            <Text style={[styles.disconnectButtonText, { color: foreground }]}>
              {isConnected ? '断开' : '连接'}
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
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  connected: {
    backgroundColor: '#10B981',
  },
  disconnected: {
    backgroundColor: '#EF4444',
  },
  content: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  icon: {
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  statusText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  messageBubble: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    maxWidth: '80%',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
  },
  userLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  aiBubble: {
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
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
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
  disconnectButton: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  disconnectButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
