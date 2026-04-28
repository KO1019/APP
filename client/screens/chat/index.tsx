import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useCSSVariable } from 'uniwind';
import RNSSE from 'react-native-sse';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';
import { buildApiUrl } from '@/utils';
import {
  saveChatMessageLocally,
  generateLocalId,
  getLocalChatMessage,
  getLocalDiaryById,
  saveConversationLocally,
  getLocalConversation,
} from '@/utils/localStorage';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Conversation {
  id: string;
  user_message: string;
  ai_message: string;
  created_at: string;
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
  const [apiConfigured, setApiConfigured] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [recentConversations, setRecentConversations] = useState<Conversation[]>([]);

  const router = useSafeRouter();
  const { token, isOfflineMode, user } = useAuth();
  const params = useSafeSearchParams<{ initialMessage: string; conversationId: string; relatedDiaryId: string }>();

  // 保存当前的conversationId，用于本地存储
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(params.conversationId || null);

  // 加载特定对话的历史记录
  useEffect(() => {
    const loadConversation = async () => {
      if (!params.conversationId) {
        return;
      }

      // 判断是否为本地ID（以local_开头）
      const isLocalId = params.conversationId.startsWith('local_');

      // 优先从本地存储加载完整对话
      try {
        const localConversation = await getLocalConversation(params.conversationId);
        if (localConversation) {
          setMessages(localConversation.messages || []);
          setCurrentConversationId(params.conversationId);
          return;
        }
      } catch (error) {
        console.error('Error loading conversation from local storage:', error);
      }

      if (!isLocalId && token) {
        try {
          const response = await fetch(buildApiUrl(`/api/v1/conversations/${params.conversationId}`), {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
	          // 兼容新旧格式
	          if (data.messages && Array.isArray(data.messages)) {
	            // 新格式：完整的消息数组
	            setMessages(data.messages);
	          } else if (data.user_message && data.ai_message) {
	            // 旧格式：单条消息
	            setMessages([
	              { role: 'user', content: data.user_message },
	              { role: 'assistant', content: data.ai_message },
	            ]);
	          }
            setCurrentConversationId(params.conversationId);
        } catch (error) {
          console.error('Error loading conversation from local storage:', error);
        }
      }
    };

    loadConversation();
  }, [params.conversationId, token]);

  const [background, surface, accent, foreground, muted, border] = useCSSVariable([
    '--color-background',
    '--color-surface',
    '--color-accent',
    '--color-foreground',
    '--color-muted',
    '--color-border',
  ]) as string[];

  const fetchSuggestedTopics = useCallback(async () => {
    try {
      // 检查是否已登录
      if (!token) {
        setSuggestedTopics([]);
        return;
      }

      /**
       * 服务端文件：server/src/index.ts
       * 接口：GET /api/v1/chat/topics
       * Headers: Authorization: Bearer {token}
       */
      const response = await fetch(buildApiUrl('/api/v1/chat/topics'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.warn(`fetchSuggestedTopics: HTTP ${response.status}, using empty array`);
        setSuggestedTopics([]);
        return;
      }

      const data = await response.json();
      setSuggestedTopics(data.topics || []);
    } catch (error) {
      console.error('Error fetching suggested topics:', error);
      setSuggestedTopics([]);
    }
  }, [token]);

  const fetchRecentConversations = useCallback(async () => {
    try {
      // 离线模式或未登录，不获取云端对话
      if (!token || isOfflineMode) {
        setRecentConversations([]);
        return;
      }

      /**
       * 服务端文件：server/main.py
       * 接口：GET /api/v1/conversations
       * Query 参数：limit?: number
       * Headers: Authorization: Bearer {token}
       */
      const response = await fetch(buildApiUrl('/api/v1/conversations?limit=2'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // 只取最近2条对话
        setRecentConversations(data.slice(0, 2));
      } else {
        setRecentConversations([]);
      }
    } catch (error) {
      console.error('Error fetching recent conversations:', error);
      setRecentConversations([]);
    }
  }, [token, isOfflineMode]);

  // 获取日记上下文内容
  const fetchDiaryContext = useCallback(async (diaryId: string | undefined): Promise<string | null> => {
    if (!diaryId) return null;

    try {
      // 先尝试从本地获取
      const localDiary = await getLocalDiaryById(diaryId);
      if (localDiary && localDiary.content) {
        return localDiary.content;
      }

      // 如果本地没有且已登录，尝试从云端获取
      if (token && !isOfflineMode) {
        const response = await fetch(buildApiUrl(`/api/v1/diaries/${diaryId}`), {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.content) {
            return data.content;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching diary context:', error);
    }

    return null;
  }, [token, isOfflineMode]);

  const sendMessage = async () => {
    if (!inputText.trim() || loading) {
      return;
    }

    const userMessage = inputText.trim();
    setInputText('');

    // 添加用户消息
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    // 生成或使用现有的conversationId
    const conversationId = currentConversationId || generateLocalId();
    setCurrentConversationId(conversationId);

    try {
      // AI功能只需要检查：用户已登录且不是离线模式
      if (!isOfflineMode && token) {
        const chatUrl = buildApiUrl('/api/v1/chat');

        // 获取日记上下文
        const diaryContext = await fetchDiaryContext(params.relatedDiaryId);

        // 在Web环境下，使用fetch API实现流式响应
        if (Platform.OS === 'web') {

          // 先添加一个空的 AI 消息占位符
          setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

          fetch(chatUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              message: userMessage,
              conversationId: params.conversationId || conversationId,
              diaryContext: diaryContext,
              conversationHistory: messages.map(m => ({ role: m.role, content: m.content })),
            }),
          }).then(async (response) => {

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let aiResponse = '';

            if (!reader) {
              throw new Error('No response body');
            }

            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                setLoading(false);
                saveChatMessageLocally(conversationId, userMessage, aiResponse, params.relatedDiaryId || null, true);
                break;
              }

              const chunk = decoder.decode(value);

              // 解析SSE格式
              const lines = chunk.split('\n');
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') {
                    setLoading(false);
                    // 保存完整对话
                    await saveConversationLocally(
                      conversationId,
                      [...messages, { role: 'assistant', content: aiResponse }],
                      diaryContext,
                      params.relatedDiaryId || null
                    );
                    return;
                  }

                  try {
                    const parsed = JSON.parse(data);
                    if (parsed.content) {
                      aiResponse += parsed.content;
                      setMessages(prev => {
                        const newMessages = [...prev];
                        const lastMessage = newMessages[newMessages.length - 1];
                        if (lastMessage && lastMessage.role === 'assistant') {
                          lastMessage.content = aiResponse;
                        }
                        return newMessages;
                      });
                    }
                  } catch (e) {
                    console.warn('[Chat] Failed to parse SSE data:', data);
                  }
                }
              }
            }
          }).catch((error) => {
            console.error('[Chat] Streaming error:', error);
            setLoading(false);
            setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，连接出现问题，请稍后再试。' }]);
          });
        } else {
          // 在移动端使用 RNSSE

          // 先添加一个空的 AI 消息占位符
          setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

          const sse = new RNSSE(chatUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              message: userMessage,
              conversationId: params.conversationId || conversationId,
              diaryContext: diaryContext,
              conversationHistory: messages.map(m => ({ role: m.role, content: m.content })),
            }),
          });

          let aiResponse = '';

          // 监听连接打开事件
          sse.addEventListener('open', () => {
          });

          // 监听错误事件
          sse.addEventListener('error', (error: any) => {
            console.error('[Chat] SSE error:', error);
            setLoading(false);
            setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，连接出现问题，请稍后再试。' }]);
          });

          sse.addEventListener('message', (event: any) => {

            // 检查是否为流结束信号
            if (event.data === '[DONE]') {
              sse.close();
              setLoading(false);
              // 保存完整对话
              await saveConversationLocally(
                conversationId,
                [...messages, { role: 'assistant', content: aiResponse }],
                diaryContext,
                params.relatedDiaryId || null
              );
              return;
            }

            // 尝试解析 JSON
            try {
              const data = JSON.parse(event.data);
              if (data.content) {
                aiResponse += data.content;
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  if (lastMessage && lastMessage.role === 'assistant') {
                    lastMessage.content = aiResponse;
                  } else {
                    newMessages.push({ role: 'assistant', content: aiResponse });
                  }
                  return newMessages;
                });
              }

              if (data.error) {
                console.error('Chat error:', data.error);
                setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，我遇到了一些问题，请稍后再试。' }]);
              }
            } catch (e) {
              console.warn('[Chat] Failed to parse message as JSON:', event.data);
            }
          });
        }
      } else {
        // 离线模式或未登录，只保存到本地
        if (isOfflineMode) {
          setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，当前为离线模式，无法连接AI。' }]);
        } else {
          setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，请先登录后再使用AI功能。' }]);
        }
        saveChatMessageLocally(conversationId, userMessage, '离线模式，无法使用AI功能', params.relatedDiaryId || null, false);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，发送消息失败，请稍后再试。' }]);
    } finally {
      setLoading(false);
    }
  };

  // 保存对话为日记
  const handleSaveConversationAsDiary = async () => {

    if (!token) {
      Alert.alert('提示', '请先登录');
      return;
    }

    if (messages.length === 0) {
      Alert.alert('提示', '暂无对话记录');
      return;
    }

    try {
      setLoading(true);

      // 将对话记录转换为文本
      const conversationText = messages
        .map((msg, index) => {
          const role = msg.role === 'user' ? '我' : 'AI';
          return `${role}: ${msg.content}`;
        })
        .join('\n\n');


      const url = buildApiUrl('/api/v1/diaries/generate-from-chat');

      /**
       * 服务端文件：server/main.py
       * 接口：POST /api/v1/diaries/generate-from-chat
       * Body 参数：conversation: string
       */
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversation: conversationText,
        }),
      });


      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Chat] Error response:', errorData);
        throw new Error(errorData.detail || '生成日记失败');
      }

      const data = await response.json();

      Alert.alert(
        '成功',
        '日记已生成',
        [
          { text: '查看日记', onPress: () => router.push(`/diary-detail?id=${data.id}`) },
          { text: '返回聊天', onPress: () => {} },
        ]
      );
    } catch (error) {
      console.error('[Chat] Error generating diary:', error);
      Alert.alert('错误', '生成日记失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 当有新消息时滚动到底部
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  useFocusEffect(
    useCallback(() => {
      // 当有关联日记ID时，自动发送初始消息让AI分析日记
      const initChatWithDiary = async () => {
        if (params.relatedDiaryId && messages.length === 0 && !params.conversationId) {
          const initMessage = '请分析我刚刚写的这篇日记';
          setMessages([{ role: 'user', content: initMessage }]);
          setLoading(true);

          const headers: HeadersInit = { 'Content-Type': 'application/json' };
          const token = await AsyncStorage.getItem('authToken');
          if (token) headers['Authorization'] = `Bearer ${token}`;

          const sse = new RNSSE(buildApiUrl('/api/v1/chat'), {
            method: 'POST',
            headers,
            body: JSON.stringify({
              message: initMessage,
              conversationId: null,
              diaryId: params.relatedDiaryId ? await fetchDiaryContext(params.relatedDiaryId) : null,
              conversationHistory: [],
            }),
          });

          let aiResponse = '';
          sse.addEventListener('message', (event) => {
            if (event.data === '[DONE]') {
              sse.close();
              setLoading(false);
            } else {
              try {
                const data = JSON.parse(event.data);
                if (data.content) {
                  aiResponse += data.content;
                  setMessages(prev => [
                    ...prev.slice(0, -1),
                    { role: 'assistant', content: aiResponse }
                  ]);
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e);
              }
            }
          });

          sse.addEventListener('error', (error) => {
            console.error('SSE error:', error);
            sse.close();
            setLoading(false);
          });
        } else if (messages.length === 0 && !params.conversationId) {
          // 只有在没有消息且没有对话ID且没有关联日记时才加载空状态数据
          fetchSuggestedTopics();
          fetchRecentConversations();
        }
      };

      initChatWithDiary();
    }, [messages.length, params.conversationId, params.relatedDiaryId, fetchSuggestedTopics, fetchRecentConversations])
  );

  const renderMessage = (message: Message, index: number) => {
    const isUser = message.role === 'user';

    return (
      <View
        key={index}
        style={[
          styles.messageContainer,
          isUser ? styles.userMessage : styles.assistantMessage,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isUser
              ? { backgroundColor: accent }
              : { backgroundColor: surface, borderColor: border, borderWidth: 1 },
          ]}
        >
          {!isUser && (
            <FontAwesome6 name="robot" size={16} color={accent} style={styles.messageIcon} />
          )}
          <Text
            style={[
              styles.messageText,
              isUser ? { color: '#FFFFFF' } : { color: foreground },
            ]}
          >
            {message.content || <Text style={{ color: muted }}>正在输入...</Text>}
          </Text>
        </View>
      </View>
    );
  };

  const handleNewChat = () => {
    if (messages.length > 0) {
      Alert.alert(
        '新建对话',
        '确定要开始新的对话吗？当前对话记录将被清空。',
        [
          { text: '取消', style: 'cancel' },
          {
            text: '确定',
            onPress: () => {
              setMessages([]);
              setInputText('');
              fetchSuggestedTopics();
              fetchRecentConversations();
            }
          }
        ]
      );
    } else {
      // 如果没有消息，直接重新加载空状态
      fetchSuggestedTopics();
      fetchRecentConversations();
    }
  };

  const handleBackToHome = () => {
    // 清空消息并重新加载空状态
    setMessages([]);
    setInputText('');
    fetchSuggestedTopics();
    fetchRecentConversations();
    // 清除 URL 参数
    router.replace('/chat');
  };

  const handleViewHistory = () => {
    router.push('/conversation-history');
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <View style={[styles.container, { backgroundColor: background }]}>
          <View style={styles.header}>
          <View style={styles.headerLeft}>
            {(messages.length > 0 || params.conversationId) && (
              <TouchableOpacity onPress={handleBackToHome} style={styles.backButton}>
                <FontAwesome6 name="arrow-left" size={24} color={foreground} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.headerCenter}>
            <FontAwesome6 name="comments" size={24} color={accent} style={styles.headerIcon} />
            <View>
              <Text style={[styles.title, { color: foreground }]}>AI 陪伴</Text>
              <Text style={[styles.subtitle, { color: muted }]}>温暖倾听，用心陪伴</Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity onPress={handleNewChat} style={styles.headerButton}>
              <FontAwesome6 name="plus" size={20} color={foreground} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleViewHistory} style={styles.headerButton}>
              <FontAwesome6 name="clock-rotate-left" size={20} color={foreground} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/voice-chat-realtime')} style={styles.voiceButton}>
              <FontAwesome6 name="microphone" size={20} color={foreground} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
        >
            {!apiConfigured && (
              <View style={[styles.configWarning, { backgroundColor: '#FFF3CD', borderColor: '#FFC107', borderWidth: 1 }]}>
                <FontAwesome6 name="triangle-exclamation" size={16} color="#856404" />
                <Text style={[styles.configWarningText, { color: '#856404' }]}>
                  AI 功能需要配置 API Key 才能使用
                </Text>
              </View>
            )}
            {messages.length === 0 ? (
              <View style={styles.welcomeContainer}>
                <FontAwesome6 name="heart" size={48} color={accent} style={styles.welcomeIcon} />
                <Text style={[styles.welcomeTitle, { color: foreground }]}>你好！我是你的情绪陪伴助手</Text>
                <Text style={[styles.welcomeText, { color: muted }]}>
                  随时和我聊聊你的心情，我会在这里倾听和陪伴你
                </Text>

                {/* 显示最近的历史对话 */}
                {recentConversations.length > 0 && (
                  <View style={styles.recentConversations}>
                    <Text style={[styles.sectionTitle, { color: muted }]}>最近对话</Text>
                    {recentConversations.map((conv) => (
                      <TouchableOpacity
                        key={conv.id}
                        style={[styles.conversationCard, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}
                        onPress={() => router.push('/chat', { conversationId: conv.id })}
                      >
                        <Text style={[styles.conversationUserMsg, { color: foreground }]} numberOfLines={1}>
                          {conv.user_message}
                        </Text>
                        <Text style={[styles.conversationAiMsg, { color: muted }]} numberOfLines={2}>
                          {conv.ai_message}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* AI主动提问 */}
                <View style={styles.quickPrompts}>
                  <Text style={[styles.sectionTitle, { color: muted }]}>AI 主动询问</Text>
                  {suggestedTopics.length > 0 ? (
                    suggestedTopics.map((prompt, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[styles.quickPrompt, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}
                        onPress={() => {
                          // 添加AI的消息
                          setMessages([{ role: 'assistant', content: prompt }]);
                        }}
                      >
                        <Text style={[styles.quickPromptText, { color: foreground }]}>{prompt}</Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    // 默认AI提问
                    ['今天感觉怎么样？', '最近有什么想和我分享的吗？', '有什么我可以帮助你的吗？'].map((prompt, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[styles.quickPrompt, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}
                        onPress={() => {
                          // 添加AI的消息
                          setMessages([{ role: 'assistant', content: prompt }]);
                        }}
                      >
                        <Text style={[styles.quickPromptText, { color: foreground }]}>{prompt}</Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              </View>
            ) : (
              messages.map((message, index) => renderMessage(message, index))
            )}
          </ScrollView>

          {/* 保存为日记按钮 */}
          {messages.length > 0 && (
            <TouchableOpacity
              style={[styles.saveDiaryButton, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}
              onPress={() => {
                Alert.alert(
                  '保存为日记',
                  '确定要将本次对话记录生成日记吗？',
                  [
                    { text: '取消', style: 'cancel' },
                    {
                      text: '确定',
                      onPress: () => handleSaveConversationAsDiary(),
                    },
                  ]
                );
              }}
              activeOpacity={0.7}
            >
              <FontAwesome6 name="book-journal-whills" size={16} color={accent} />
              <Text style={[styles.saveDiaryButtonText, { color: foreground }]}>保存为日记</Text>
            </TouchableOpacity>
          )}

          <View style={[styles.inputContainer, { backgroundColor: surface, borderTopColor: border, borderTopWidth: 1 }]}>
            <TextInput
              style={[styles.input, { color: foreground, backgroundColor: background, borderColor: border, borderWidth: 1 }]}
              placeholder="和我说说你的心情..."
              placeholderTextColor={muted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                { backgroundColor: accent, opacity: (!inputText.trim() || loading) ? 0.5 : 1 }
              ]}
              onPress={sendMessage}
              disabled={!inputText.trim() || loading}
            >
              <FontAwesome6 name="paper-plane" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  headerLeft: {
    width: 40,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 32,
    height: 32,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    paddingBottom: 100,
  },
  configWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 8,
  },
  configWarningText: {
    fontSize: 13,
    flex: 1,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  welcomeIcon: {
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  recentConversations: {
    width: '100%',
    gap: 8,
    marginBottom: 24,
  },
  conversationCard: {
    padding: 16,
    borderRadius: 12,
    gap: 6,
  },
  conversationUserMsg: {
    fontSize: 15,
    fontWeight: '600',
  },
  conversationAiMsg: {
    fontSize: 13,
  },
  quickPrompts: {
    width: '100%',
    gap: 8,
  },
  quickPrompt: {
    padding: 12,
    borderRadius: 12,
  },
  quickPromptText: {
    fontSize: 14,
    textAlign: 'center',
  },
  messageContainer: {
    width: '100%',
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  assistantMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
  },
  messageIcon: {
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  saveDiaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    gap: 8,
  },
  saveDiaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    gap: 12,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
