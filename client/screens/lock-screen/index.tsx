import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { usePassword } from '@/contexts/PasswordContext';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useCSSVariable } from 'uniwind';

export default function LockScreen() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isGuestMode, setIsGuestMode] = useState(false);

  const { isLocked, hasPassword, canUseBiometric, biometricEnabled, unlockApp, enableBiometric } = usePassword();

  const [background, surface, accent, foreground, muted] = useCSSVariable([
    '--color-background',
    '--color-surface',
    '--color-accent',
    '--color-foreground',
    '--color-muted',
  ]) as string[];

  // 尝试生物识别解锁
  useEffect(() => {
    if (isLocked && hasPassword && biometricEnabled && canUseBiometric) {
      attemptBiometricUnlock();
    }
  }, [isLocked, hasPassword, biometricEnabled, canUseBiometric]);

  const attemptBiometricUnlock = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: '解锁应用',
        cancelLabel: '取消',
        fallbackLabel: '使用密码',
      });

      if (result.success) {
        // 生物识别成功，直接解锁APP（无需再次输入密码）
        // 因为生物识别本身就是一种身份验证方式
        console.log('生物识别成功，自动解锁');

        // 使用一个特殊标记来表示生物识别解锁
        // 实际使用时，unlockApp方法需要支持生物识别标记
        // 暂时使用空密码或特殊处理
        const success = await unlockApp('', false);

        if (!success) {
          setError('生物识别解锁失败，请使用密码');
        }
      }
    } catch (error: any) {
      console.error('Biometric unlock error:', error);

      // 用户取消了生物识别（不是错误）
      if (error?.code === 'user_cancel') {
        console.log('用户取消了生物识别');
        return;
      }

      // 生物识别不可用或失败，不显示错误，让用户使用密码
      if (error?.code === 'not_available' || error?.code === 'not_enrolled') {
        console.log('生物识别不可用');
        return;
      }
    }
  };

  const handleUnlock = async () => {
    if (!password) {
      setError('请输入密码');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const success = await unlockApp(password, isGuestMode);

      if (!success) {
        setError('密码错误');
        setPassword('');
      }
    } catch (error) {
      console.error('Unlock error:', error);
      setError('解锁失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableBiometric = async () => {
    const success = await enableBiometric();
    if (!success) {
      Alert.alert('提示', '启用生物识别失败');
    }
  };

  // 如果没有设置密码，显示设置提示
  if (!hasPassword) {
    return (
      <Screen>
        <View style={[styles.container, { backgroundColor: background }]}>
          <View style={styles.content}>
            <FontAwesome6 name="lock" size={64} color={accent} style={styles.icon} />
            <Text style={[styles.title, { color: foreground }]}>欢迎使用</Text>
            <Text style={[styles.subtitle, { color: muted }]}>
              请先设置密码以保护您的隐私
            </Text>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={[styles.container, { backgroundColor: background }]}>
        <View style={styles.content}>
          <FontAwesome6 name="shield-halved" size={64} color={accent} style={styles.icon} />
          <Text style={[styles.title, { color: foreground }]}>安全锁</Text>
          <Text style={[styles.subtitle, { color: muted }]}>
            {isGuestMode ? '请输入访客密码' : '请输入密码解锁'}
          </Text>

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: surface,
                color: foreground,
                borderColor: error ? '#F87171' : surface,
                borderWidth: 2,
              },
            ]}
            placeholder="输入密码"
            placeholderTextColor={muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            onSubmitEditing={handleUnlock}
          />

          {error && (
            <Text style={[styles.errorText, { color: '#F87171' }]}>{error}</Text>
          )}

          <TouchableOpacity
            style={[styles.unlockButton, { backgroundColor: accent, opacity: loading ? 0.6 : 1 }]}
            onPress={handleUnlock}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.unlockButtonText}>解锁</Text>
            )}
          </TouchableOpacity>

          {/* 生物识别按钮 */}
          {canUseBiometric && !biometricEnabled && (
            <TouchableOpacity
              style={[styles.biometricButton, { backgroundColor: surface, borderColor: accent, borderWidth: 2 }]}
              onPress={handleEnableBiometric}
            >
              <FontAwesome6 name="fingerprint" size={20} color={accent} />
              <Text style={[styles.biometricButtonText, { color: foreground }]}>启用生物识别</Text>
            </TouchableOpacity>
          )}

          {/* 访客模式切换 */}
          <TouchableOpacity
            style={styles.guestButton}
            onPress={() => setIsGuestMode(!isGuestMode)}
          >
            <Text style={[styles.guestButtonText, { color: muted }]}>
              切换到{isGuestMode ? '主人' : '访客'}模式
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
  },
  input: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    paddingHorizontal: 20,
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 24,
  },
  unlockButton: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  unlockButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  biometricButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  guestButton: {
    paddingVertical: 12,
  },
  guestButtonText: {
    fontSize: 14,
  },
});
