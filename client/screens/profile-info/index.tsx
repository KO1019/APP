import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useCSSVariable } from 'uniwind';
import Toast from 'react-native-toast-message';
import { buildApiUrl } from '@/utils';
import { useSafeRouter } from '@/hooks/useSafeRouter';

export default function ProfileInfoScreen() {
  const { user, token, refreshUser } = useAuth();
  const router = useSafeRouter();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [background, surface, accent, foreground, muted, border, error] = useCSSVariable([
    '--color-background',
    '--color-surface',
    '--color-accent',
    '--color-foreground',
    '--color-muted',
    '--color-border',
    '--color-error',
  ]) as string[];

  const handleChangePassword = async () => {
    // 参数校验
    if (!oldPassword) {
      Toast.show({ type: 'error', text1: '请输入旧密码' });
      return;
    }

    if (newPassword.length < 6) {
      Toast.show({ type: 'error', text1: '新密码长度至少6个字符' });
      return;
    }

    if (newPassword !== confirmPassword) {
      Toast.show({ type: 'error', text1: '两次输入的密码不一致' });
      return;
    }

    if (oldPassword === newPassword) {
      Toast.show({ type: 'error', text1: '新密码不能与旧密码相同' });
      return;
    }

    try {
      setLoading(true);
      /**
       * 服务端文件：server/main.py
       * 接口：POST /api/v1/auth/change-password
       * Body 参数：old_password: string, new_password: string
       */
      const response = await fetch(buildApiUrl('/api/v1/auth/change-password'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '修改密码失败');
      }

      Toast.show({ type: 'success', text1: '密码修改成功' });

      // 清空表单
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error changing password:', error);
      Toast.show({
        type: 'error',
        text1: '修改密码失败',
        text2: error instanceof Error ? error.message : '请稍后重试',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen safeAreaEdges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView style={[styles.container, { backgroundColor: background }]}>
          {/* 顶部导航栏 */}
          <View style={[styles.headerBar, { borderBottomColor: border }]}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <FontAwesome6 name="arrow-left" size={24} color={foreground} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: foreground }]}>个人信息</Text>
            <View style={styles.headerRight} />
          </View>

          <View style={styles.content}>
            {/* 用户信息卡片 */}
            <View style={[styles.infoCard, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}>
              <View style={[styles.iconContainer, { backgroundColor: `${accent}20` }]}>
                <FontAwesome6 name="user" size={32} color={accent} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: muted }]}>用户名</Text>
                <Text style={[styles.infoValue, { color: foreground }]}>{user?.email || '未设置'}</Text>
              </View>
            </View>

            {/* 修改密码部分 */}
            <Text style={[styles.sectionTitle, { color: foreground, marginTop: 24 }]}>修改账号密码</Text>

            <View style={[styles.formContainer, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: foreground }]}>旧密码</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: background, color: foreground, borderColor: border }]}
                  placeholder="请输入旧密码"
                  placeholderTextColor={muted}
                  value={oldPassword}
                  onChangeText={setOldPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: foreground }]}>新密码</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: background, color: foreground, borderColor: border }]}
                  placeholder="请输入新密码（至少6位）"
                  placeholderTextColor={muted}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: foreground }]}>确认新密码</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: background, color: foreground, borderColor: border }]}
                  placeholder="请再次输入新密码"
                  placeholderTextColor={muted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: accent }]}
                onPress={handleChangePassword}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>修改密码</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* 提示信息 */}
            <View style={[styles.tipCard, { backgroundColor: `${accent}10`, borderColor: `${accent}30`, borderWidth: 1 }]}>
              <FontAwesome6 name="circle-info" size={16} color={accent} style={styles.tipIcon} />
              <Text style={[styles.tipText, { color: foreground }]}>
                此密码用于登录账户，与应用锁密码不同
              </Text>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  content: {
    padding: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    gap: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  formContainer: {
    padding: 20,
    borderRadius: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    fontSize: 16,
  },
  submitButton: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  tipIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
