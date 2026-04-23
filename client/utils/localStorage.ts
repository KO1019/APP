import AsyncStorage from '@react-native-async-storage/async-storage';

// 存储键
const STORAGE_KEYS = {
  DIARIES: '@ai_diary_local_diaries',
  CHAT_HISTORY: '@ai_diary_local_chat_history',
  PENDING_UPLOAD: '@ai_diary_pending_upload', // 待上传的数据
};

// 日记类型
export interface LocalDiary {
  id: string;
  title: string;
  content: string;
  mood: string;
  mood_intensity?: number | null;
  weather?: string | null;
  tags: string[];
  images: string[];
  location?: { latitude: number; longitude: number } | null;
  template_id?: string | null;
  created_at: string;
  updated_at: string;
  is_uploaded?: boolean; // 是否已上传到云端
}

// 聊天记录类型
export interface LocalChatMessage {
  id: string;
  user_message: string;
  ai_message: string;
  related_diary_id?: string;
  created_at: string;
  is_uploaded?: boolean; // 是否已上传到云端
}

// ===== 工具函数 =====

/**
 * 生成本地ID
 */
export function generateLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ===== 日记操作 =====

/**
 * 保存日记到本地（始终保存本地）
 */
export async function saveDiaryLocally(diary: LocalDiary): Promise<void> {
  try {
    const diaries = await getLocalDiaries();
    const existingIndex = diaries.findIndex(d => d.id === diary.id);

    if (existingIndex >= 0) {
      diaries[existingIndex] = { ...diary, updated_at: new Date().toISOString() };
    } else {
      diaries.push(diary);
    }

    await AsyncStorage.setItem(STORAGE_KEYS.DIARIES, JSON.stringify(diaries));
  } catch (error) {
    console.error('Error saving diary locally:', error);
    throw error;
  }
}

/**
 * 获取所有本地日记
 */
export async function getLocalDiaries(): Promise<LocalDiary[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.DIARIES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting local diaries:', error);
    return [];
  }
}

/**
 * 根据ID获取本地日记
 */
export async function getLocalDiaryById(id: string): Promise<LocalDiary | null> {
  try {
    const diaries = await getLocalDiaries();
    return diaries.find(d => d.id === id) || null;
  } catch (error) {
    console.error('Error getting local diary by id:', error);
    return null;
  }
}

/**
 * 删除本地日记
 */
export async function deleteLocalDiary(id: string): Promise<void> {
  try {
    const diaries = await getLocalDiaries();
    const filtered = diaries.filter(d => d.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.DIARIES, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting local diary:', error);
    throw error;
  }
}

/**
 * 获取未上传的日记
 */
export async function getUnuploadedDiaries(): Promise<LocalDiary[]> {
  try {
    const diaries = await getLocalDiaries();
    return diaries.filter(d => !d.is_uploaded);
  } catch (error) {
    console.error('Error getting unuploaded diaries:', error);
    return [];
  }
}

/**
 * 标记日记为已上传
 */
export async function markDiaryAsUploaded(id: string): Promise<void> {
  try {
    const diaries = await getLocalDiaries();
    const updated = diaries.map(d => d.id === id ? { ...d, is_uploaded: true } : d);
    await AsyncStorage.setItem(STORAGE_KEYS.DIARIES, JSON.stringify(updated));
  } catch (error) {
    console.error('Error marking diary as uploaded:', error);
    throw error;
  }
}

// ===== 聊天记录操作 =====

/**
 * 保存聊天消息到本地（完整对话）
 */
export async function saveChatMessageLocally(
  id: string,
  userMessage: string,
  aiMessage: string,
  relatedDiaryId: string | null,
  isUploaded: boolean = false
): Promise<void> {
  try {
    const messages = await getLocalChatMessages();
    const existingIndex = messages.findIndex(m => m.id === id);

    const newMessage: LocalChatMessage = {
      id,
      user_message: userMessage,
      ai_message: aiMessage,
      related_diary_id: relatedDiaryId || undefined,
      created_at: new Date().toISOString(),
      is_uploaded: isUploaded,
    };

    if (existingIndex >= 0) {
      messages[existingIndex] = { ...messages[existingIndex], ...newMessage };
    } else {
      messages.push(newMessage);
    }

    await AsyncStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(messages));
  } catch (error) {
    console.error('Error saving chat message locally:', error);
    throw error;
  }
}

