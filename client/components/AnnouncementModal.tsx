import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
  Modal,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  ZoomIn,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

// 暖橙色主题配色
const THEME = {
  background: '#FFF7ED',
  surface: 'rgba(255, 255, 255, 0.95)',
  accent: '#EA580C',
  foreground: '#78350F',
  muted: '#A16207',
};

interface Announcement {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  button_text?: string;
  priority?: number;
}

interface AnnouncementModalProps {
  visible: boolean;
  announcement: Announcement | null;
  onClose: () => void;
  onConfirm?: () => void;
}

export default function AnnouncementModal({
  visible,
  announcement,
  onClose,
  onConfirm,
}: AnnouncementModalProps) {
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  if (!announcement) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <StatusBar barStyle="dark-content" backgroundColor="rgba(0,0,0,0.5)" />
      <Animated.View style={styles.overlay} entering={FadeIn.duration(250)} exiting={FadeOut.duration(200)}>
        <Animated.View
          style={[styles.container, { backgroundColor: THEME.surface }]}
          entering={SlideInDown.duration(350).springify().damping(20)}
          exiting={SlideOutDown.duration(250)}
        >
          {/* 头部图片 */}
          {announcement.image_url ? (
            <Animated.Image
              source={{ uri: announcement.image_url }}
              style={styles.headerImage}
              resizeMode="cover"
              entering={ZoomIn.duration(400)}
            />
          ) : (
            <Animated.View
              style={[styles.headerPlaceholder, { backgroundColor: `${THEME.accent}15` }]}
              entering={ZoomIn.duration(400)}
            >
              <Text style={styles.placeholderIcon}>📢</Text>
            </Animated.View>
          )}

          {/* 内容区域 */}
          <ScrollView style={styles.contentContainer}>
            <Animated.View style={styles.content} entering={FadeIn.duration(300).delay(150)}>
              <Text style={[styles.title, { color: THEME.foreground }]}>{announcement.title}</Text>
              <Text style={[styles.contentText, { color: THEME.muted }]}>{announcement.content}</Text>
            </Animated.View>
          </ScrollView>

          {/* 按钮 */}
          <Animated.View
            style={[styles.buttonContainer, { borderTopColor: `${THEME.accent}15` }]}
            entering={FadeIn.duration(300).delay(200)}
          >
            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: THEME.accent }]}
              onPress={handleConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmButtonText}>
                {announcement.button_text || '我知道了'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* 关闭按钮 */}
          <Animated.View
            entering={FadeIn.duration(300).delay(250)}
            exiting={FadeOut.duration(100)}
          >
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: `${THEME.background}90` }]}
              onPress={onClose}
            >
              <Text style={[styles.closeButtonText, { color: THEME.muted }]}>✕</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: width * 0.9,
    maxWidth: 400,
    maxHeight: height * 0.8,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 12,
  },
  headerImage: {
    width: '100%',
    height: 200,
  },
  headerPlaceholder: {
    width: '100%',
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 60,
  },
  contentContainer: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    lineHeight: 32,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
  },
  buttonContainer: {
    padding: 24,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
  },
  confirmButton: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  confirmButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
});
