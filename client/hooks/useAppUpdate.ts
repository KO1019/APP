import { useState } from 'react';
import * as Application from 'expo-application';
import { Platform, Alert, Linking } from 'react-native';

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

  const checkForUpdate = async () => {
    setLoading(true);
    try {
      const currentVersion = Application.nativeApplicationVersion || '1.0.0';
      const buildNumber = Application.nativeBuildVersion;

      const platform = Platform.OS === 'android' ? 'android' : 'ios';
      const backendBaseUrl = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

      const response = await fetch(`${backendBaseUrl}/api/v1/app/check-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform,
          current_version: currentVersion,
          build_number: buildNumber ? parseInt(buildNumber, 10) : null,
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
      Alert.alert('错误', '检查更新失败，请稍后重试');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const showUpdateDialog = (info: UpdateInfo) => {
    const buttons = [
      {
        text: info.force_update ? '立即更新' : '稍后',
        onPress: () => {
          if (!info.force_update) return;
          // 强制更新时，不允许稍后
        },
        style: info.force_update ? 'default' : 'cancel' as const,
      },
      {
        text: '立即更新',
        onPress: () => {
          openUpdateUrl(info.update_url);
        },
        style: 'default' as const,
      },
    ];

    // 如果不是强制更新，添加取消按钮
    if (!info.force_update) {
      buttons.pop(); // 移除"稍后"按钮
      buttons.push(
        {
          text: '稍后',
          onPress: () => {},
          style: 'cancel' as const,
        },
        {
          text: '立即更新',
          onPress: () => {
            openUpdateUrl(info.update_url);
          },
          style: 'default' as const,
        }
      );
    }

    Alert.alert(
      '发现新版本',
      `当前版本: ${info.current_version}\n最新版本: ${info.latest_version}\n\n${info.release_notes}`,
      buttons
    );
  };

  const openUpdateUrl = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('错误', '无法打开更新链接');
      }
    } catch (error) {
      console.error('打开更新链接失败:', error);
      Alert.alert('错误', '无法打开更新链接');
    }
  };

  const checkAndShowUpdate = async () => {
    const info = await checkForUpdate();
    if (info && info.has_update) {
      showUpdateDialog(info);
      return true;
    }
    return false;
  };

  return {
    loading,
    updateInfo,
    checkForUpdate,
    showUpdateDialog,
    checkAndShowUpdate,
  };
}
