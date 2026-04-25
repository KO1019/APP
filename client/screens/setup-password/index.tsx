import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { usePassword } from '@/contexts/PasswordContext';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useCSSVariable } from 'uniwind';

export default function SetupPasswordScreen() {
  const router = useSafeRouter();
  const { setupPassword } = usePassword();

  const [step, setStep] = useState(1);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [background, surface, accent, foreground, muted, border] = useCSSVariable([
    '--color-background',
    '--color-surface',
    '--color-accent',
    '--color-foreground',
    '--color-muted',
    '--color-border',
  ]) as string[];

  const handleNext = () => {
    if (step === 1) {
      if (password.length < 4) {
        Alert.alert('提示', '密码至少需要4位数字');
        return;
      }
      setStep(2);
    } else {
      if (password !== confirmPassword) {
        Alert.alert('错误', '两次输入的密码不一致');
        return;
      }
      handleSetup();
    }
  };

  const handleSetup = async () => {
    try {
      await setupPassword('pin', password);
      Alert.alert('成功', '密码设置完成', [
        {
          text: '确定',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      Alert.alert('错误', '密码设置失败，请重试');
    }
  };

  return (
    <Screen>
      <View style={[styles.container, { backgroundColor: background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: foreground }]}>设置密码</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          <Ionicons name="shield-halved" size={80} color={accent} style={styles.icon} />

          <Text style={[styles.subtitle, { color: foreground }]}>
            {step === 1 ? '请输入您的密码' : '请再次输入密码'}
          </Text>

          <View style={styles.passwordContainer}>
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <View
                key={index}
                style={[
                  styles.passwordDot,
                  {
                    backgroundColor: surface,
                    borderColor: border,
                    borderWidth: 2,
                  },
                ]}
              >
                {step === 1 && password.length > index && (
                  <Ionicons name="circle" size={16} color={accent} />
                )}
                {step === 2 && confirmPassword.length > index && (
                  <Ionicons name="circle" size={16} color={accent} />
                )}
              </View>
            ))}
          </View>

          <TextInput
            style={styles.hiddenInput}
            value={step === 1 ? password : confirmPassword}
            onChangeText={step === 1 ? setPassword : setConfirmPassword}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: accent }]}
            onPress={handleNext}
            disabled={(step === 1 ? password : confirmPassword).length < 4}
          >
            <Text style={styles.buttonText}>{step === 1 ? '下一步' : '完成'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              setPassword('');
              setConfirmPassword('');
              setStep(1);
            }}
          >
            <Text style={[styles.secondaryButtonText, { color: muted }]}>重置</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  icon: {
    marginBottom: 32,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 40,
  },
  passwordContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 40,
  },
  passwordDot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
  },
  button: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    paddingVertical: 12,
  },
  secondaryButtonText: {
    fontSize: 16,
  },
});
