import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useCSSVariable } from 'uniwind';

export default function WriteDiaryScreen() {
  const router = useSafeRouter();
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [background, surface, accent, foreground, muted, border] = useCSSVariable([
    '--color-background',
    '--color-surface',
    '--color-accent',
    '--color-foreground',
    '--color-muted',
    '--color-border',
  ]) as string[];

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('提示', '请输入日记内容');
      return;
    }

    try {
      setSubmitting(true);

      /**
       * 服务端文件：server/src/index.ts
       * 接口：POST /api/v1/diaries
       * Body 参数：content: string
       */
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/diaries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to create diary');
      }

      Alert.alert('成功', '日记已保存，AI 正在分析情绪...', [
        {
          text: '确定',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error creating diary:', error);
      Alert.alert('错误', '保存失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <View style={[styles.container, { backgroundColor: background }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <FontAwesome6 name="xmark" size={24} color={foreground} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: foreground }]}>写日记</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.contentContainer}>
            <View style={[
              styles.textareaContainer,
              { backgroundColor: surface, borderColor: border }
            ]}>
              <TextInput
                style={[styles.textarea, { color: foreground }]}
                placeholder="今天过得怎么样？记录下你的心情..."
                placeholderTextColor={muted}
                value={content}
                onChangeText={setContent}
                multiline
                autoFocus
                textAlignVertical="top"
              />
              <Text style={[styles.charCount, { color: muted }]}>
                {content.length} 字
              </Text>
            </View>

            <View style={styles.tipsContainer}>
              <FontAwesome6 name="lightbulb" size={16} color={muted} />
              <Text style={[styles.tipsText, { color: muted }]}>
                写完后，AI 会自动分析你的情绪，帮助你更好地了解自己
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: accent, opacity: submitting ? 0.6 : 1 }
              ]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <Text style={[styles.submitButtonText, { color: '#FFFFFF' }]}>保存中...</Text>
              ) : (
                <>
                  <FontAwesome6 name="paper-plane" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={[styles.submitButtonText, { color: '#FFFFFF' }]}>保存日记</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardContainer: {
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
  backButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  textareaContainer: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    minHeight: 300,
  },
  textarea: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
  },
  charCount: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'right',
  },
  tipsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    paddingHorizontal: 8,
    gap: 8,
  },
  tipsText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 16,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
