import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

interface Message {
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export default function AICompanionScreen() {
  const router = useSafeRouter();
  const params = useSafeSearchParams<{ diaryId?: string }>();
  const { user, token } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const backendUrl = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

  // 加载对话历史
  useEffect(() => {
    loadConversationHistory();
  }, []);

  // 如果是从日记打开的，自动发送第一条消息
  useEffect(() => {
    if (params.diaryId && messages.length === 0) {
      loadDiaryAndInitChat();
    }
  }, [params.diaryId]);

  const loadConversationHistory = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/v1/conversations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const historyMessages: Message[] = data.map((conv: any) => [
          {
            role: 'user' as const,
            content: conv.user_message,
            timestamp: new Date(conv.created_at)
          },
          {
            role: 'ai' as const,
            content: conv.ai_message,
            timestamp: new Date(conv.created_at)
          }
        ]).flat();

        setMessages(historyMessages);
        scrollToBottom();
      }
    } catch (error) {
      console.error('加载对话历史失败:', error);
    }
  };

  const loadDiaryAndInitChat = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/v1/diaries/${params.diaryId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const diary = await response.json();
        const initMessage = `我刚刚写了一篇日记：\n标题：${diary.title}\n心情：${diary.mood}\n内容：${diary.content}\n\n你能帮我分析一下我的情绪状态吗？`;
        await sendMessage(initMessage);
      }
    } catch (error) {
      console.error('加载日记失败:', error);
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isTyping) return;

    const userMessage: Message = {
      role: 'user',
      content,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    scrollToBottom();
    setIsTyping(true);

    try {
      const response = await fetch(`${backendUrl}/api/v1/ai-companion/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: content,
          relatedDiaryId: params.diaryId,
          conversationHistory: messages.slice(-10) // 只发送最近10条作为上下文
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
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-white border-b border-gray-200 px-4 py-3">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <Text className="text-2xl text-gray-600">←</Text>
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-900">AI 陪伴助手</Text>
              {params.diaryId && (
                <Text className="text-sm text-gray-500">正在分析您的日记...</Text>
              )}
            </View>
            <TouchableOpacity
              onPress={startNewConversation}
              className="bg-blue-500 px-3 py-1.5 rounded-lg"
            >
              <Text className="text-white text-sm">新建对话</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-4 py-4"
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && (
            <View className="flex-1 justify-center items-center py-20">
              <FontAwesome6 name="robot" size={64} color="#9CA3AF" />
              <Text className="text-lg text-gray-600 mb-2 mt-4">我是您的AI陪伴助手</Text>
              <Text className="text-sm text-gray-400 text-center px-8">
                我会认真倾听您的心声，帮助您理解和管理情绪
              </Text>
            </View>
          )}

          {messages.map((msg, index) => (
            <View
              key={index}
              className={`mb-4 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <View
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white rounded-br-md'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
                }`}
              >
                <Text className={`text-sm ${msg.role === 'user' ? 'text-white' : 'text-gray-800'}`}>
                  {msg.content}
                </Text>
              </View>
              <Text className="text-xs text-gray-400 mt-1">
                {msg.timestamp.toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </View>
          ))}

          {isTyping && (
            <View className="mb-4 items-start">
              <View className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3">
                <Text className="text-gray-400">正在输入...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View className="bg-white border-t border-gray-200 px-4 py-3">
          <View className="flex-row items-end bg-gray-100 rounded-2xl px-4 py-2">
            <TextInput
              className="flex-1 text-base text-gray-900 max-h-32"
              placeholder="说点什么吧..."
              value={inputText}
              onChangeText={setInputText}
              multiline
              textAlignVertical="top"
            />
            <TouchableOpacity
              onPress={() => sendMessage(inputText)}
              disabled={!inputText.trim() || isTyping}
              className={`ml-2 w-10 h-10 rounded-full items-center justify-center ${
                inputText.trim() && !isTyping ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            >
              <Text className="text-white font-bold">↑</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Screen>
  );
}
