import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { usePassword } from '@/contexts/PasswordContext';
import { useCSSVariable } from 'uniwind';
import Toast from 'react-native-toast-message';

interface MenuItem {
  icon: string;
  title: string;
  subtitle?: string;
  action?: () => void;
}

interface MenuItem {
  icon: string;
  title: string;
  subtitle?: string;
  action?: () => void;
}

export default function ProfileScreen() {
  const router = useSafeRouter();
  const {
    hasPassword,
    canUseBiometric,
    biometricEnabled,
    offlineMode,
    enableBiometric,
    disableBiometric,
    toggleOfflineMode,
    exportAllData,
    deleteAllData,
  } = usePassword();

  const [background, surface, accent, foreground, muted, border] = useCSSVariable([
    '--color-background',
    '--color-surface',
    '--color-accent',
    '--color-foreground',
    '--color-muted',
    '--color-border',
  ]) as string[];

  const menuItems: MenuItem[] = [
    {
      icon: hasPassword ? 'key' : 'lock',
      title: hasPassword ? '修改密码' : '设置密码',
      subtitle: hasPassword ? '更改您的安全密码' : '设置密码以保护隐私',
      action: () => {
        if (hasPassword) {
          Toast.show({ type: 'info', text1: '修改密码功能开发中' });
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
      icon: offlineMode ? 'wifi' : 'wifi-slash',
      title: '离线模式',
      subtitle: offlineMode ? '已开启' : '已关闭',
      action: () => {
        Alert.alert(
          offlineMode ? '关闭离线模式' : '开启离线模式',
          offlineMode
            ? '关闭后将需要网络连接'
            : '开启后将完全断网，所有数据保存在本地',
          [
            { text: '取消', style: 'cancel' },
            {
              text: '确定',
              onPress: () => {
                toggleOfflineMode(!offlineMode);
                Toast.show({
                  type: 'success',
                  text1: offlineMode ? '已关闭离线模式' : '已开启离线模式',
                });
              },
            },
          ]
        );
      },
    },
    {
      icon: 'shield-halved',
      title: '隐私设置',
      subtitle: '数据加密、安全防护',
      action: () => Toast.show({ type: 'info', text1: '功能开发中' }),
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
      action: () => Toast.show({ type: 'info', text1: '功能开发中' }),
    },
  ];

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
});
