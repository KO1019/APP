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

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleChangeText = (text: string) => {
    // 只有当启用了delayedSecure且当前处于隐藏模式（secureTextEntry=true）时才处理
    if (delayedSecure && secureTextEntry) {
      // 处理密码输入的延迟显示
      if (text.length > (value || '').length) {
        // 正在输入新字符，短暂显示最后一个字符
        setIsShowingLastChar(true);

        // 取消之前的定时器
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        // 延迟1.5秒后变成星号
        timeoutRef.current = setTimeout(() => {
          setIsShowingLastChar(false);
        }, 1500);
      } else {
        // 删除字符，短暂显示剩余的最后一个字符
        setIsShowingLastChar(text.length > 0);

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }

      // 调用原始的onChangeText
      if (onChangeText) {
        onChangeText(text);
      }
    } else {
      // 普通输入框或显示密码模式
      if (onChangeText) {
        onChangeText(text);
      }
    }
  };

  // 确定显示内容和是否使用secureTextEntry
  let finalValue = value;
  let shouldSecure = secureTextEntry;

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
