import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Screen } from '@/components/Screen';
import { Input } from '@/components/Input';
import { useAuth } from '@/contexts/AuthContext';
import { useCSSVariable } from 'uniwind';
import Toast from 'react-native-toast-message';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useSafeRouter();
  const { login } = useAuth();

  const [background, surface, accent, foreground, muted, border] = useCSSVariable([
    '--color-background',
    '--color-surface',
    '--color-accent',
    '--color-foreground',
    '--color-muted',
    '--color-border',
  ]) as string[];

  const handleLogin = async () => {
    if (!username || !password) {
      Toast.show({
        type: 'error',
        text1: '请完整填写信息',
        text2: '用户名和密码都不能为空'
      });
      return;
    }

    if (username.length < 3) {
      Toast.show({
        type: 'error',
        text1: '用户名格式错误',
        text2: '用户名至少需要3个字符'
      });
      return;
    }

    if (password.length < 6) {
      Toast.show({
        type: 'error',
        text1: '密码格式错误',
        text2: '密码至少需要6个字符'
      });
      return;
    }

    try {
      setLoading(true);
      await login(username, password);
      Toast.show({
        type: 'success',
        text1: '登录成功',
        text2: '欢迎回来'
      });
      // 跳转到欢迎界面，由欢迎界面决定是否显示
      router.replace('/welcome');
    } catch (error: any) {
      let errorMessage = '登录失败，请稍后重试';
      let errorTitle = '登录失败';

      if (error.message?.includes('Invalid username or password')) {
        errorTitle = '登录信息错误';
        errorMessage = '用户名或密码错误，请检查后重试';
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
            <Text style={[styles.title, { color: foreground }]}>欢迎回来</Text>
            <Text style={[styles.subtitle, { color: muted }]}>登录以继续使用AI情绪日记</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: foreground }]}>用户名</Text>
              <Input
                placeholder="请输入用户名"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: foreground }]}>密码</Text>
              <Input
                placeholder="请输入密码"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[styles.loginButton, { backgroundColor: accent }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>登录</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: muted }]}>还没有账号？</Text>
              <TouchableOpacity onPress={() => router.push('/register')}>
                <Text style={[styles.registerLink, { color: accent }]}>立即注册</Text>
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
    marginBottom: 40,
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
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
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
  registerLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});
