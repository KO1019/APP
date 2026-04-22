import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Screen } from '@/components/Screen';
import { Input } from '@/components/Input';
import { useAuth } from '@/contexts/AuthContext';
import { useCSSVariable } from 'uniwind';
import Toast from 'react-native-toast-message';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useSafeRouter();
  const { register } = useAuth();

  const [background, surface, accent, foreground, muted, border] = useCSSVariable([
    '--color-background',
    '--color-surface',
    '--color-accent',
    '--color-foreground',
    '--color-muted',
    '--color-border',
  ]) as string[];

  const handleRegister = async () => {
    if (!username || !password) {
      Toast.show({
        type: 'error',
        text1: '请完整填写信息',
        text2: '用户名和密码都不能为空'
      });
      return;
    }

    if (!confirmPassword) {
      Toast.show({
        type: 'error',
        text1: '请确认密码',
        text2: '请再次输入密码以确认'
      });
      return;
    }

    if (username.length < 3) {
      Toast.show({
        type: 'error',
        text1: '用户名太短',
        text2: '用户名至少需要3个字符'
      });
      return;
    }

    if (username.length > 20) {
      Toast.show({
        type: 'error',
        text1: '用户名太长',
        text2: '用户名不能超过20个字符'
      });
      return;
    }

    if (password.length < 6) {
      Toast.show({
        type: 'error',
        text1: '密码太短',
        text2: '密码至少需要6个字符，为了安全请设置更复杂的密码'
      });
      return;
    }

    if (password !== confirmPassword) {
      Toast.show({
        type: 'error',
        text1: '密码不匹配',
        text2: '两次输入的密码不一致，请检查后重试'
      });
      return;
    }

    try {
      setLoading(true);
      await register(username, password, email || undefined, nickname || undefined);
      Toast.show({
        type: 'success',
        text1: '注册成功',
        text2: '欢迎加入AI情绪日记'
      });
      router.replace('/');
    } catch (error: any) {
      let errorMessage = '注册失败，请稍后重试';
      let errorTitle = '注册失败';

      if (error.message?.includes('Username already exists')) {
        errorTitle = '用户名已被占用';
        errorMessage = '该用户名已被注册，请换一个试试';
      } else if (error.message) {
        errorMessage = error.message;
      }

      Toast.show({
        type: 'error',
        text1: errorTitle,
        text2: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.container, { backgroundColor: background }]}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: foreground }]}>创建账号</Text>
            <Text style={[styles.subtitle, { color: muted }]}>开始记录你的情绪日记</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: foreground }]}>用户名 *</Text>
              <Input
                placeholder="3-20个字符"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: foreground }]}>密码 *</Text>
              <Input
                placeholder="至少6个字符"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: foreground }]}>确认密码 *</Text>
              <Input
                placeholder="再次输入密码"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: foreground }]}>昵称</Text>
              <Input
                placeholder="可选"
                value={nickname}
                onChangeText={setNickname}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: foreground }]}>邮箱</Text>
              <Input
                placeholder="可选"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.registerButton, { backgroundColor: accent }]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.registerButtonText}>注册</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: muted }]}>已有账号？</Text>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text style={[styles.loginLink, { color: accent }]}>立即登录</Text>
              </TouchableOpacity>
            </View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 40,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  registerButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  footerText: {
    fontSize: 14,
    marginRight: 4,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});
