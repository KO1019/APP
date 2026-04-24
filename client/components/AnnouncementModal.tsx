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
          {/* 头部图片区域 */}
          <View style={styles.headerSection}>
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
                <Text style={[styles.placeholderIcon, { color: THEME.accent }]}>📢</Text>
              </Animated.View>
            )}

            {/* 渐变遮罩层 */}
            <Animated.View
              style={styles.headerOverlay}
              entering={FadeIn.duration(500).delay(200)}
            >
              <View style={styles.headerContent}>
                <View style={styles.badgeContainer}>
                  <View style={[styles.priorityBadge, { backgroundColor: THEME.accent }]}>
                    <Text style={styles.priorityBadgeText}>公告</Text>
                  </View>
                </View>
                <Text style={[styles.headerTitle, { color: '#FFFFFF' }]} numberOfLines={2}>
                  {announcement.title}
                </Text>
              </View>
            </Animated.View>

            {/* 关闭按钮 */}
            <Animated.View
              style={styles.closeButtonWrapper}
              entering={FadeIn.duration(300).delay(250)}
              exiting={FadeOut.duration(100)}
            >
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: `${THEME.background}95` }]}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={[styles.closeButtonText, { color: THEME.foreground }]}>✕</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* 内容区域 */}
          <ScrollView
            style={styles.contentContainer}
            contentContainerStyle={styles.contentContainerStyle}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={styles.content} entering={FadeIn.duration(300).delay(150)}>
              <Text style={[styles.contentTitle, { color: THEME.foreground }]}>{announcement.title}</Text>
              <Text style={[styles.contentText, { color: THEME.muted }]}>
                {announcement.content}
              </Text>
            </Animated.View>
          </ScrollView>

          {/* 底部按钮区域 */}
          <Animated.View
            style={[styles.buttonContainer, { backgroundColor: THEME.surface }]}
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
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: width * 0.9,
    maxWidth: 400,
    maxHeight: height * 0.8,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 16,
  },
  headerSection: {
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: 220,
  },
  headerPlaceholder: {
    width: '100%',
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 72,
  },
  headerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 100,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.6) 100%)',
  },
  headerContent: {
    flex: 1,
  },
  badgeContainer: {
    marginBottom: 8,
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  priorityBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  closeButtonWrapper: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
  },
  contentContainerStyle: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  content: {
    gap: 12,
  },
  contentTitle: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 26,
    letterSpacing: 0.2,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 28,
  },
  confirmButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
