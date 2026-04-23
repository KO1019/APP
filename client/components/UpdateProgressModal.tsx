import React from 'react';
import { View, Text, ActivityIndicator, Modal, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';

interface UpdateProgressModalProps {
  visible: boolean;
  downloading: boolean;
  downloadProgress: number;
}

// 暖橙色主题配色
const THEME = {
  surface: 'rgba(255, 255, 255, 0.95)',
  accent: '#EA580C',
  foreground: '#78350F',
  muted: '#A16207',
  background: '#FFF7ED',
};

export function UpdateProgressModal({ visible, downloading, downloadProgress }: UpdateProgressModalProps) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="none">
      <Animated.View style={styles.modalOverlay} entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)}>
        <Animated.View
          style={[styles.modalContent, { backgroundColor: THEME.surface }]}
          entering={ZoomIn.duration(300).springify().damping(15)}
          exiting={ZoomOut.duration(200)}
        >
          {downloading ? (
            <>
              <ActivityIndicator size="large" color={THEME.accent} style={styles.spinner} />
              <Text style={[styles.progressText, { color: THEME.foreground }]}>下载中... {downloadProgress}%</Text>
              <View style={[styles.progressBarContainer, { backgroundColor: `${THEME.accent}15` }]}>
                <View style={[styles.progressBar, { backgroundColor: THEME.accent, width: `${downloadProgress}%` }]} />
              </View>
            </>
          ) : (
            <>
              <Animated.View
                style={[styles.successIcon, { backgroundColor: `${THEME.accent}15` }]}
                entering={ZoomIn.duration(400).delay(100)}
              >
                <Text style={styles.successEmoji}>✅</Text>
              </Animated.View>
              <Animated.Text
                style={[styles.successText, { color: THEME.foreground }]}
                entering={FadeIn.duration(300).delay(200)}
              >
                下载完成
              </Animated.Text>
              <Animated.Text
                style={[styles.successSubText, { color: THEME.muted }]}
                entering={FadeIn.duration(300).delay(300)}
              >
                安装界面已打开
              </Animated.Text>
            </>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    minWidth: 280,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  spinner: {
    marginBottom: 16,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successEmoji: {
    fontSize: 40,
  },
  successText: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  successSubText: {
    fontSize: 14,
  },
});
