import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';
import { usePassword } from '@/contexts/PasswordContext';
import { useCSSVariable } from 'uniwind';
import Toast from 'react-native-toast-message';
import { buildApiUrl } from '@/utils';
import {
  getLocalDiaries,
  getLocalChatMessages,
  markDiaryAsUploaded,
  markChatMessageAsUploaded,
} from '@/utils/localStorage';

interface MenuItem {
  icon: string;
  title: string;
  subtitle?: string;
  action?: () => void;
}

export default function ProfileScreen() {
  const router = useSafeRouter();
  const { user, token, isOfflineMode, toggleOfflineMode, logout } = useAuth();
  const {
    hasPassword,
    canUseBiometric,
    biometricEnabled,
    enableBiometric,
    disableBiometric,
    exportAllData,
    deleteAllData,
  } = usePassword();

  const [showHealthTips, setShowHealthTips] = useState(false);
  const [healthTips, setHealthTips] = useState<any>(null);
  const [loadingTips, setLoadingTips] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [background, surface, accent, foreground, muted, border] = useCSSVariable([
    '--color-background',
    '--color-surface',
    '--color-accent',
    '--color-foreground',
    '--color-muted',
    '--color-border',
  ]) as string[];

  const syncToCloud = async () => {
    if (!token || !user) {
      Toast.show({ type: 'error', text1: '请先登录' });
      return;
    }

    if (!user.cloud_sync_enabled) {
      Toast.show({ type: 'error', text1: '请先在隐私设置中开启云端同步' });
      return;
    }

    if (isOfflineMode) {
      Toast.show({ type: 'error', text1: '请先关闭离线模式' });
      return;
    }

    setSyncing(true);

    try {
      // 获取本地未同步的日记
      const localDiaries = await getLocalDiaries();
      const unsyncedDiaries = localDiaries.filter((d: any) => !d.is_uploaded);

      // 上传未同步的日记
      for (const diary of unsyncedDiaries) {
        try {
          /**
           * 服务端文件：server/main.py
           * 接口：POST /api/v1/diaries
           * Body 参数：title: string, content: string, mood: string, tags: string[]
           */
          await fetch(buildApiUrl('/api/v1/diaries'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              title: diary.title,
              content: diary.content,
              mood: diary.mood || 'neutral',
              tags: diary.tags || [],
            }),
          });

          // 标记为已上传
          await markDiaryAsUploaded(diary.id);
        } catch (error) {
          console.error('Failed to upload diary:', diary.id, error);
        }
      }

      // 获取本地未同步的聊天记录
      const localChats = await getLocalChatMessages();
      const unsyncedChats = localChats.filter((c: any) => !c.is_uploaded);

      // 上传未同步的聊天记录
      for (const chat of unsyncedChats) {
        try {
          /**
           * 服务端文件：server/main.py
           * 接口：POST /api/v1/conversations
           * Body 参数：user_message: string, ai_message: string, related_diary_id?: string
           */
          await fetch(buildApiUrl('/api/v1/conversations'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              user_message: chat.user_message,
              ai_message: chat.ai_message,
              related_diary_id: chat.related_diary_id,
            }),
          });

          // 标记为已上传
          await markChatMessageAsUploaded(chat.id);
        } catch (error) {
          console.error('Failed to upload chat:', chat.id, error);
        }
      }

      const totalUploaded = unsyncedDiaries.length + unsyncedChats.length;
      if (totalUploaded > 0) {
        Toast.show({
          type: 'success',
          text1: `同步成功`,
          text2: `已上传 ${totalUploaded} 条记录到云端`,
        });
      } else {
        Toast.show({
          type: 'info',
          text1: '无需同步',
          text2: '所有数据已与云端同步',
        });
      }
    } catch (error) {
      console.error('Sync error:', error);
      Toast.show({
        type: 'error',
        text1: '同步失败',
        text2: '请检查网络连接后重试',
      });
    } finally {
      setSyncing(false);
    }
  };

  const fetchHealthTips = async () => {
    try {
      setLoadingTips(true);
      /**
       * 服务端文件：server/main.py
       * 接口：GET /api/v1/health-tips
       */
      const response = await fetch(buildApiUrl('/api/v1/health-tips'));

      if (!response.ok) {
        throw new Error(`Failed to fetch health tips (${response.status})`);
      }

      const data = await response.json();
      setHealthTips(data);
      setShowHealthTips(true);
    } catch (error) {
      console.error('Error fetching health tips:', error);
      Toast.show({ type: 'error', text1: '获取建议失败' });
    } finally {
      setLoadingTips(false);
    }
  };

  const menuItems: MenuItem[] = useMemo(() => [
    {
      icon: hasPassword ? 'key' : 'lock',
      title: hasPassword ? '修改密码' : '设置密码',
      subtitle: hasPassword ? '更改您的安全密码' : '设置密码以保护隐私',
      action: () => {
        if (hasPassword) {
          router.push('/change-password');
        } else {
          router.push('/setup-password');
        }
      },
    },
    {
      icon: 'fingerprint',
      title: '生物识别',
      subtitle: canUseBiometric ? (biometricEnabled ? '已启用' : '未启用') : '设备不支持',
      action: () => {
        if (!canUseBiometric) {
          Toast.show({ type: 'info', text1: '您的设备不支持生物识别' });
          return;
        }
        if (biometricEnabled) {
          Alert.alert('禁用生物识别', '确定要禁用生物识别吗？', [
            { text: '取消', style: 'cancel' },
            {
              text: '确定',
              onPress: () => {
                disableBiometric();
                Toast.show({ type: 'success', text1: '已禁用生物识别' });
              },
            },
          ]);
        } else {
          enableBiometric().then(success => {
            if (success) {
              Toast.show({ type: 'success', text1: '已启用生物识别' });
            }
          });
        }
      },
    },
    {
      icon: isOfflineMode ? 'wifi' : 'power-off',
      title: '离线模式',
      subtitle: isOfflineMode ? '已开启' : '已关闭',
      action: () => {
        Alert.alert(
          isOfflineMode ? '关闭离线模式' : '开启离线模式',
          isOfflineMode
            ? '关闭后将需要网络连接'
            : '开启后将完全断网，所有数据保存在本地',
          [
            { text: '取消', style: 'cancel' },
            {
              text: '确定',
              onPress: () => {
                toggleOfflineMode();
                Toast.show({
                  type: 'success',
                  text1: isOfflineMode ? '已关闭离线模式' : '已开启离线模式',
                });
              },
            },
          ]
        );
      },
    },
    {
      icon: 'cloud-arrow-up',
      title: '同步到云端',
      subtitle: syncing ? '同步中...' : '上传本地未同步数据',
      action: () => {
        if (syncing) return;
        syncToCloud();
      },
    },
    {
      icon: 'heart-pulse',
      title: '心理健康建议',
      subtitle: '基于你的情绪状态',
      action: () => {
        fetchHealthTips();
      },
    },
    {
      icon: 'robot',
      title: 'AI 陪伴',
      subtitle: '与AI助手深度对话',
      action: () => {
        router.push('/chat');
      },
    },
    {
      icon: 'shield-halved',
      title: '隐私设置',
      subtitle: '数据加密、安全防护',
      action: () => {
        router.push('/privacy-settings');
      },
    },
    {
      icon: 'download',
      title: '导出数据',
      subtitle: '备份你的日记数据',
      action: async () => {
        try {
          const data = await exportAllData();
          Alert.alert('数据导出', `成功导出 ${JSON.parse(data).totalDiaries} 篇日记`);
          Toast.show({ type: 'success', text1: '数据导出成功' });
        } catch (error) {
          Alert.alert('错误', '导出失败');
        }
      },
    },
    {
      icon: 'trash-can',
      title: '删除所有数据',
      subtitle: '永久删除，无法恢复',
      action: () => {
        Alert.alert(
          '删除所有数据',
          '此操作将永久删除所有日记和设置，无法恢复。确定要继续吗？',
          [
            { text: '取消', style: 'cancel' },
            {
              text: '确定删除',
              style: 'destructive',
              onPress: async () => {
                try {
                  await deleteAllData();
                  Alert.alert('成功', '所有数据已删除');
                  router.replace('/');
                } catch (error) {
                  Alert.alert('错误', '删除失败');
                }
              },
            },
          ]
        );
      },
    },
    {
      icon: 'info-circle',
      title: '关于',
      subtitle: '版本信息、隐私政策',
      action: () => {
        router.push('/about');
      },
    },
  ], [hasPassword, canUseBiometric, biometricEnabled, isOfflineMode, syncing, router, syncToCloud, fetchHealthTips, deleteAllData, exportAllData]);

  const renderMenuItem = (item: MenuItem, index: number) => (
    <TouchableOpacity
      key={index}
      style={[
        styles.menuItem,
        { backgroundColor: surface, borderColor: border, borderWidth: 1 }
      ]}
      onPress={item.action}
    >
      <View style={[styles.menuIcon, { backgroundColor: `${accent}20` }]}>
        <FontAwesome6 name={item.icon as any} size={20} color={accent} />
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuTitle, { color: foreground }]}>{item.title}</Text>
        {item.subtitle && (
          <Text style={[styles.menuSubtitle, { color: muted }]}>{item.subtitle}</Text>
        )}
      </View>
      <FontAwesome6 name="chevron-right" size={16} color={muted} />
    </TouchableOpacity>
  );

  return (
    <Screen>
      <ScrollView style={[styles.container, { backgroundColor: background }]}>
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: `${accent}20` }]}>
            <FontAwesome6 name="user" size={32} color={accent} />
          </View>
          <View>
            <Text style={[styles.userName, { color: foreground }]}>我的日记</Text>
            <Text style={[styles.userSubtitle, { color: muted }]}>用心记录，温暖陪伴</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: muted }]}>设置</Text>
          {menuItems.slice(0, 2).map((item, index) => renderMenuItem(item, index))}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: muted }]}>其他</Text>
          {menuItems.slice(2).map((item, index) => renderMenuItem(item, index + 2))}
        </View>

        <View style={[styles.footer, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}>
          <FontAwesome6 name="heart" size={16} color={accent} style={styles.footerIcon} />
          <Text style={[styles.footerText, { color: muted }]}>
            情绪日记 & 心理状态智能陪伴系统
          </Text>
          <Text style={[styles.footerVersion, { color: muted }]}>Version 1.0.0</Text>
        </View>
      </ScrollView>

      {/* 健康建议弹窗 */}
      {showHealthTips && (
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
          activeOpacity={1}
          onPress={() => setShowHealthTips(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: surface }]}>
            <View style={styles.modalHeader}>
              <FontAwesome6 name="heart-pulse" size={24} color={accent} />
              <Text style={[styles.modalTitle, { color: foreground }]}>心理健康建议</Text>
              <TouchableOpacity onPress={() => setShowHealthTips(false)}>
                <FontAwesome6 name="xmark" size={24} color={muted} />
              </TouchableOpacity>
            </View>

            {loadingTips ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={accent} />
                <Text style={[styles.modalLoadingText, { color: muted }]}>正在生成建议...</Text>
              </View>
            ) : healthTips ? (
              <ScrollView style={styles.modalBody}>
                {healthTips.message && (
                  <View style={[styles.messageBox, { backgroundColor: `${accent}10`, borderColor: accent, borderWidth: 1 }]}>
                    <FontAwesome6 name="lightbulb" size={20} color={accent} style={styles.messageBoxIcon} />
                    <Text style={[styles.messageBoxText, { color: foreground }]}>{healthTips.message}</Text>
                  </View>
                )}

                <Text style={[styles.tipsTitle, { color: foreground }]}>建议</Text>
                {healthTips.tips && healthTips.tips.map((tip: string, index: number) => (
                  <View key={index} style={[styles.tipItem, { backgroundColor: background, borderColor: border, borderWidth: 1 }]}>
                    <FontAwesome6 name="circle-check" size={20} color={accent} style={styles.tipIcon} />
                    <Text style={[styles.tipText, { color: foreground }]}>{tip}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : null}

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: accent }]}
              onPress={() => setShowHealthTips(false)}
            >
              <Text style={styles.modalButtonText}>知道了</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    gap: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
  },
  userSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  menuSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  footer: {
    margin: 16,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 100,
  },
  footerIcon: {
    marginBottom: 8,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 4,
  },
  footerVersion: {
    fontSize: 12,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    gap: 12,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
  },
  modalLoading: {
    padding: 40,
    alignItems: 'center',
    gap: 16,
  },
  modalLoadingText: {
    fontSize: 14,
  },
  modalBody: {
    maxHeight: 400,
    padding: 20,
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  messageBoxIcon: {
    marginTop: 2,
  },
  messageBoxText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 10,
  },
  tipIcon: {
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  modalButton: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
