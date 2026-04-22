import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated, Dimensions, StatusBar, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useCSSVariable } from 'uniwind';
import Toast from 'react-native-toast-message';
import * as KeepAwake from 'expo-keep-awake';
import { buildApiUrl } from '@/utils';

// 网页端录音适配
interface WebRecorder {
  mediaRecorder: MediaRecorder | null;
  chunks: Blob[];
  stream: MediaStream | null;
}

// 网页端录音实例
let webRecorder: WebRecorder | null = null;

export default function VoiceChatRealtime() {
  const router = useSafeRouter();
  const [background, foreground, surface, accent, muted, border] = useCSSVariable([
    '--color-background',
    '--color-foreground',
    '--color-surface',
    '--color-accent',
    '--color-muted',
    '--color-border',
  ]) as string[];

  const insets = useSafeAreaInsets();

  const { token } = useAuth();

  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false); // 静音状态
  const [recordMode, setRecordMode] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([]);
  const [latestAiMessage, setLatestAiMessage] = useState('');
  const [currentInterimText, setCurrentInterimText] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const audioBufferRef = useRef<Buffer[] | null>(null);
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const connectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleMessageRef = useRef<any>(null);
  const shouldAutoReconnectRef = useRef(true);

  const { width: screenWidth } = Dimensions.get('window');
  const waveAnimations = useMemo(() => [
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ], []);

  const aiPan = useMemo(() => new Animated.ValueXY({ x: 0, y: 0 }), []);
  const recordingPulseAnim = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    const animationInstances: Animated.CompositeAnimation[] = [];

    const startAnimations = () => {
      waveAnimations.forEach((anim) => {
        const animation = Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1.5,
              duration: 1500,
              useNativeDriver: false,
            }),
            Animated.timing(anim, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: false,
            }),
          ])
        );
        animation.start();
        animationInstances.push(animation);
      });
    };

    startAnimations();

    return () => {
      animationInstances.forEach((animation) => {
        animation.stop();
      });
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, [waveAnimations]);

  useEffect(() => {
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(recordingPulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false,
        }),
        Animated.timing(recordingPulseAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: false,
        }),
      ])
    );
    pulseAnim.start();
    return () => pulseAnim.stop();
  }, []);

  const connectWebSocket = () => {
    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

      let wsUrl: string;

      if (Platform.OS === 'web') {
        // Web环境下：开发环境指向Metro Dev Server，生产环境直接指向后端
        const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isDev) {
          // 开发环境：指向Metro Dev Server，让Metro代理拦截并转发到后端
          wsUrl = 'ws://localhost:5000/api/v1/voice/realtime';
        } else {
          // 生产环境：直接使用完整URL
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          wsUrl = `${protocol}//${window.location.host}/api/v1/voice/realtime`;
        }
      } else {
        // 移动端环境下使用完整URL
        let wsProtocol = 'ws://';
        if (backendUrl.startsWith('https://')) {
          wsProtocol = 'wss://';
        } else if (backendUrl.startsWith('http://')) {
          wsProtocol = 'ws://';
        }

        const hostname = backendUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        wsUrl = `${wsProtocol}${hostname}/api/v1/voice/realtime`;
      }

      console.log('[VOICE] Attempting to connect to WebSocket...');
      console.log('[VOICE] WebSocket URL:', wsUrl);

      const ws = new WebSocket(wsUrl) as any;

      ws.onopen = async () => {
        console.log('[VOICE] WebSocket connected successfully!');
        setIsConnected(true);
        try {
          await KeepAwake.activateKeepAwakeAsync();
        } catch (error) {
          console.error('[VOICE] Failed to activate keep awake:', error);
        }
      };

      ws.onmessage = (event: any) => {
        try {
          const message = JSON.parse(event.data);
          if (handleMessageRef.current) {
            handleMessageRef.current(message);
          }
        } catch (error) {
          console.error('[VOICE] Failed to parse message:', error);
        }
      };

      ws.onerror = (error: Event) => {
        console.error('[VOICE] WebSocket error event triggered');
      };

      ws.onclose = (event: CloseEvent) => {
        if (event.code === 1000) {
          console.log('[VOICE] WebSocket closed normally');
        } else {
          console.error('[VOICE] WebSocket closed abnormally:', event.code);
        }
        setIsConnected(false);

        // 只有在应该自动重连且不是用户手动断开时才重连
        if (event.code !== 1000 && shouldAutoReconnectRef.current) {
          let errorDetail = '';
          switch (event.code) {
            case 1001: errorDetail = '连接被服务器主动关闭'; break;
            case 1006: errorDetail = '连接异常断开，可能是网络问题'; break;
            default: errorDetail = `未知错误 (代码: ${event.code})`;
          }

          console.log(`[VOICE] Will reconnect in 5 seconds... (reason: ${errorDetail})`);
          connectTimeoutRef.current = setTimeout(() => {
            if (shouldAutoReconnectRef.current) {
              console.log('[VOICE] Reconnecting...');
              connectWebSocket();
            }
          }, 5000); // 增加到5秒，避免快速重连
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[VOICE] Failed to connect WebSocket:', error);
      setTimeout(() => connectWebSocket(), 3000);
    }
  };

  const playCollectedAudio = async () => {
    if (!audioBufferRef.current || audioBufferRef.current.length === 0) return;

    try {
      const audioData = Buffer.concat(audioBufferRef.current);
      audioBufferRef.current = null;

      if (Platform.OS === 'web') {
        // 网页端播放音频
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(audioData.buffer);

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();

        setIsAiSpeaking(true);
        source.onended = () => {
          setIsAiSpeaking(false);
          audioContext.close();
        };
      } else {
        // 移动端播放音频
        const base64Audio = audioData.toString('base64');
        const tempDir = (FileSystem as any).documentDirectory || (FileSystem as any).cacheDirectory || '';
        const tempUri = `${tempDir}temp_audio_${Date.now()}.mp3`;

        await (FileSystem as any).writeAsStringAsync(tempUri, base64Audio, {
          encoding: 'base64',
        });

        const { sound } = await Audio.Sound.createAsync(
          { uri: tempUri },
          { shouldPlay: true }
        );

        soundRef.current = sound;
        setIsAiSpeaking(true);

        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsAiSpeaking(false);
            sound.unloadAsync();
            FileSystem.deleteAsync(tempUri).catch(console.error);
          }
        });

        await sound.playAsync();
      }
    } catch (error) {
      console.error('[VOICE] Failed to play audio:', error);
      setIsAiSpeaking(false);
    }
  };

  const saveConversationAsDiary = async () => {
    if (messages.length === 0) return;

    try {
      const content = messages
        .map((msg) => `${msg.role === 'user' ? '我' : 'AI'}: ${msg.content}`)
        .join('\n\n');

      /**
       * 服务端文件：server/src/index.ts
       * 接口：POST /api/v1/diaries
       * Body 参数：title: string, content: string, mood: string, tags: string[]
       */
      const response = await fetch(buildApiUrl('/api/v1/diaries'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: '语音对话记录',
          content: content,
          mood: 'neutral',
          tags: ['语音对话'],
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
      console.error('[VOICE] Failed to save conversation:', error);
    }
  };

  const startRecording = async () => {
    try {
      if (!isConnected) {
        Toast.show({ type: 'error', text1: '连接中', text2: '请稍候...' });
        return;
      }

      if (Platform.OS === 'web') {
        // 网页端录音实现
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

          webRecorder = {
            mediaRecorder: new MediaRecorder(stream, { mimeType: 'audio/webm' }),
            chunks: [],
            stream: stream,
          };

          if (webRecorder.mediaRecorder) {
            webRecorder.mediaRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                webRecorder!.chunks.push(event.data);
              }
            };

            webRecorder.mediaRecorder.start(100); // 每100ms收集一次数据
          }
          setIsRecording(true);
          setIsProcessing(true);

          // 实时发送音频数据
          audioIntervalRef.current = setInterval(async () => {
            try {
              if (webRecorder && webRecorder.chunks.length > 0 && wsRef.current) {
                const chunk = webRecorder.chunks.shift();
                if (chunk) {
                  const arrayBuffer = await chunk.arrayBuffer();
                  if (wsRef.current.readyState === WebSocket.OPEN) {
                    wsRef.current.send(arrayBuffer);
                    console.log('[VOICE] Web: Sent audio chunk:', arrayBuffer.byteLength, 'bytes');
                  }
                }
              }
            } catch (error) {
              console.error('[VOICE] Web: Failed to send audio chunk:', error);
            }
          }, 100);

        } catch (error) {
          console.error('[VOICE] Web: Failed to start recording:', error);
          Toast.show({ type: 'error', text1: '无法访问麦克风' });
        }
      } else {
        // 移动端录音实现
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

        await recording.prepareToRecordAsync({
          android: {
            extension: '.m4a',
            outputFormat: 6,
            audioEncoder: 3,
            sampleRate: 16000,
            numberOfChannels: 1,
            bitRate: 128000,
          },
          ios: {
            extension: '.m4a',
            outputFormat: 'mp4',
            audioQuality: 127,
            sampleRate: 16000,
            numberOfChannels: 1,
            bitRate: 128000,
          },
          web: {
            mimeType: 'audio/webm',
            bitsPerSecond: 128000,
          },
        });

        await recording.startAsync();
        setIsRecording(true);
        setIsProcessing(true);

        // 实时发送录音数据
        audioIntervalRef.current = setInterval(async () => {
          try {
            const status = await recording.getStatusAsync();
            if (status.isRecording && status.durationMillis > 100) { // 每100ms发送一次
              const uri = status.uri;
              const audioData = await (FileSystem as any).readAsStringAsync(uri, {
                encoding: 'base64',
              });

              if (audioData && wsRef.current) {
                const base64Audio = audioData.split(',')[1] || audioData; // 移除data URI前缀
                const audioBytes = Buffer.from(base64Audio, 'base64');

                // 发送音频数据到后端
                if (wsRef.current.readyState === WebSocket.OPEN) {
                  wsRef.current.send(audioBytes.buffer);
                  console.log('[VOICE] Mobile: Sent audio chunk:', audioBytes.length, 'bytes');
                }
              }
            }
          } catch (error) {
            console.error('[VOICE] Mobile: Failed to send audio chunk:', error);
          }
        }, 100); // 每100ms发送一次
      }

    } catch (error) {
      console.error('[VOICE] Failed to start recording:', error);
      Toast.show({ type: 'error', text1: '录音失败' });
    }
  };

  const stopRecording = async () => {
    try {
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
        audioIntervalRef.current = null;
      }

      if (Platform.OS === 'web') {
        // 网页端停止录音
        if (webRecorder && webRecorder.mediaRecorder) {
          webRecorder.mediaRecorder.stop();
          webRecorder.stream?.getTracks().forEach(track => track.stop());
          webRecorder = null;
        }
      } else {
        // 移动端停止录音
        if (recordingRef.current) {
          await recordingRef.current.stopAndUnloadAsync();
          recordingRef.current = null;
        }
      }

      setIsRecording(false);
      setIsProcessing(false);
    } catch (error) {
      console.error('[VOICE] Failed to stop recording:', error);
      setIsRecording(false);
      setIsProcessing(false);
    }
  };

  // 文本输入预留接口
  const sendTextMessage = useCallback((text: string) => {
    try {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        console.error('[VOICE] WebSocket not connected');
        Toast.show({ type: 'error', text1: '连接已断开' });
        return;
      }

      const message = {
        type: 'text_input',
        text: text,
      };

      wsRef.current.send(JSON.stringify(message));
      console.log('[VOICE] Sent text message:', text);
      setIsProcessing(true);
    } catch (error) {
      console.error('[VOICE] Failed to send text message:', error);
      Toast.show({ type: 'error', text1: '发送失败' });
    }
  }, []);

  // 暴露给外部调用
  useEffect(() => {
    // 可以通过 ref 暴露给其他组件使用
    if (wsRef.current) {
      (wsRef.current as any).sendTextMessage = sendTextMessage;
    }
  }, [sendTextMessage]);

  const handleRecordingPress = useCallback(async () => {
    if (isRecording) {
      // 停止录音
      await stopRecording();
    } else {
      // 开始录音
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const handleEndCall = () => {
    Alert.alert(
      '结束通话',
      '确定要结束通话吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: () => {
            // 标记为手动断开，不自动重连
            shouldAutoReconnectRef.current = false;

            // 清理重连定时器
            if (connectTimeoutRef.current) {
              clearTimeout(connectTimeoutRef.current);
              connectTimeoutRef.current = null;
            }

            // 停止录音
            if (isRecording) {
              stopRecording();
            }

            // 停止音频播放
            if (soundRef.current) {
              soundRef.current.unloadAsync();
            }

            // 关闭 WebSocket
            if (wsRef.current) {
              wsRef.current.close(1000); // 正常关闭
            }

            router.back();
          }
        }
      ]
    );
  };

  const handleMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'asr_text': {
        const text = message.data.text;
        if (message.data.is_final) {
          setCurrentInterimText('');
          setMessages(prev => [...prev, { role: 'user', content: text }]);
        } else {
          setCurrentInterimText(text);
        }
        break;
      }

      case 'llm_response': {
        const aiContent = message.data.content;
        setLatestAiMessage(aiContent);
        setMessages(prev => [...prev, { role: 'assistant', content: aiContent }]);
        if (recordMode) {
          saveConversationAsDiary();
        }
        break;
      }

      case 'tts_audio':
        if (audioBufferRef.current === null) {
          audioBufferRef.current = [];
          setTimeout(() => playCollectedAudio(), 500);
        }
        audioBufferRef.current.push(Buffer.from(message.data, 'base64'));
        break;

      case 'tts_ended':
        if (audioBufferRef.current && audioBufferRef.current.length > 0) {
          playCollectedAudio();
        }
        break;

      case 'asr_ended':
        setIsProcessing(false);
        break;

      case 'error':
        Toast.show({ type: 'error', text1: '错误', text2: message.message });
        setIsProcessing(false);
        break;

      case 'connection_closed': {
        setIsConnected(false);
        const errorMsg = message.reason ? `连接已断开: ${message.reason} (代码: ${message.code})` : '连接已断开，正在重连...';
        Toast.show({
          type: 'info',
          text1: '连接已断开',
          text2: errorMsg,
          position: 'bottom',
        });
        break;
      }
        console.error('[VOICE] Connection closed:', message);
        break;
    }
  }, [recordMode, saveConversationAsDiary, connectWebSocket]);

  useEffect(() => {
    handleMessageRef.current = handleMessage;
  }, [handleMessage]);

  useEffect(() => {
    // 组件挂载时只连接一次
    const connectOnce = async () => {
      try {
        await connectWebSocket();
        // 连接成功后不自动开始录音，改为手动录音
        console.log('[VOICE] Connected successfully, ready to record');
      } catch (error) {
        console.error('[VOICE] Failed to connect:', error);
      }
    };

    connectOnce();

    // 清理函数
    return () => {
      shouldAutoReconnectRef.current = false;
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000);
      }
      if (isRecording) {
        stopRecording();
      }
    };
  }, []); // 空依赖数组，只在组件挂载时执行一次

  return (
    <Screen>
      <StatusBar hidden />
      <View style={[styles.container, { backgroundColor: background }]}>
        {/* 顶部导航栏 */}
        <View style={[styles.topBar, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.navButton}>
            <View style={[styles.navButtonInner, { backgroundColor: `${foreground}10` }]}>
              <FontAwesome6 name="chevron-down" size={20} color={foreground} />
            </View>
          </TouchableOpacity>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: isConnected ? '#10B981' : '#F59E0B' }]} />
            <Text style={[styles.statusText, { color: foreground }]}>
              {isConnected ? '通话中' : '连接中...'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.recordModeButton, recordMode && styles.recordModeButtonActive]}
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
              name={recordMode ? 'file-circle-check' : 'file-lines'}
              size={20}
              color={recordMode ? '#FFFFFF' : accent}
            />
          </TouchableOpacity>
        </View>

        {/* 配置提示 */}
        {!isConnected && (
          <View style={[styles.configWarning, { backgroundColor: `${accent}10`, borderColor: accent, borderWidth: 1 }]}>
            <FontAwesome6 name="spinner" size={16} color={accent} />
            <Text style={[styles.configWarningText, { color: accent }]}>
              正在连接语音服务...
            </Text>
          </View>
        )}

        {/* AI陪伴形象 */}
        <View style={styles.avatarContainer}>
          {/* 背景光晕 */}
          <View style={[styles.avatarGlow, { backgroundColor: `${accent}20` }]} />

          {/* 声波动画 */}
          {waveAnimations.map((anim, index) => (
            <Animated.View
              key={index}
              style={[
                styles.wave,
                {
                  borderColor: accent,
                  transform: [{ scale: anim }],
                  opacity: isAiSpeaking ? 0.4 : 0,
                },
              ]}
            />
          ))}

          {/* 温暖的AI形象 */}
          <View style={[styles.aiAvatar, { backgroundColor: surface }]}>
            {/* 左耳朵 */}
            <View style={[styles.aiEar, { backgroundColor: `${accent}30`, left: -8 }]} />

            {/* 右耳朵 */}
            <View style={[styles.aiEar, { backgroundColor: `${accent}30`, right: -8 }]} />

            {/* 左眼 */}
            <View style={[styles.aiEye, { backgroundColor: foreground, left: 38 }]} />
            <View style={[styles.aiEyeShine, { backgroundColor: '#FFFFFF', left: 42, top: 82 }]} />

            {/* 右眼 */}
            <View style={[styles.aiEye, { backgroundColor: foreground, right: 38 }]} />
            <View style={[styles.aiEyeShine, { backgroundColor: '#FFFFFF', right: 42, top: 82 }]} />

            {/* 微笑 */}
            <View style={[styles.aiSmile, { borderColor: '#EC4899' }]} />

            {/* 脸颊红晕 */}
            <Animated.View
              style={[
                styles.aiCheek,
                {
                  backgroundColor: '#EC489940',
                  left: 20,
                  opacity: isRecording ? 0.8 : 0.3
                }
              ]}
            />
            <Animated.View
              style={[
                styles.aiCheek,
                {
                  backgroundColor: '#EC489940',
                  right: 20,
                  opacity: isRecording ? 0.8 : 0.3
                }
              ]}
            />

            {/* 录音状态指示 */}
            {isRecording && (
              <Animated.View
                style={[
                  styles.recordingIndicator,
                  { backgroundColor: '#EF4444' },
                  {
                    opacity: recordingPulseAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 0.5]
                    })
                  }
                ]}
              >
                <FontAwesome6 name="microphone" size={10} color="#FFFFFF" />
              </Animated.View>
            )}
          </View>
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
              {isConnected ? '正在录音，请直接说话...' : '正在连接...'}
            </Text>
          )}
        </View>

        {/* 底部控制栏 */}
        <View style={[styles.footer, { backgroundColor: surface, borderTopColor: `${foreground}05`, borderTopWidth: 1 }]}>
          {/* 挂断按钮 */}
          <TouchableOpacity
            style={[styles.controlButton, styles.endButton, { backgroundColor: '#EF444420' }]}
            onPress={handleEndCall}
            activeOpacity={0.7}
          >
            <FontAwesome6 name="phone-slash" size={24} color="#EF4444" />
            <Text style={[styles.controlButtonText, { color: '#EF4444' }]}>挂断</Text>
          </TouchableOpacity>

          {/* 主录音按钮 */}
          <TouchableOpacity
            style={[
              styles.mainRecordButton,
              { backgroundColor: isRecording ? '#EF4444' : `${accent}10`, borderColor: isRecording ? '#EF4444' : accent, borderWidth: 2 },
            ]}
            onPress={handleRecordingPress}
            disabled={!isConnected}
            activeOpacity={0.8}
          >
            {isRecording ? (
              <>
                <FontAwesome6 name="stop" size={32} color="#FFFFFF" />
                <Text style={styles.mainRecordText}>停止录音</Text>
              </>
            ) : (
              <>
                <FontAwesome6 name="microphone" size={32} color={accent} />
                <Text style={[styles.mainRecordText, { color: accent }]}>点击说话</Text>
              </>
            )}
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
    paddingBottom: 20,
  },
  navButton: {
    padding: 8,
  },
  navButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  recordModeButton: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  recordModeButtonActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  configWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
  },
  configWarningText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  avatarContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarGlow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    filter: 'blur(40px)',
  },
  wave: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
  },
  aiAvatar: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  aiEar: {
    position: 'absolute',
    width: 24,
    height: 40,
    borderRadius: 12,
    top: 60,
  },
  aiEye: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    top: 65,
  },
  aiEyeShine: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    top: 70,
  },
  aiSmile: {
    position: 'absolute',
    bottom: 45,
    width: 40,
    height: 20,
    borderTopWidth: 3,
    borderRadius: 20,
  },
  aiCheek: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    top: 100,
  },
  recordingIndicator: {
    position: 'absolute',
    bottom: 15,
    backgroundColor: '#EF4444',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  controlButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  controlButtonText: {
    fontSize: 11,
    fontWeight: '500',
  },
  endButton: {
  },
  muteButton: {
  },
  mainRecordButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  mainRecordText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
