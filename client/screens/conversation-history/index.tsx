import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useCSSVariable } from 'uniwind';
import { useSafeRouter } from '@/hooks/useSafeRouter';

interface Conversation {
  id: string;
  user_message: string;
  ai_message: string;
  created_at: string;
}

export default function ConversationHistoryScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const router = useSafeRouter();

  const [background, surface, accent, foreground, muted, border] = useCSSVariable([
    '--color-background',
    '--color-surface',
    '--color-accent',
    '--color-foreground',
    '--color-muted',
    '--color-border',
  ]) as string[];

  const fetchConversations = async () => {
    try {
      setLoading(true);
      /**
       * 服务端文件：server/src/index.ts
       * 接口：GET /api/v1/conversations
       * Query 参数：diaryId?: string
       */
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/conversations`);
      const data = await response.json();
      setConversations(data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [])
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;

    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const handleConversationPress = (conversation: Conversation) => {
    // 跳转到聊天页面，并传递对话历史
    router.replace('/chat', { initialMessage: conversation.user_message });
  };

  if (loading) {
    return (
      <Screen>
        <View style={[styles.container, { backgroundColor: background }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: foreground }]}>对话历史</Text>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={accent} />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={[styles.container, { backgroundColor: background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: foreground }]}>对话历史</Text>
          <Text style={[styles.subtitle, { color: muted }]}>查看你的聊天记录</Text>
        </View>

        {conversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome6 name="comments" size={64} color={muted} style={styles.emptyIcon} />
            <Text style={[styles.emptyTitle, { color: foreground }]}>还没有对话记录</Text>
            <Text style={[styles.emptyText, { color: muted }]}>
              和AI陪伴助手聊聊天，开始记录你的对话吧
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.listContainer}>
            {conversations.map((conversation) => (
              <TouchableOpacity
                key={conversation.id}
                style={[styles.conversationItem, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}
                onPress={() => handleConversationPress(conversation)}
                activeOpacity={0.7}
              >
                <View style={styles.conversationHeader}>
                  <View style={[styles.avatarContainer, { backgroundColor: `${accent}20` }]}>
                    <FontAwesome6 name="user" size={16} color={accent} />
                  </View>
                  <Text style={[styles.conversationTime, { color: muted }]}>
                    {formatDate(conversation.created_at)}
                  </Text>
                </View>
                <Text
                  style={[styles.userMessage, { color: foreground }]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {conversation.user_message}
                </Text>
                <View style={[styles.divider, { backgroundColor: border }]} />
                <View style={styles.aiMessageContainer}>
                  <FontAwesome6 name="robot" size={14} color={accent} style={styles.aiIcon} />
                  <Text
                    style={[styles.aiMessage, { color: foreground }]}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {conversation.ai_message}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            <View style={{ height: 100 }} />
          </ScrollView>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  conversationItem: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  conversationTime: {
    fontSize: 12,
    flex: 1,
  },
  userMessage: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  aiMessageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  aiIcon: {
    marginTop: 2,
    marginRight: 8,
  },
  aiMessage: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
});