/**
 * 获取所有本地聊天消息
 */
export async function getLocalChatMessages(): Promise<LocalChatMessage[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting local chat messages:', error);
    return [];
  }
}

/**
 * 根据ID获取单个聊天消息
 */
export async function getLocalChatMessage(id: string): Promise<LocalChatMessage | null> {
  try {
    const messages = await getLocalChatMessages();
    return messages.find(m => m.id === id) || null;
  } catch (error) {
    console.error('Error getting local chat message by id:', error);
    return null;
  }
}

/**
 * 删除本地聊天消息
 */
export async function deleteLocalChatMessage(id: string): Promise<void> {
  try {
    const messages = await getLocalChatMessages();
    const filtered = messages.filter(m => m.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting local chat message:', error);
    throw error;
  }
}

/**
 * 根据日记ID获取相关聊天记录
 */
export async function getChatMessagesByDiaryId(diaryId: string): Promise<LocalChatMessage[]> {
  try {
    const messages = await getLocalChatMessages();
    return messages.filter(m => m.related_diary_id === diaryId);
  } catch (error) {
    console.error('Error getting chat messages by diary id:', error);
    return [];
  }
}

/**
 * 获取未上传的聊天消息
 */
export async function getUnuploadedChatMessages(): Promise<LocalChatMessage[]> {
  try {
    const messages = await getLocalChatMessages();
    return messages.filter(m => !m.is_uploaded);
  } catch (error) {
    console.error('Error getting unuploaded chat messages:', error);
    return [];
  }
}

/**
 * 标记聊天消息为已上传
 */
export async function markChatMessageAsUploaded(id: string): Promise<void> {
  try {
    const messages = await getLocalChatMessages();
    const updated = messages.map(m => m.id === id ? { ...m, is_uploaded: true } : m);
    await AsyncStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error marking chat message as uploaded:', error);
    throw error;
  }
}

// ===== 同步操作 =====

/**
 * 清空本地数据（慎用）
 */
export async function clearAllLocalData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.DIARIES,
      STORAGE_KEYS.CHAT_HISTORY,
      STORAGE_KEYS.PENDING_UPLOAD,
    ]);
  } catch (error) {
    console.error('Error clearing local data:', error);
    throw error;
  }
}

/**
 * 同步本地未上传的日记到云端
 * @param token 用户认证token
 * @param apiUrlBuilder 构建API URL的函数
 * @returns 成功上传的数量
 */
export async function syncLocalDiariesToCloud(
  token: string,
  apiUrlBuilder: (endpoint: string) => string
): Promise<{ success: number; failed: number }> {
  try {
    const unuploadedDiaries = await getUnuploadedDiaries();

    if (unuploadedDiaries.length === 0) {
      return { success: 0, failed: 0 };
    }

    let successCount = 0;
    let failedCount = 0;

    for (const diary of unuploadedDiaries) {
      try {
        // 准备日记数据，过滤掉id字段（因为云端会生成新的id）
        const { id, is_uploaded, ...diaryData } = diary;

        const response = await fetch(apiUrlBuilder('/api/v1/diaries'), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(diaryData),
        });

        if (response.ok) {
          // 标记为已上传
          await markDiaryAsUploaded(id);
          successCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        console.error(`Failed to sync diary ${diary.id}:`, error);
        failedCount++;
      }
    }

    return { success: successCount, failed: failedCount };
  } catch (error) {
    console.error('Error syncing local diaries:', error);
    return { success: 0, failed: 0 };
  }
}
