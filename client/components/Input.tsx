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
  const [isShowingPlainText, setIsShowingPlainText] = useState(false);
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
      // 正在输入时，短暂显示明文
      setIsShowingPlainText(true);

      // 取消之前的定时器
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // 延迟0.8秒后变成星号
      timeoutRef.current = setTimeout(() => {
        setIsShowingPlainText(false);
      }, 800);

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
  // 当delayedSecure和secureTextEntry都为true时，根据isShowingPlainText决定是否显示明文
  const shouldSecure = secureTextEntry && delayedSecure ? !isShowingPlainText : secureTextEntry;

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
        value={value}
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
