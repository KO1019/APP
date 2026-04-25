import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useCSSVariable } from 'uniwind';
import Toast from 'react-native-toast-message';
import { buildApiUrl } from '@/utils';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { SecureInput } from '@/components/SecureInput';

export default function ChangePasswordScreen() {
  const { user, token } = useAuth();
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
    <Screen>
      <View style={[styles.container, { backgroundColor: background }]}>
        {/* 顶部导航栏 */}
        <View style={[styles.headerBar, { borderBottomColor: border }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <FontAwesome6 name="arrow-left" size={24} color={foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: foreground }]}>修改密码</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.form}>
          {/* 提示图标 */}
          <View style={styles.iconContainer}>
            <FontAwesome6 name="key" size={48} color={accent} />
          </View>
          <Text style={[styles.pageSubtitle, { color: muted }]}>
            为了您的账户安全，建议定期更换密码
          </Text>

          {/* 旧密码输入 */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: foreground }]}>旧密码</Text>
            <View style={styles.inputWrapper}>
              <FontAwesome6 name="lock" size={20} color={muted} style={styles.inputIcon} />
              <SecureInput
                style={styles.secureInput}
                value={oldPassword}
                onChangeText={setOldPassword}
                placeholderTextColor={muted}
                placeholder="请输入旧密码"
              />
            </View>
          </View>

          {/* 新密码输入 */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: foreground }]}>新密码（至少6个字符）</Text>
            <View style={styles.inputWrapper}>
              <FontAwesome6 name="lock" size={20} color={muted} style={styles.inputIcon} />
              <SecureInput
                style={styles.secureInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholderTextColor={muted}
                placeholder="请再次输入新密码"
              />
            </View>
          </View>

          {/* 确认密码输入 */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: foreground }]}>确认新密码</Text>
            <View style={styles.inputWrapper}>
              <FontAwesome6 name="lock" size={20} color={muted} style={styles.inputIcon} />
              <SecureInput
                style={styles.secureInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholderTextColor={muted}
                placeholder="请再次输入新密码"
              />
            </View>
          </View>

          {/* 提交按钮 */}
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: accent }]}
            onPress={handleChangePassword}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>确认修改</Text>
            )}
          </TouchableOpacity>

          {/* 提示信息 */}
          <View style={[styles.tipBox, { backgroundColor: `${accent}10`, borderColor: accent, borderWidth: 1 }]}>
            <FontAwesome6 name="circle-info" size={16} color={accent} style={styles.tipIcon} />
            <Text style={[styles.tipText, { color: foreground }]}>
              密码修改后，您需要使用新密码重新登录
            </Text>
          </View>
        </View>
      </View>
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
    height: 56,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginLeft: 8,
  },
  headerSpacer: {
    width: 40,
  },
  form: {
    padding: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  pageSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  secureInput: {
    flex: 1,
    fontSize: 16,
  },
  submitButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  tipIcon: {
    marginTop: 2,
    marginRight: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
