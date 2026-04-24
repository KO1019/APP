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
  const [recordMode, setRecordMode] = useState(false); // 记录模式：自动保存对话为日记
  const [callStatus, setCallStatus] = useState<'connecting' | 'listening' | 'thinking' | 'speaking'>('connecting'); // 通话状态
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

  // HTTP长轮询相关
  const [useHttpPolling, setUseHttpPolling] = useState(false); // 是否使用HTTP长轮询
  const httpSessionIdRef = useRef<string | null>(null); // HTTP会话ID
  const httpPollingIntervalRef = useRef<NodeJS.Timeout | null>(null); // 轮询定时器
  const httpIsConnectedRef = useRef<boolean>(false); // HTTP连接状态

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

  // 检测是否在Coze环境中
  const isCozeEnvironment = (): boolean => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return window.location.hostname.includes('coze.site');
    }
    return false;
  };

  // HTTP长轮询：创建会话
  const httpCreateSession = async (): Promise<string> => {
    const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/voice/session/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.status}`);
    }

    const data = await response.json();
    return data.session_id;
  };

  // HTTP长轮询：连接到豆包API
  const httpConnectSession = async (sessionId: string): Promise<void> => {
    const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/voice/session/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to connect session: ${response.status}`);
    }

    const data = await response.json();
  };

  // HTTP长轮询：发送消息
  const httpSendMessage = async (message: any): Promise<void> => {
    const sessionId = httpSessionIdRef.current;
    if (!sessionId) return;

    const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/voice/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...message, session_id: sessionId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.status}`);
    }
  };

  // HTTP长轮询：轮询消息
  const httpPollMessages = async (): Promise<void> => {
    const sessionId = httpSessionIdRef.current;
    if (!sessionId || !httpIsConnectedRef.current) return;

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/voice/poll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to poll messages: ${response.status}`);
      }

      const message = await response.json();

      if (message.type !== 'keep_alive' && handleMessageRef.current) {
        handleMessageRef.current(message);
      }
    } catch (error) {
      console.error('[VOICE-HTTP] Error polling messages:', error);
    }
  };

  // HTTP长轮询：关闭会话
  const httpCloseSession = async (): Promise<void> => {
    const sessionId = httpSessionIdRef.current;
    if (!sessionId) return;

    try {
      await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/voice/session/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
    } catch (error) {
      console.error('[VOICE-HTTP] Error closing session:', error);
    }
  };

  // 连接到语音服务（自动选择WebSocket或HTTP长轮询）
  const connectWebSocket = async () => {
    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://9.129.7.228:9091';

    // 检测是否在Coze环境中
    const inCozeEnv = isCozeEnvironment();

    if (inCozeEnv) {
      // Coze环境：使用HTTP长轮询
      setUseHttpPolling(true);

      try {
        // 创建会话
        const sessionId = await httpCreateSession();
        httpSessionIdRef.current = sessionId;
        setCallStatus('connecting');

        // 连接到豆包API
        await httpConnectSession(sessionId);
        httpIsConnectedRef.current = true;
        setIsConnected(true);

        // 启动轮询
        httpPollingIntervalRef.current = setInterval(() => {
          httpPollMessages();
        }, 100); // 每100ms轮询一次

        // 激活常亮
        try {
          await KeepAwake.activateKeepAwakeAsync();
        } catch (error) {
          console.error('[VOICE] Failed to activate keep awake:', error);
        }

      } catch (error) {
        console.error('[VOICE-HTTP] Failed to connect:', error);
        setIsConnected(false);

        // 5秒后重连
        if (shouldAutoReconnectRef.current) {
          connectTimeoutRef.current = setTimeout(() => {
            if (shouldAutoReconnectRef.current) {
              connectWebSocket();
            }
          }, 5000);
        }
      }
    } else {
      // 非Coze环境：使用WebSocket
      setUseHttpPolling(false);

      try {
        let wsUrl: string;

        if (Platform.OS === 'web') {
          // Web环境下：使用相同的backendUrl，但将http/https协议转换为ws/wss
          const url = new URL(backendUrl);
          const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
          wsUrl = `${protocol}//${url.hostname}${url.port ? `:${url.port}` : ''}/api/v1/voice/realtime`;
        } else {
          // 移动端：使用相同的backendUrl，但将http/https协议转换为ws/wss
          const url = new URL(backendUrl);
          const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
          wsUrl = `${wsProtocol}${url.hostname}${url.port ? `:${url.port}` : ''}/api/v1/voice/realtime`;
        }


        const ws = new WebSocket(wsUrl) as any;

        ws.onopen = async () => {
          setCallStatus('connecting');
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
                connectWebSocket();
              }
            }, 5000);
          }
        };

        wsRef.current = ws;
      } catch (error) {
        console.error('[VOICE] Failed to connect WebSocket:', error);
        setTimeout(() => connectWebSocket(), 3000);
      }
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

          // 实时发送音频数据（按照豆包官方最佳实践：20ms一包）
          audioIntervalRef.current = setInterval(async () => {
            try {
              if (webRecorder && webRecorder.chunks.length > 0) {
                const chunk = webRecorder.chunks.shift();
                if (chunk) {
                  const arrayBuffer = await chunk.arrayBuffer();

                  if (useHttpPolling) {
                    // HTTP长轮询模式：发送hex编码的音频数据
                    const audioHex = Buffer.from(arrayBuffer).toString('hex');
                    await httpSendMessage({
                      type: 'audio_input',
                      audio_data: audioHex
                    });
                  } else {
                    // WebSocket模式：直接发送二进制数据
                    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                      wsRef.current.send(arrayBuffer);
                    }
                  }
                }
              }
            } catch (error) {
              console.error('[VOICE] Web: Failed to send audio chunk:', error);
            }
          }, 20); // 20ms一包（豆包官方最佳实践）

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

        // 实时发送录音数据（按照豆包官方最佳实践：20ms一包）
        audioIntervalRef.current = setInterval(async () => {
          try {
            const status = await recording.getStatusAsync();
            if (status.isRecording && status.durationMillis > 20) { // 每20ms发送一次
              const uri = status.uri;
              const audioData = await (FileSystem as any).readAsStringAsync(uri, {
                encoding: 'base64',
              });

              if (audioData) {
                const base64Audio = audioData.split(',')[1] || audioData; // 移除data URI前缀
                const audioBytes = Buffer.from(base64Audio, 'base64');

                // 发送音频数据到后端
                if (useHttpPolling) {
                  // HTTP长轮询模式：发送hex编码的音频数据
                  const audioHex = audioBytes.toString('hex');
                  await httpSendMessage({
                    type: 'audio_input',
                    audio_data: audioHex
                  });
                } else {
                  // WebSocket模式：直接发送二进制数据
                  if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    wsRef.current.send(audioBytes.buffer);
                  }
                }
              }
            }
          } catch (error) {
            console.error('[VOICE] Mobile: Failed to send audio chunk:', error);
          }
        }, 20); // 20ms一包（豆包官方最佳实践）
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
  const sendTextMessage = useCallback(async (text: string) => {
    try {
      const message = {
        type: 'text_input',
        text: text,
      };

      if (useHttpPolling) {
        // HTTP长轮询模式
        if (!httpSessionIdRef.current) {
          console.error('[VOICE-HTTP] Session not connected');
          Toast.show({ type: 'error', text1: '连接已断开' });
          return;
        }
        await httpSendMessage(message);
      } else {
        // WebSocket模式
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          console.error('[VOICE] WebSocket not connected');
          Toast.show({ type: 'error', text1: '连接已断开' });
          return;
        }
        wsRef.current.send(JSON.stringify(message));
      }

      setIsProcessing(true);
    } catch (error) {
      console.error('[VOICE] Failed to send text message:', error);
      Toast.show({ type: 'error', text1: '发送失败' });
    }
  }, [useHttpPolling]);

  // 暴露给外部调用
  useEffect(() => {
    // 可以通过 ref 暴露给其他组件使用
    if (wsRef.current) {
      (wsRef.current as any).sendTextMessage = sendTextMessage;
    }
  }, [sendTextMessage]);

  const handleEndCall = async () => {
    try {

      // 标记为手动断开，不自动重连
      shouldAutoReconnectRef.current = false;

      // 清理重连定时器
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
        connectTimeoutRef.current = null;
      }

      // 清理HTTP轮询定时器
      if (httpPollingIntervalRef.current) {
        clearInterval(httpPollingIntervalRef.current);
        httpPollingIntervalRef.current = null;
      }

      // 停止录音
      if (isRecording) {
        await stopRecording();
      }

      // 停止音频播放
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      // 关闭连接
      if (useHttpPolling) {
        // HTTP长轮询模式：关闭会话
        httpIsConnectedRef.current = false;
        await httpCloseSession();
        httpSessionIdRef.current = null;
      } else {
        // WebSocket模式：关闭WebSocket
        if (wsRef.current) {
          wsRef.current.close(1000); // 正常关闭
        }
      }

      setIsConnected(false);
      setCallStatus('connecting');

      Toast.show({ type: 'success', text1: '通话已结束' });

      // 延迟返回，让Toast显示
      setTimeout(() => {
        router.back();
      }, 500);
    } catch (error) {
      console.error('[VOICE] Failed to end call:', error);
      Toast.show({ type: 'error', text1: '结束通话失败' });
    }
  };

  const handleMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'connection_ready':
      case 'connection_started':
        setCallStatus('listening'); // 连接成功，开始聆听
        break;

      case 'asr_text': {
        const text = message.data.text;
        if (message.data.is_final) {
          setCurrentInterimText('');
          setMessages(prev => [...prev, { role: 'user', content: text }]);
          setCallStatus('thinking'); // 用户说完，开始思考
        } else {
          setCurrentInterimText(text);
          if (callStatus === 'listening') {
            setCallStatus('listening'); // 用户正在说话
          }
        }
        break;
      }

      case 'llm_response': {
        setCallStatus('speaking'); // AI开始回复
        const aiContent = message.data.content;
        setLatestAiMessage(aiContent);
        setMessages(prev => [...prev, { role: 'assistant', content: aiContent }]);
        if (recordMode) {
          saveConversationAsDiary();
        }
        break;
      }

      case 'tts_audio': {
        if (audioBufferRef.current === null) {
          audioBufferRef.current = [];
          setTimeout(() => playCollectedAudio(), 500);
        }
        // WebSocket模式：message.data是base64字符串
        // HTTP长轮询模式：message.audio_data是hex字符串
        let audioData: string;
        if (typeof message.data === 'string') {
          audioData = message.data; // base64
        } else if (typeof message.audio_data === 'string') {
          // hex转base64
          const audioBytes = Buffer.from(message.audio_data, 'hex');
          audioData = audioBytes.toString('base64');
        } else {
          console.error('[VOICE] Invalid audio data format:', message);
          break;
        }
        audioBufferRef.current.push(Buffer.from(audioData, 'base64'));
        break;
      }

      case 'tts_ended':
        if (audioBufferRef.current && audioBufferRef.current.length > 0) {
          playCollectedAudio();
        }
        setCallStatus('listening'); // AI说完了，继续聆听
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
        // 连接成功后自动开始录音（真正的通话模式）
        await startRecording();
        Toast.show({ type: 'success', text1: '通话已连接', text2: '请开始说话' });
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
              {!isConnected ? '正在连接...' :
               callStatus === 'connecting' ? '正在初始化...' :
               callStatus === 'listening' ? '请直接说话...' :
               callStatus === 'thinking' ? 'AI正在思考...' :
               callStatus === 'speaking' ? 'AI正在说话...' :
               '准备就绪'}
            </Text>
          )}
        </View>

        {/* 底部控制栏 */}
        <View style={[styles.footer, { backgroundColor: surface, borderTopColor: `${foreground}05`, borderTopWidth: 1 }]}>
          {/* 状态指示 */}
          <View style={styles.statusContainer}>
            {!isConnected ? (
              <>
                <FontAwesome6 name="spinner" size={20} color={muted} />
                <Text style={[styles.statusText, { color: muted }]}>连接中...</Text>
              </>
            ) : callStatus === 'connecting' ? (
              <>
                <FontAwesome6 name="spinner" size={20} color={accent} />
                <Text style={[styles.statusText, { color: accent }]}>初始化中...</Text>
              </>
            ) : callStatus === 'listening' ? (
              <>
                <FontAwesome6 name="microphone" size={20} color="#10B981" />
                <Text style={[styles.statusText, { color: '#10B981' }]}>聆听中</Text>
              </>
            ) : callStatus === 'thinking' ? (
              <>
                <FontAwesome6 name="brain" size={20} color="#F59E0B" />
                <Text style={[styles.statusText, { color: '#F59E0B' }]}>思考中...</Text>
              </>
            ) : callStatus === 'speaking' ? (
              <>
                <FontAwesome6 name="volume-high" size={20} color={accent} />
                <Text style={[styles.statusText, { color: accent }]}>说话中</Text>
              </>
            ) : null}
          </View>

          {/* 挂断按钮 */}
          <TouchableOpacity
            style={[styles.controlButton, styles.endButton, { backgroundColor: '#EF444420' }]}
            onPress={handleEndCall}
            activeOpacity={0.7}
          >
            <FontAwesome6 name="phone-slash" size={24} color="#EF4444" />
            <Text style={[styles.controlButtonText, { color: '#EF4444' }]}>挂断</Text>
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
});
