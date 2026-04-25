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
      // 输入时短暂显示最后一个字符
      setIsShowingLastChar(true);

      // 取消之前的定时器
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // 延迟0.5秒后变成星号
      timeoutRef.current = setTimeout(() => {
        setIsShowingLastChar(false);
      }, 500);

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

  // 处理显示内容和secureTextEntry
  let displayValue = value;
  let shouldSecure = secureTextEntry;

  if (delayedSecure && secureTextEntry) {
    if (isShowingLastChar && value && value.length > 0) {
      // 显示"星号+最后一个字符"
      const bullets = '\u2022'.repeat(value.length - 1);  // 使用圆点字符
      displayValue = bullets + value[value.length - 1];
      shouldSecure = false;  // 手动控制显示
    } else {
      // 全部显示星号
      displayValue = value;
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
        value={displayValue}
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
