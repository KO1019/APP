import React, { useState, useRef, useEffect } from 'react';
import { TextInput, View, StyleSheet, TextInputProps, Text } from 'react-native';
import { useCSSVariable } from 'uniwind';

interface InputProps extends TextInputProps {
  error?: string;
  delayedSecure?: boolean;  // 延迟变星号（用于密码输入）
}

export function Input({ style, error, delayedSecure, secureTextEntry, onChangeText, value, ...props }: InputProps) {
  const [background, border, foreground, muted] = useCSSVariable([
    '--color-background',
    '--color-border',
    '--color-foreground',
    '--color-muted',
  ]) as string[];

  // 延迟变星号逻辑
  const [isShowingLastChar, setIsShowingLastChar] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [selection, setSelection] = useState<{ start: number; end: number } | undefined>(undefined);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // 当显示最后一个字符时，短暂设置光标到最后
  useEffect(() => {
    if (isShowingLastChar && value && value.length > 0) {
      const stars = '•'.repeat(value.length - 1);
      const finalValue = stars + value[value.length - 1];
      setSelection({ start: finalValue.length, end: finalValue.length });

      // 50ms 后清除 selection，让 TextInput 自己管理光标
      const timer = setTimeout(() => {
        setSelection(undefined);
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [isShowingLastChar, value]);

  const handleChangeText = (text: string) => {
    // 调用原始的onChangeText
    if (onChangeText) {
      onChangeText(text);
    }

    // 只有当启用delayedSecure且当前处于隐藏模式时才处理
    if (delayedSecure && secureTextEntry) {
      // 正在输入时，短暂显示最后一个字符
      setIsShowingLastChar(true);

      // 取消之前的定时器
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // 延迟0.8秒后变成星号
      timeoutRef.current = setTimeout(() => {
        setIsShowingLastChar(false);
      }, 800);
    } else {
      // 明文模式，取消延迟显示
      setIsShowingLastChar(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }
  };

  // 确定显示内容和是否使用secureTextEntry
  let finalValue = value;
  let shouldSecure = secureTextEntry;

  // 只有在启用delayedSecure且secureTextEntry为true时才使用延迟显示逻辑
  // 当 secureTextEntry=false 时（用户点击眼睛），直接显示明文
  if (delayedSecure && secureTextEntry) {
    if (isShowingLastChar && value && value.length > 0) {
      // 短暂显示模式：显示星号+最后一个字符
      const stars = '•'.repeat(value.length - 1);
      finalValue = stars + value[value.length - 1];
      shouldSecure = false;  // 不使用secureTextEntry，我们手动构建显示内容
    } else {
      // 完全隐藏模式：使用secureTextEntry显示星号
      finalValue = value;
      shouldSecure = true;
    }
  }

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
          style,
        ]}
        placeholderTextColor={muted}
        value={finalValue}
        onChangeText={handleChangeText}
        secureTextEntry={shouldSecure}
        selection={selection}
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
