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
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useCSSVariable } from 'uniwind';

const { width, height } = Dimensions.get('window');

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
  const [background, surface, accent, foreground, muted] = useCSSVariable([
    '--color-background',
    '--color-surface',
    '--color-accent',
    '--color-foreground',
    '--color-muted',
  ]) as string[];

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
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <StatusBar barStyle="dark-content" backgroundColor="rgba(0,0,0,0.5)" />
      <View style={styles.overlay}>
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
          style={[styles.container, { backgroundColor: surface, shadowColor: accent }]}
        >
          {/* 头部图片 */}
          {announcement.image_url ? (
            <Image
              source={{ uri: announcement.image_url }}
              style={styles.headerImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.headerPlaceholder, { backgroundColor: `${accent}15` }]}>
              <Text style={styles.placeholderIcon}>📢</Text>
            </View>
          )}

          {/* 内容区域 */}
          <ScrollView style={styles.contentContainer}>
            <View style={styles.content}>
              <Text style={[styles.title, { color: foreground }]}>{announcement.title}</Text>
              <Text style={[styles.contentText, { color: muted }]}>{announcement.content}</Text>
            </View>
          </ScrollView>

          {/* 按钮 */}
          <View style={[styles.buttonContainer, { borderTopColor: `${accent}15` }]}>
            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: accent, shadowColor: accent }]}
              onPress={handleConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmButtonText}>
                {announcement.button_text || '我知道了'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 关闭按钮 */}
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: `${background}90`, shadowColor: accent }]}
            onPress={onClose}
          >
            <Text style={[styles.closeButtonText, { color: muted }]}>✕</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
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
