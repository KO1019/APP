import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useCSSVariable } from 'uniwind';
import Toast from 'react-native-toast-message';

interface MenuItem {
  icon: string;
  title: string;
  subtitle?: string;
  action?: () => void;
}

export default function ProfileScreen() {
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
      icon: 'shield-halved',
      title: '隐私设置',
      subtitle: '密码保护、数据加密',
      action: () => Toast.show({ type: 'info', text1: '功能开发中' }),
    },
    {
      icon: 'download',
      title: '导出数据',
      subtitle: '备份你的日记数据',
      action: () => Toast.show({ type: 'info', text1: '功能开发中' }),
    },
    {
      icon: 'palette',
      title: '主题设置',
      subtitle: '跟随系统/亮色/暗色',
      action: () => Toast.show({ type: 'info', text1: '功能开发中' }),
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
