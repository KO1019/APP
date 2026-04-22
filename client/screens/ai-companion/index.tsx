import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, StyleSheet } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { buildApiUrl } from '@/utils';

interface Message {
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export default function AICompanion() {
  const router = useSafeRouter();
  const params = useSafeSearchParams<{ diaryId?: string }>();
  const { token } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadConversationHistory();
  }, []);

  const loadConversationHistory = async () => {
    try {
      setIsLoadingHistory(true);
      /**
       * 服务端文件：server/src/index.ts
       * 接口：GET /api/v1/conversations
       * Query 参数：diaryId?: string
       */
      const response = await fetch(buildApiUrl('/api/v1/conversations'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.conversations && data.conversations.length > 0) {
          const latestConversation = data.conversations[0];
          setMessages(latestConversation.messages || []);
        }
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    scrollToBottom();
    setIsTyping(true);

    try {
      /**
       * 服务端文件：server/src/index.ts
       * 接口：POST /api/v1/ai-companion/chat
       * Body 参数：message: string, relatedDiaryId?: string, conversationHistory?: Array<{role: string, content: string}>
       */
      const response = await fetch(buildApiUrl('/api/v1/ai-companion/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: content,
          relatedDiaryId: params.diaryId,
          conversationHistory: messages.slice(-10)
        })
      });

      if (response.ok) {
        const data = await response.json();
        const aiMessage: Message = {
          role: 'ai',
          content: data.message,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, aiMessage]);
        scrollToBottom();
      } else {
        throw new Error('请求失败');
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      Alert.alert('错误', 'AI回复失败，请稍后重试');
    } finally {
      setIsTyping(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const startNewConversation = () => {
    Alert.alert(
      '新建对话',
      '确定要开始新的对话吗？当前对话记录将被清空。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: () => {
            setMessages([]);
            router.replace('/ai-companion');
          }
        }
      ]
    );
  };

  return (
    <Screen safeAreaEdges={['top', 'bottom']}>
      <View style={styles.container}>
        {/* 顶部导航栏 */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.navButton}
              activeOpacity={0.6}
            >
              <FontAwesome6 name="arrow-left" size={20} color="#6B7280" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/voice-chat-realtime')}
              style={[styles.navButton, styles.voiceCallButton]}
              activeOpacity={0.7}
            >
              <FontAwesome6 name="phone" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.headerContent}>
            <View style={styles.headerTitleContainer}>
              <FontAwesome6 name="robot" size={24} color="#4F46E5" />
              <Text style={styles.headerTitle}>AI陪伴助手</Text>
            </View>
            {params.diaryId && (
              <View style={styles.headerSubtitle}>
                <FontAwesome6 name="book-open" size={12} color="#9CA3AF" />
                <Text style={styles.headerSubtitleText}>正在分析您的日记...</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={startNewConversation}
            style={styles.newChatButton}
            activeOpacity={0.7}
          >
            <FontAwesome6 name="plus" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* 消息列表 */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && !isLoadingHistory && (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIcon}>
                <FontAwesome6 name="heart-circle-plus" size={64} color="#4F46E5" />
              </View>
              <Text style={styles.emptyStateTitle}>我是您的AI陪伴助手</Text>
              <Text style={styles.emptyStateText}>
                我会认真倾听您的心声，帮助您理解和管理情绪
              </Text>
              <View style={styles.diaryHint}>
                <FontAwesome6 name="book-bookmark" size={16} color="#4F46E5" />
                <Text style={styles.diaryHintText}>
                  我会关注您最近几天的日记，了解您的情绪变化，与您深入交流
                </Text>
              </View>
              <View style={styles.suggestionList}>
                <TouchableOpacity
                  style={styles.suggestionItem}
                  onPress={() => sendMessage('我今天感觉有点低落')}
                  activeOpacity={0.7}
                >
                  <FontAwesome6 name="lightbulb" size={16} color="#4F46E5" />
                  <Text style={styles.suggestionText}>我今天感觉有点低落</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.suggestionItem}
                  onPress={() => sendMessage('我想聊聊最近的压力')}
                  activeOpacity={0.7}
                >
                  <FontAwesome6 name="lightbulb" size={16} color="#4F46E5" />
                  <Text style={styles.suggestionText}>我想聊聊最近的压力</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {messages.map((msg, index) => (
            <View
              key={index}
              style={[
                styles.messageWrapper,
                msg.role === 'user' ? styles.userMessageWrapper : styles.aiMessageWrapper
              ]}
            >
              {msg.role === 'ai' && (
                <View style={styles.avatar}>
                  <FontAwesome6 name="robot" size={20} color="#4F46E5" />
                </View>
              )}
              <View
                style={[
                  styles.messageBubble,
                  msg.role === 'user' ? styles.userMessageBubble : styles.aiMessageBubble
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    msg.role === 'user' ? styles.userMessageText : styles.aiMessageText
                  ]}
                >
                  {msg.content}
                </Text>
              </View>
            </View>
          ))}

          {isTyping && (
            <View style={[styles.messageWrapper, styles.aiMessageWrapper]}>
              <View style={styles.avatar}>
                <FontAwesome6 name="robot" size={20} color="#4F46E5" />
              </View>
              <View style={[styles.messageBubble, styles.aiMessageBubble]}>
                <View style={styles.typingIndicator}>
                  <View style={styles.typingDot} />
                  <View style={styles.typingDot} />
                  <View style={styles.typingDot} />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* 输入区域 */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="说点什么吧..."
                placeholderTextColor="#9CA3AF"
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
                textAlignVertical="top"
              />
              <TouchableOpacity
                onPress={() => sendMessage(inputText)}
                disabled={!inputText.trim() || isTyping}
                style={[
                  styles.sendButton,
                  (!inputText.trim() || isTyping) && styles.sendButtonDisabled
                ]}
                activeOpacity={0.7}
              >
                <FontAwesome6
                  name="paper-plane"
                  size={20}
                  color={!inputText.trim() || isTyping ? '#9CA3AF' : '#FFFFFF'}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.inputHint}>{inputText.length}/500</Text>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voiceCallButton: {
    backgroundColor: '#10B981',
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  headerSubtitleText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  newChatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  messageList: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  messageListContent: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 80,
  },
  emptyStateIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  diaryHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  diaryHintText: {
    flex: 1,
    fontSize: 13,
    color: '#166534',
    lineHeight: 18,
  },
  suggestionList: {
    width: '100%',
    gap: 12,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 16,
    maxWidth: '85%',
  },
  userMessageWrapper: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  aiMessageWrapper: {
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  userMessageBubble: {
    backgroundColor: '#4F46E5',
    borderBottomRightRadius: 6,
  },
  aiMessageBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  aiMessageText: {
    color: '#1F2937',
  },
  typingIndicator: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9CA3AF',
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    minHeight: 36,
    maxHeight: 120,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    marginBottom: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#F3F4F6',
  },
  inputHint: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 6,
  },
});
