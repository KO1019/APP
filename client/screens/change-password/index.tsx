import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useCSSVariable } from 'uniwind';
import Toast from 'react-native-toast-message';
import { buildApiUrl } from '@/utils';

export default function ChangePasswordScreen() {
  const { user, token } = useAuth();

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
        <View style={styles.form}>
          {/* 标题 */}
          <View style={styles.header}>
            <FontAwesome6 name="key" size={32} color={accent} />
            <Text style={[styles.title, { color: foreground }]}>修改密码</Text>
            <Text style={[styles.subtitle, { color: muted }]}>
              为了您的账户安全，建议定期更换密码
            </Text>
          </View>

          {/* 旧密码输入 */}
          <View style={styles.inputGroup}>
            <View style={[styles.inputWrapper, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}>
              <FontAwesome6 name="lock" size={20} color={muted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: foreground }]}
                placeholder="旧密码"
                placeholderTextColor={muted}
                secureTextEntry
                value={oldPassword}
                onChangeText={setOldPassword}
              />
            </View>
          </View>

          {/* 新密码输入 */}
          <View style={styles.inputGroup}>
            <View style={[styles.inputWrapper, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}>
              <FontAwesome6 name="lock" size={20} color={muted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: foreground }]}
                placeholder="新密码（至少6个字符）"
                placeholderTextColor={muted}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
            </View>
          </View>

          {/* 确认密码输入 */}
          <View style={styles.inputGroup}>
            <View style={[styles.inputWrapper, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}>
              <FontAwesome6 name="lock" size={20} color={muted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: foreground }]}
                placeholder="确认新密码"
                placeholderTextColor={muted}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
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
    padding: 20,
  },
  form: {
    marginTop: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
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
