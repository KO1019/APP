import React, { useState, useRef, useEffect } from 'react';
import { TextInput, View, StyleSheet, TextInputProps, Text } from 'react-native';
import { useCSSVariable } from 'uniwind';

interface SecureInputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  error?: string;
  value: string;
  onChangeText: (text: string) => void;
}

/**
 * 安全输入框组件
 * 功能：输入密码时短暂显示字符（1.5秒），然后自动变成星号
 * 解决Android上secureTextEntry立即隐藏字符的问题
 */
export function SecureInput({ value, onChangeText, error, ...props }: SecureInputProps) {
  const [background, border, foreground, muted] = useCSSVariable([
    '--color-background',
    '--color-border',
    '--color-foreground',
    '--color-muted',
  ]) as string[];

  // 显示的文本（包含可见字符和星号）
  const [displayText, setDisplayText] = useState(value);
  // 每个字符的可见性计时器
  const timersRef = useRef<Map<number, NodeJS.Timeout>>(new Map());

  // 当外部value变化时（比如删除字符），同步更新显示文本
  useEffect(() => {
    if (value.length < displayText.length) {
      // 删除字符时，同步删除
      setDisplayText(value);
      // 清除被删除字符的计时器
      const newTimers = new Map<number, NodeJS.Timeout>();
      timersRef.current.forEach((timer, index) => {
        if (index < value.length) {
          newTimers.set(index, timer);
        } else {
          clearTimeout(timer);
        }
      });
      timersRef.current = newTimers;
    }
  }, [value, displayText.length]);

  const handleChangeText = (text: string) => {
    const currentLength = value.length;
    const newLength = text.length;

    if (newLength > currentLength) {
      // 输入新字符
      const newChar = text[newLength - 1];

      // 更新显示文本：显示新字符，其他字符保持星号
      const maskedText = text.split('').map((char, index) => {
        if (index === newLength - 1) {
          return newChar; // 新输入的字符显示
        }
        return '•'; // 其他字符显示为星号
      }).join('');

      setDisplayText(maskedText);

      // 设置定时器，1.5秒后将该字符替换为星号
      const timer = setTimeout(() => {
        setDisplayText((prev) => {
          const chars = prev.split('');
          if (chars[newLength - 1] === newChar) {
            chars[newLength - 1] = '•';
          }
          return chars.join('');
        });
        timersRef.current.delete(newLength - 1);
      }, 1500);

      timersRef.current.set(newLength - 1, timer);
    } else {
      // 删除字符
      setDisplayText(text);
    }

    // 调用外部的onChangeText
    onChangeText(text);
  };

  // 组件卸载时清除所有定时器
  useEffect(() => {
    return () => {
      timersRef.current.forEach(timer => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  return (
    <View>
      <TextInput
        style={[
          styles.input,
          props.style,
          {
            color: foreground,
          },
        ]}
        value={displayText}
        onChangeText={handleChangeText}
        placeholderTextColor={muted}
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 48,
    fontSize: 16,
  },
  error: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
});
