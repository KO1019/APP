import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';

interface Announcement {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  button_text?: string;
  priority?: number;
}

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  // 检查公告是否已读
  const isAnnouncementRead = async (announcementId: string): Promise<boolean> => {
    try {
      const viewed = await AsyncStorage.getItem(`announcement_viewed_${announcementId}`);
      return viewed === 'true';
    } catch {
      return false;
    }
  };

  // 加载公告
  const loadAnnouncements = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/announcements`
      );
      const data = await response.json();

      if (data.success && data.announcements && data.announcements.length > 0) {
        // 过滤掉已读的公告
        const unreadAnnouncements: Announcement[] = [];
        for (const announcement of data.announcements) {
          const isRead = await isAnnouncementRead(announcement.id);
          if (!isRead) {
            unreadAnnouncements.push(announcement);
          }
        }

        if (unreadAnnouncements.length > 0) {
          setAnnouncements(unreadAnnouncements);
          setCurrentIndex(0);
          setIsVisible(true);
        }
      }
    } catch (error) {
      console.error('加载公告失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // 标记当前公告为已查看
  const markAsViewed = useCallback(async (announcementId: string) => {
    try {
      // 本地保存
      await AsyncStorage.setItem(`announcement_viewed_${announcementId}`, 'true');

      // 同时通知后端（可选）
      try {
        await fetch(
          `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/user/announcements/${announcementId}/viewed`,
          { method: 'POST' }
        );
      } catch (e) {
        // 后端记录失败不影响本地功能
        console.warn('后端标记公告失败:', e);
      }
    } catch (error) {
      console.error('标记公告失败:', error);
    }
  }, []);

  // 显示下一个公告
  const showNext = useCallback(() => {
    const currentAnnouncement = announcements[currentIndex];

    if (currentAnnouncement) {
      markAsViewed(currentAnnouncement.id);
    }

    const nextIndex = currentIndex + 1;

    if (nextIndex < announcements.length) {
      setCurrentIndex(nextIndex);
    } else {
      // 所有公告都已显示
      setIsVisible(false);
      setAnnouncements([]);
    }
  }, [announcements, currentIndex, markAsViewed]);

  // 关闭当前公告
  const close = useCallback(() => {
    const currentAnnouncement = announcements[currentIndex];

    if (currentAnnouncement) {
      markAsViewed(currentAnnouncement.id);
    }

    setIsVisible(false);
    setAnnouncements([]);
  }, [announcements, currentIndex, markAsViewed]);

  // 清除已读记录（用于测试或重置）
  const clearReadStatus = useCallback(async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const announcementKeys = keys.filter(key => key.startsWith('announcement_viewed_'));
      await AsyncStorage.multiRemove(announcementKeys);
    } catch (error) {
      console.error('清除已读记录失败:', error);
    }
  }, []);

  // 获取当前公告
  const currentAnnouncement = announcements[currentIndex] || null;

  return {
    currentAnnouncement,
    isVisible,
    isLoading,
    loadAnnouncements,
    showNext,
    close,
    clearReadStatus,
  };
}
