import { useState } from 'react';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UpdateInfo {
  has_update: boolean;
  current_version: string;
  latest_version: string;
  force_update: boolean;
  update_url: string;
  release_notes: string;
  release_date: string;
}

export function useAppUpdate() {
  const [loading, setLoading] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  const STORAGE_KEYS = {
    LAST_UPDATE_CHECK: 'last_update_check_time',
    SKIP_UPDATE_UNTIL: 'skip_update_until',
  };

  const checkForUpdate = async () => {
    // 如果在开发环境或网页端，不检查更新
    if (__DEV__ || Platform.OS === 'web') {
      return null;
    }

    setLoading(true);
    try {
      const currentVersion = '1.0.0';
      const backendBaseUrl = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

      const response = await fetch(`${backendBaseUrl}/api/v1/app/check-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: Platform.OS === 'android' ? 'android' : 'ios',
          current_version: currentVersion,
          build_number: 100,
        }),
      });

      if (!response.ok) {
        throw new Error('检查更新失败');
      }

      const data = await response.json();
      setUpdateInfo(data);

      return data;
    } catch (error) {
      console.error('检查更新失败:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const showUpdateDialog = () => {
    if (!updateInfo || !updateInfo.has_update) {
      return;
    }

    const message = `当前版本: ${updateInfo.current_version}\n最新版本: ${updateInfo.latest_version}\n\n${updateInfo.release_notes}`;

    if (updateInfo.force_update) {
      Alert.alert(
        '发现新版本',
        message,
        [
          {
            text: '立即更新',
            onPress: () => {
              // TODO: 实现更新逻辑
              Alert.alert('提示', '更新功能开发中...');
            },
          },
        ],
        { cancelable: false }
      );
    } else {
      Alert.alert(
        '发现新版本',
        message,
        [
          {
            text: '下次继续',
            style: 'cancel',
          },
          {
            text: '立即更新',
            onPress: () => {
              // TODO: 实现更新逻辑
              Alert.alert('提示', '更新功能开发中...');
            },
          },
        ],
        { cancelable: true }
      );
    }
  };

  const checkAndShowUpdate = async () => {
    // 检查是否在跳过时间段内
    const skipUntil = await AsyncStorage.getItem(STORAGE_KEYS.SKIP_UPDATE_UNTIL);
    if (skipUntil && Date.now() < parseInt(skipUntil, 10)) {
      console.log('用户选择下次继续，跳过更新检查');
      return false;
    }

    const info = await checkForUpdate();
    if (info && info.has_update) {
      showUpdateDialog();
      return true;
    }
    return false;
  };

  const checkAutoUpdate = async () => {
    // 检查上次检查时间
    const lastCheckTime = await AsyncStorage.getItem(STORAGE_KEYS.LAST_UPDATE_CHECK);
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000; // 24小时

    // 如果上次检查时间不足24小时，则跳过
    if (lastCheckTime && now - parseInt(lastCheckTime, 10) < oneDay) {
      return false;
    }

    // 检查更新
    const hasUpdate = await checkAndShowUpdate();

    // 记录检查时间
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_UPDATE_CHECK, now.toString());

    return hasUpdate;
  };

  const skipUpdate = async () => {
    // 设置"下次继续"，24小时后再提醒
    const skipUntil = Date.now() + 24 * 60 * 60 * 1000; // 24小时后
    await AsyncStorage.setItem(STORAGE_KEYS.SKIP_UPDATE_UNTIL, skipUntil.toString());
  };

  return {
    loading,
    updateInfo,
    checkForUpdate,
    showUpdateDialog,
    checkAndShowUpdate,
    checkAutoUpdate,
    skipUpdate,
    UpdateModal: () => null, // 暂时返回null，不使用Modal
  };
}
