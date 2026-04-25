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
        // 生物识别成功，使用预设密码解锁
        // 这里简化处理，实际应该存储一个特殊的生物识别令牌
        Alert.alert('提示', '请输入密码以完成解锁');
      }
    } catch (error) {
      console.error('Biometric unlock error:', error);
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
            <Ionicons name="lock" size={64} color={accent} style={styles.icon} />
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
          <Ionicons name="shield-halved" size={64} color={accent} style={styles.icon} />
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
              <Ionicons name="fingerprint" size={20} color={accent} />
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
