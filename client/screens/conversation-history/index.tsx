import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useCSSVariable } from 'uniwind';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';
import { buildApiUrl } from '@/utils';
import {
  getLocalChatMessages,
  deleteLocalChatMessage,
} from '@/utils/localStorage';

interface Conversation {
  id: string;
  user_message: string;
  ai_message: string;
  related_diary_id: string | null;
  created_at: string;
  user_id: string;
  is_uploaded?: boolean; // 标记是否已上传到云端
}

export default function ConversationHistoryScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const router = useSafeRouter();
  const { token, isOfflineMode, user, logout } = useAuth();

  const [background, surface, accent, foreground, muted, border] = useCSSVariable([
    '--color-background',
    '--color-surface',
    '--color-accent',
    '--color-foreground',
    '--color-muted',
    '--color-border',
  ]) as string[];

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);

      // 检查是否已登录
      if (!token) {
        setLoading(false);
        return;
      }

      // 1. 先从本地加载聊天记录
      const localConversations = await getLocalChatMessages();

      // 2. 如果是在线模式且用户开启了云端同步，从云端加载并合并
      if (!isOfflineMode && user?.cloud_sync_enabled) {
        try {
          /**
           * 服务端文件：server/src/index.ts
           * 接口：GET /api/v1/conversations
           * Query 参数：diaryId?: string
           * Headers: Authorization: Bearer {token}
           */
          const response = await fetch(buildApiUrl('/api/v1/conversations'), {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            // 处理 401 或 403 错误，自动登出
            if (response.status === 401 || response.status === 403) {
              console.error('Token invalid, logging out');
              logout();
              router.replace('/login');
              return;
            }

            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();

          // 确保返回的是数组
          if (Array.isArray(data)) {
            // 标记云端数据为已上传，并转换类型
            const cloudConversations: Conversation[] = data.map((conv: any) => ({
              id: conv.id,
              user_message: conv.user_message,
              ai_message: conv.ai_message,
              related_diary_id: conv.related_diary_id || null,
              created_at: conv.created_at,
              user_id: conv.user_id || user?.id || '',
              is_uploaded: true,
            }));

            // 将本地数据转换为Conversation类型
            const localConversationsConverted: Conversation[] = localConversations.map((conv: any) => ({
              id: conv.id,
              user_message: conv.user_message,
              ai_message: conv.ai_message,
              related_diary_id: conv.related_diary_id || null,
              created_at: conv.created_at,
              user_id: user?.id || '', // 使用当前用户的ID
              is_uploaded: conv.is_uploaded || false,
            }));

            // 合并本地和云端数据，去重（以云端数据为准）
            const mergedConversations = [...localConversationsConverted];

            // 将云端数据合并到本地
            cloudConversations.forEach((cloudConv: Conversation) => {
              const existingIndex = mergedConversations.findIndex(c => c.id === cloudConv.id);
              if (existingIndex >= 0) {
                mergedConversations[existingIndex] = cloudConv;
              } else {
                mergedConversations.push(cloudConv);
              }
            });

            setConversations(mergedConversations);
          } else {
            console.error('Unexpected response format:', data);
            // 将本地数据转换为Conversation类型
            const localConversationsConverted: Conversation[] = localConversations.map((conv: any) => ({
              id: conv.id,
              user_message: conv.user_message,
              ai_message: conv.ai_message,
              related_diary_id: conv.related_diary_id || null,
              created_at: conv.created_at,
              user_id: user?.id || '',
              is_uploaded: conv.is_uploaded || false,
            }));
            setConversations(localConversationsConverted);
          }
        } catch (error) {
          console.error('Error fetching cloud conversations:', error);
          // 网络错误时，只显示本地数据
          // 将本地数据转换为Conversation类型
          const localConversationsConverted: Conversation[] = localConversations.map((conv: any) => ({
            id: conv.id,
            user_message: conv.user_message,
            ai_message: conv.ai_message,
            related_diary_id: conv.related_diary_id || null,
            created_at: conv.created_at,
            user_id: user?.id || '',
            is_uploaded: conv.is_uploaded || false,
          }));
          setConversations(localConversationsConverted);
          if (!isOfflineMode) {
            Alert.alert('提示', '无法连接到云端，显示本地数据');
          }
        }
      } else {
        // 离线模式或未开启云端同步，只显示本地数据
        // 将本地数据转换为Conversation类型
        const localConversationsConverted: Conversation[] = localConversations.map((conv: any) => ({
          id: conv.id,
          user_message: conv.user_message,
          ai_message: conv.ai_message,
          related_diary_id: conv.related_diary_id || null,
          created_at: conv.created_at,
          user_id: user?.id || '',
          is_uploaded: conv.is_uploaded || false,
        }));
        setConversations(localConversationsConverted);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [token, isOfflineMode, user?.cloud_sync_enabled]);

  const handleDeleteConversation = useCallback(async (conversationId: string) => {
    console.log('Delete button clicked, conversationId:', conversationId);

    // Web 环境使用 window.confirm，移动端使用 Alert.alert
    const confirmDelete = () => {
      return new Promise<boolean>((resolve) => {
        if (Platform.OS === 'web') {
          const result = window.confirm('确定要删除这条对话记录吗？此操作不可恢复。');
          resolve(result);
        } else {
          Alert.alert(
            '删除对话',
            '确定要删除这条对话记录吗？此操作不可恢复。',
            [
              { text: '取消', style: 'cancel', onPress: () => resolve(false) },
              { text: '删除', style: 'destructive', onPress: () => resolve(true) },
            ],
            { cancelable: true }
          );
        }
      });
    };

    const confirmed = await confirmDelete();
    if (!confirmed) {
      console.log('Delete cancelled');
      return;
    }

    console.log('Starting delete request for conversationId:', conversationId);
    try {
      // 1. 先删除本地数据
      await deleteLocalChatMessage(conversationId);

      // 2. 如果开启了云端同步且是在线模式，同时删除云端数据
      if (user?.cloud_sync_enabled && !isOfflineMode && token) {
        try {
          /**
           * 服务端文件：server/main.py
           * 接口：DELETE /api/v1/conversations/:id
           * Path 参数：id: string
           * Headers: Authorization: Bearer {token}
           */
          const response = await fetch(buildApiUrl(`/api/v1/conversations/${conversationId}`), {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          console.log('Delete response status:', response.status);

          if (!response.ok) {
            // 云端删除失败，但本地已经删除，提示用户
            console.warn('Cloud delete failed, but local data removed');
            if (Platform.OS === 'web') {
              window.alert('本地数据已删除，云端同步失败');
            } else {
              Alert.alert('部分成功', '本地数据已删除，云端同步失败');
            }
          }
        } catch (error) {
          console.error('Error deleting cloud conversation:', error);
          // 云端删除失败，但本地已经删除，提示用户
          if (Platform.OS === 'web') {
            window.alert('本地数据已删除，云端同步失败');
          } else {
            Alert.alert('部分成功', '本地数据已删除，云端同步失败');
          }
        }
      }

      // 刷新列表
      if (Platform.OS === 'web') {
        window.alert('对话已删除');
      } else {
        Alert.alert('成功', '对话已删除');
      }
      fetchConversations();
    } catch (error) {
      console.error('Error deleting conversation:', error);
      if (Platform.OS === 'web') {
        window.alert('错误：删除失败，请稍后重试');
      } else {
        Alert.alert('错误', '删除失败，请稍后重试');
      }
    }
  }, [token, isOfflineMode, user?.cloud_sync_enabled, fetchConversations]);

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [fetchConversations])
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
    // 跳转到聊天页面，并传递对话ID以便加载完整历史
    router.push('/chat', { conversationId: conversation.id });
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
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <FontAwesome6 name="arrow-left" size={24} color={foreground} />
            </TouchableOpacity>
          </View>
          <View style={styles.headerCenter}>
            <FontAwesome6 name="clock-rotate-left" size={24} color={accent} style={styles.headerIcon} />
            <View>
              <Text style={[styles.title, { color: foreground }]}>对话历史</Text>
              <Text style={[styles.subtitle, { color: muted }]}>查看你的聊天记录</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => router.replace('/chat')} style={styles.newChatButton}>
              <FontAwesome6 name="plus" size={20} color={foreground} />
            </TouchableOpacity>
          </View>
        </View>

        {conversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome6 name="comments" size={64} color={muted} style={styles.emptyIcon} />
            <Text style={[styles.emptyTitle, { color: foreground }]}>还没有对话记录</Text>
            <Text style={[styles.emptyText, { color: muted }]}>
              和AI陪伴助手聊聊天，开始记录你的对话吧
            </Text>
            <View style={styles.tipsContainer}>
              <FontAwesome6 name="lightbulb" size={16} color={accent} style={styles.tipsIcon} />
              <Text style={[styles.tipsText, { color: muted }]}>
                小提示：在日记详情页点击&ldquo;与AI聊聊&rdquo;，可以围绕日记内容进行对话
              </Text>
            </View>
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
                  <Text style={[styles.conversationTime, { color: muted }]} numberOfLines={1}>
                    {formatDate(conversation.created_at)}
                  </Text>
                  <View style={styles.spacer} />
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      console.log('Delete button pressed for conversation:', conversation.id);
                      handleDeleteConversation(conversation.id);
                    }}
                    activeOpacity={0.6}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <FontAwesome6 name="trash-can" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
                <Text
                  style={[styles.userMessage, { color: foreground }]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {conversation.user_message}
                </Text>
                <View style={[styles.divider, { backgroundColor: border }]} />
                {conversation.ai_message ? (
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
                ) : (
                  <View style={styles.emptyMessageContainer}>
                    <Text style={[styles.emptyMessageText, { color: muted }]}>AI正在思考中...</Text>
                  </View>
                )}
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
    width: 40,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    marginRight: 8,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newChatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
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
    marginBottom: 24,
  },
  tipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 12,
  },
  tipsIcon: {
    marginRight: 8,
  },
  tipsText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
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
    flex: 0,
  },
  spacer: {
    flex: 1,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)', // 红色背景，方便调试
    zIndex: 10, // 确保在最上层
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
  emptyMessageContainer: {
    paddingVertical: 4,
  },
  emptyMessageText: {
    fontSize: 13,
    fontStyle: 'italic',
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
