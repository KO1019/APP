import React, { useState, useRef, useCallback } from 'react';
import { TextInput, View, StyleSheet, TextInputProps, Text } from 'react-native';
import { useCSSVariable } from 'uniwind';

interface PasswordInputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  showPassword?: boolean;
}

export function PasswordInput({ value, onChangeText, error, showPassword, ...props }: PasswordInputProps) {
  const [background, border, foreground, muted] = useCSSVariable([
    '--color-background',
    '--color-border',
    '--color-foreground',
    '--color-muted',
  ]) as string[];

  // 显示的文本（可能是明文或星号）
  const [displayText, setDisplayText] = useState('');
  // 光标位置
  const cursorPositionRef = useRef(0);
  // 定时器引用
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 获取密码的显示形式
  const getPasswordDisplay = useCallback((password: string, showFull: boolean): string => {
    if (showFull) {
      return password;
    }
    return '•'.repeat(password.length);
  }, []);

  // 清除定时器
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 设置新的显示文本（带定时器）
  const setDisplayWithTimer = useCallback((newValue: string, showFull: boolean) => {
    clearTimer();

    if (showFull) {
      // 完全显示明文
      setDisplayText(newValue);
    } else if (newValue.length === 0) {
      // 空值
      setDisplayText('');
    } else {
      // 显示明文，然后延迟变成星号
      setDisplayText(newValue);

      // 600ms后变成星号
      timerRef.current = setTimeout(() => {
        setDisplayText(getPasswordDisplay(newValue, false));
      }, 600);
    }
  }, [clearTimer, getPasswordDisplay]);

  // 处理文本变化
  const handleChangeText = useCallback((newText: string) => {
    onChangeText(newText);
    setDisplayWithTimer(newText, false);
  }, [onChangeText, setDisplayWithTimer]);

  // 处理光标变化
  const handleSelectionChange = useCallback((event: any) => {
    cursorPositionRef.current = event.nativeEvent.selection.start;
  }, []);

  // 清理定时器
  React.useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  // 当value外部变化时更新显示
  React.useEffect(() => {
    if (value !== displayText.replace(/•/g, '')) {
      setDisplayWithTimer(value, false);
    }
  }, [value, displayText, setDisplayWithTimer]);

  // 当showPassword变化时更新显示
  React.useEffect(() => {
    setDisplayWithTimer(value, showPassword || false);
  }, [showPassword, value, setDisplayWithTimer]);

  return (
    <View>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: background,
            borderColor: error ? '#EF4444' : border,
            color: foreground,
          },
        ]}
        placeholderTextColor={muted}
        value={displayText}
        onChangeText={handleChangeText}
        onSelectionChange={handleSelectionChange}
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  error: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
});
