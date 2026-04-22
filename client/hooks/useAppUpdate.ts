import { useState } from 'react';
import * as Updates from 'expo-updates';
import { Platform, Alert } from 'react-native';

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
  const [downloading, setDownloading] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  const checkForUpdate = async () => {
    // 如果在开发环境或网页端，不检查更新
    if (__DEV__ || Platform.OS === 'web') {
      return null;
    }

    setLoading(true);
    try {
      // 检查 expo-updates 是否可用
      if (!Updates.isEmbeddedLaunch) {
        console.log('Running in development mode, skipping update check');
        return null;
      }

      // 检查更新
      const update = await Updates.checkForUpdateAsync();

      if (!update.isAvailable) {
        console.log('No update available');
        setUpdateInfo({
          has_update: false,
          current_version: Updates.runtimeVersion,
          latest_version: Updates.runtimeVersion,
          force_update: false,
          update_url: '',
          release_notes: '',
          release_date: '',
        });
        return null;
      }

      // 获取清单信息（这里需要从后端获取详细的更新信息）
      // 先返回基础信息，让应用显示更新对话框
      setUpdateInfo({
        has_update: true,
        current_version: Updates.runtimeVersion,
        latest_version: update.manifest?.version || 'Unknown',
        force_update: false,
        update_url: '',
        release_notes: update.manifest?.releaseNotes || '新版本可用',
        release_date: update.manifest?.createdAt || new Date().toISOString(),
      });

      return update;
    } catch (error) {
      console.error('检查更新失败:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const downloadUpdate = async (update: any) => {
    setDownloading(true);
    try {
      // 下载更新
      await Updates.fetchUpdateAsync();

      Alert.alert(
        '下载完成',
        '更新已下载完成，需要重启应用才能生效。是否现在重启？',
        [
          {
            text: '稍后',
            style: 'cancel',
          },
          {
            text: '立即重启',
            onPress: async () => {
              // 重启应用
              await Updates.reloadAsync();
            },
          },
        ]
      );

      return true;
    } catch (error) {
      console.error('下载更新失败:', error);
      Alert.alert('错误', '下载更新失败，请稍后重试');
      return false;
    } finally {
      setDownloading(false);
    }
  };

  const showUpdateDialog = (info: UpdateInfo) => {
    const buttons = [
      {
        text: info.force_update ? '立即更新' : '稍后',
        onPress: () => {
          if (!info.force_update) return;
        },
        style: info.force_update ? 'default' : 'cancel' as const,
      },
      {
        text: '立即更新',
        onPress: async () => {
          if (downloading) return;

          // 再次检查是否有更新
          const update = await checkForUpdate();
          if (update) {
            await downloadUpdate(update);
          }
        },
        style: 'default' as const,
      },
    ];

    // 如果不是强制更新，调整按钮顺序
    if (!info.force_update) {
      buttons.pop();
      buttons.push(
        {
          text: '稍后',
          onPress: () => {},
          style: 'cancel' as const,
        },
        {
          text: '立即更新',
          onPress: async () => {
            if (downloading) return;

            const update = await checkForUpdate();
            if (update) {
              await downloadUpdate(update);
            }
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

  const checkAndShowUpdate = async () => {
    const update = await checkForUpdate();
    if (update && updateInfo && updateInfo.has_update) {
      showUpdateDialog(updateInfo);
      return true;
    }
    return false;
  };

  return {
    loading,
    downloading,
    updateInfo,
    checkForUpdate,
    downloadUpdate,
    showUpdateDialog,
    checkAndShowUpdate,
  };
}
