import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated, Dimensions, StatusBar, Alert } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useCSSVariable } from 'uniwind';
import Toast from 'react-native-toast-message';
import * as KeepAwake from 'expo-keep-awake';

interface ConversationMessage {
  role: 'user' | 'assistant' | 'user_interim';
  content: string;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function VoiceChatRealtimeScreen() {
  const router = useSafeRouter();
  const { token } = useAuth();

  // 核心状态
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [recordMode, setRecordMode] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  // 对话历史
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [currentInterimText, setCurrentInterimText] = useState('');
  const [latestAiMessage, setLatestAiMessage] = useState('');

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioBufferRef = useRef<Buffer[] | null>(null);
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioFileNameCounterRef = useRef(0);
  const handleMessageRef = useRef<((message: any) => void | Promise<void>) | undefined>(() => undefined);

  const [background, surface, accent, foreground, muted, border] = useCSSVariable([
    '--color-background',
    '--color-surface',
    '--color-accent',
    '--color-foreground',
    '--color-muted',
    '--color-border',
  ]) as string[];

  // 声波动画值
  const waveAnimations = useMemo(() => [
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ], []);

  // 声波动画循环
  useEffect(() => {
    if (isAiSpeaking) {
      const animate = () => {
        Animated.parallel([
          Animated.sequence([
            Animated.timing(waveAnimations[0], { toValue: 1.5, duration: 1000, useNativeDriver: true }),
            Animated.timing(waveAnimations[0], { toValue: 1, duration: 1000, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(waveAnimations[1], { toValue: 1.3, duration: 800, useNativeDriver: true, delay: 200 }),
            Animated.timing(waveAnimations[1], { toValue: 1, duration: 800, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(waveAnimations[2], { toValue: 1.7, duration: 1200, useNativeDriver: true, delay: 400 }),
            Animated.timing(waveAnimations[2], { toValue: 1, duration: 1200, useNativeDriver: true }),
          ]),
        ]).start(() => {
          if (isAiSpeaking) {
            animate();
          }
        });
      };
      animate();
    } else {
      waveAnimations.forEach(anim => anim.setValue(1));
    }
  }, [isAiSpeaking, waveAnimations]);

  // 保持屏幕常亮
  useEffect(() => {
    KeepAwake.activateKeepAwakeAsync('tag-voice-chat');
  }, []);

  // 保存对话为日记
  const saveConversationAsDiary = useCallback(async () => {
    try {
      const userMessages = messages.filter(m => m.role === 'user');
      const aiMessages = messages.filter(m => m.role === 'assistant');

      if (userMessages.length === 0) return;

      const lastUserMessage = userMessages[userMessages.length - 1];
      const lastAiMessage = aiMessages[aiMessages.length - 1];

      const diaryContent = `语音对话记录：\n\n我：${lastUserMessage.content}\n\nAI：${lastAiMessage?.content || ''}`;

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
            setIsAiSpeaking(false);
          }
        }
      );

      soundRef.current = sound;
      setIsAiSpeaking(true);
      await sound.playAsync();
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsAiSpeaking(false);
    }
  };

  // WebSocket连接函数
  const connectWebSocket = useCallback(() => {
    try {
      // 直接连接到Express服务器的WebSocket端口，绕过代理
      // 注意：这需要Express服务器允许CORS和WebSocket连接
      const wsUrl = 'ws://localhost:9091/api/v1/voice/realtime';
      console.log('========================================');
      console.log('[VOICE] Attempting to connect to WebSocket...');
      console.log('[VOICE] WebSocket URL:', wsUrl);
      console.log('[VOICE] Current time:', new Date().toISOString());
      console.log('========================================');

      const ws = new WebSocket(wsUrl) as any;

      ws.onopen = () => {
        console.log('[VOICE] WebSocket connected successfully!');
        console.log('[VOICE] WebSocket readyState:', ws.readyState);
        console.log('[VOICE] Connection time:', new Date().toISOString());
        setIsConnected(true);
      };

      ws.onmessage = (event: any) => {
        try {
          const message = JSON.parse(event.data);
          console.log('[VOICE] WebSocket message received:', message);

          // 处理错误消息
          if (message.type === 'error') {
            console.error('[VOICE] WebSocket error from server:', message.message);
            Toast.show({
              type: 'error',
              text1: '连接失败',
              text2: message.message || '语音服务暂时不可用',
              position: 'bottom',
            });
            setIsConnected(false);
            return;
          }

          if (handleMessageRef.current) {
            handleMessageRef.current(message);
          }
        } catch (error) {
          console.error('[VOICE] Failed to parse message:', error);
        }
      };

      ws.onerror = (error: Event) => {
        console.error('[VOICE] WebSocket error:', error);
        console.error('[VOICE] WebSocket readyState:', ws.readyState);
        console.error('[VOICE] WebSocket URL:', ws.url);
        setIsConnected(false);
        Toast.show({
          type: 'error',
          text1: '连接错误',
          text2: '语音服务连接失败，请检查网络或稍后重试',
          position: 'bottom',
        });
      };

      ws.onclose = (event: CloseEvent) => {
        console.log('[VOICE] WebSocket closed:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });
        setIsConnected(false);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      Toast.show({
        type: 'error',
        text1: '连接失败',
        text2: '无法连接到语音服务',
        position: 'bottom',
      });
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
          if (result.text) {
            if (result.is_interim) {
              setCurrentInterimText(result.text);
            } else {
              setCurrentInterimText('');
              setMessages(prev => [...prev, { role: 'user', content: result.text }]);
            }
          }
        }
        break;

      case 'chat_response': {
        // AI回复
        const aiContent = message.data.content;
        setLatestAiMessage(aiContent);
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

  // 关闭通话（显示浮悬窗）
  const handleEndCall = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    router.back();
    Toast.show({
      type: 'info',
      text1: '通话已结束',
      text2: '浮悬窗已开启',
    });
  };

  return (
    <Screen>
      <StatusBar hidden />
      <View style={[styles.container, { backgroundColor: background }]}>
        {/* 顶部状态栏 */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <FontAwesome6 name="chevron-down" size={24} color={foreground} />
          </TouchableOpacity>
          <Text style={[styles.statusText, { color: foreground }]}>
            {isConnected ? '通话中' : '连接中...'}
          </Text>
          <TouchableOpacity
            style={styles.recordModeButton}
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
          </TouchableOpacity>
        </View>

        {/* 配置提示 */}
        {!isConnected && (
          <View style={[styles.configWarning, { backgroundColor: '#E3F2FD', borderColor: '#2196F3', borderWidth: 1 }]}>
            <FontAwesome6 name="spinner" size={16} color="#1976D2" />
            <Text style={[styles.configWarningText, { color: '#1976D2' }]}>
              正在连接语音服务...
            </Text>
          </View>
        )}

        {/* AI人物头像区域 */}
        <View style={styles.avatarContainer}>
          {/* 声波动画 */}
          {waveAnimations.map((anim, index) => (
            <Animated.View
              key={index}
              style={[
                styles.wave,
                {
                  borderColor: accent,
                  transform: [{ scale: anim }],
                  opacity: isAiSpeaking ? 0.3 : 0,
                },
              ]}
            />
          ))}

          {/* 可爱陪伴机器人 */}
          <View style={[styles.robotHead, { backgroundColor: surface }]}>
            {/* 天线 */}
            <View style={[styles.antenna, { backgroundColor: accent }]} />
            <View style={[styles.antennaBall, { backgroundColor: '#FF6B9D' }]} />

            {/* 左耳 */}
            <View style={[styles.ear, { backgroundColor: `${accent}40`, left: -15 }]} />

            {/* 右耳 */}
            <View style={[styles.ear, { backgroundColor: `${accent}40`, right: -15 }]} />

            {/* 左眼 */}
            <View style={[styles.eye, { backgroundColor: foreground, left: 45 }]} />

            {/* 右眼 */}
            <View style={[styles.eye, { backgroundColor: foreground, right: 45 }]} />

            {/* 眼睛高光 */}
            <View style={[styles.eyeShine, { backgroundColor: '#FFFFFF', left: 50, top: 105 }]} />
            <View style={[styles.eyeShine, { backgroundColor: '#FFFFFF', right: 50, top: 105 }]} />

            {/* 微笑嘴巴 */}
            <View style={[styles.mouth, { borderColor: '#FF6B9D' }]}>
              <View style={[styles.tongue, { backgroundColor: '#FF6B9D' }]} />
            </View>

            {/* 脸颊红晕 */}
            <View style={[styles.cheek, { backgroundColor: '#FF6B9D30', left: 30, top: 130 }]} />
            <View style={[styles.cheek, { backgroundColor: '#FF6B9D30', right: 30, top: 130 }]} />

            {/* 录音指示器 */}
            {isRecording && (
              <View style={[styles.recordingIndicator, { backgroundColor: '#EF4444' }]}>
                <FontAwesome6 name="circle" size={8} color="#FFFFFF" />
              </View>
            )}
          </View>

          {/* 阴影效果 */}
          <View style={[styles.avatarShadow, { backgroundColor: `${foreground}10` }]} />
        </View>

        {/* 实时文字显示 */}
        <View style={styles.textContainer}>
          {currentInterimText ? (
            <View style={[styles.messageBubble, { backgroundColor: `${accent}20`, borderColor: accent, borderWidth: 1 }]}>
              <FontAwesome6 name="user" size={16} color={accent} style={styles.icon} />
              <Text style={[styles.messageText, { color: foreground }]}>{currentInterimText}</Text>
            </View>
          ) : isProcessing ? (
            <View style={[styles.messageBubble, { backgroundColor: `${surface}`, borderColor: border, borderWidth: 1 }]}>
              <ActivityIndicator size="small" color={accent} />
              <Text style={[styles.messageText, { color: muted }]}>正在识别...</Text>
            </View>
          ) : latestAiMessage ? (
            <View style={[styles.messageBubble, { backgroundColor: `${surface}`, borderColor: border, borderWidth: 1 }]}>
              <FontAwesome6 name="robot" size={16} color={accent} style={styles.icon} />
              <Text style={[styles.messageText, { color: foreground }]}>{latestAiMessage}</Text>
            </View>
          ) : (
            <Text style={[styles.hintText, { color: muted }]}>
              {isConnected ? '点击下方按钮开始说话' : '正在连接...'}
            </Text>
          )}
        </View>

        {/* 底部控制栏 */}
        <View style={[styles.footer, { backgroundColor: surface, borderTopColor: border, borderTopWidth: 1 }]}>
          {/* 挂断按钮 */}
          <TouchableOpacity
            style={[styles.endButton, { backgroundColor: '#EF4444' }]}
            onPress={handleEndCall}
          >
            <FontAwesome6 name="phone-slash" size={24} color="#FFFFFF" />
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
              <FontAwesome6 name="stop" size={40} color="#FFFFFF" />
            ) : (
              <FontAwesome6 name="microphone" size={40} color="#FFFFFF" />
            )}
          </TouchableOpacity>

          {/* 麦克风静音按钮 */}
          <TouchableOpacity style={[styles.muteButton, { backgroundColor: `${surface}`, borderColor: border, borderWidth: 1 }]}>
            <FontAwesome6 name="microphone-slash" size={24} color={muted} />
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
  },
  recordModeButton: {
    padding: 8,
  },
  configWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
  },
  configWarningText: {
    fontSize: 13,
    flex: 1,
  },
  avatarContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  wave: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 3,
  },
  robotHead: {
    width: 180,
    height: 200,
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  antenna: {
    position: 'absolute',
    top: -30,
    width: 4,
    height: 35,
    borderRadius: 2,
  },
  antennaBall: {
    position: 'absolute',
    top: -40,
    width: 16,
    height: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  ear: {
    position: 'absolute',
    width: 30,
    height: 50,
    borderRadius: 15,
    top: 70,
  },
  eye: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    top: 75,
  },
  eyeShine: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    top: 80,
  },
  mouth: {
    position: 'absolute',
    width: 60,
    height: 30,
    borderRadius: 30,
    bottom: 40,
    borderTopWidth: 4,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    overflow: 'hidden',
  },
  tongue: {
    position: 'absolute',
    bottom: 0,
    left: 15,
    width: 30,
    height: 15,
    borderRadius: 15,
  },
  cheek: {
    position: 'absolute',
    width: 25,
    height: 20,
    borderRadius: 12.5,
  },
  recordingIndicator: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  avatarShadow: {
    position: 'absolute',
    width: 160,
    height: 20,
    borderRadius: 80,
    bottom: -30,
  },
  textContainer: {
    paddingHorizontal: 40,
    paddingVertical: 40,
    alignItems: 'center',
    minHeight: 120,
  },
  messageBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    maxWidth: '100%',
  },
  icon: {
    marginRight: 12,
  },
  messageText: {
    fontSize: 18,
    lineHeight: 26,
    flex: 1,
    textAlign: 'center',
  },
  hintText: {
    fontSize: 16,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 30,
    paddingTop: 30,
    paddingBottom: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  endButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  muteButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
