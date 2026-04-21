import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useCSSVariable } from 'uniwind';
import RNSSE from 'react-native-sse';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const [background, surface, accent, foreground, muted, border] = useCSSVariable([
    '--color-background',
    '--color-surface',
    '--color-accent',
    '--color-foreground',
    '--color-muted',
    '--color-border',
  ]) as string[];

  const sendMessage = async () => {
    if (!inputText.trim() || loading) return;

    const userMessage = inputText.trim();
    setInputText('');

    // 添加用户消息
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const sse = new RNSSE(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });

      let aiResponse = '';

      sse.addEventListener('message', (event: any) => {
        // 检查是否为流结束信号
        if (event.data === '[DONE]') {
          sse.close();
          setLoading(false);
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
          // JSON 解析失败，可能是纯文本内容
          console.warn('Failed to parse message as JSON:', event.data);
        }
      });

      sse.addEventListener('error', (error) => {
        console.error('SSE error:', error);
        setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，连接出现问题，请稍后再试。' }]);
      });

      // 添加一个空的 AI 消息占位符
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      // SSE 实例创建后自动连接，无需手动调用 connect()
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，发送消息失败，请稍后再试。' }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 当有新消息时滚动到底部
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  useFocusEffect(() => {
    // 页面聚焦时加载历史对话
    setMessages([]);
  });

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

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <View style={[styles.container, { backgroundColor: background }]}>
          <View style={styles.header}>
            <FontAwesome6 name="comments" size={24} color={accent} style={styles.headerIcon} />
            <View>
              <Text style={[styles.title, { color: foreground }]}>AI 陪伴</Text>
              <Text style={[styles.subtitle, { color: muted }]}>温暖倾听，用心陪伴</Text>
            </View>
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
          >
            {messages.length === 0 ? (
              <View style={styles.welcomeContainer}>
                <FontAwesome6 name="heart" size={48} color={accent} style={styles.welcomeIcon} />
                <Text style={[styles.welcomeTitle, { color: foreground }]}>你好！我是你的情绪陪伴助手</Text>
                <Text style={[styles.welcomeText, { color: muted }]}>
                  随时和我聊聊你的心情，我会在这里倾听和陪伴你
                </Text>
                <View style={styles.quickPrompts}>
                  {['今天感觉很累', '有点焦虑', '分享一件开心的事'].map((prompt, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.quickPrompt, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}
                      onPress={() => setInputText(prompt)}
                    >
                      <Text style={[styles.quickPromptText, { color: foreground }]}>{prompt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              messages.map((message, index) => renderMessage(message, index))
            )}
          </ScrollView>

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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    gap: 12,
  },
  headerIcon: {
    width: 32,
    height: 32,
    textAlign: 'center',
    textAlignVertical: 'center',
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
