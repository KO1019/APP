import { useState, useRef } from 'react';
import { Platform, Alert, View, Text, ActivityIndicator, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';

interface UpdateInfo {
  has_update: boolean;
  current_version: string;
  latest_version: string;
  force_update: boolean;
  update_url: string;
  release_notes: string;
  release_date: string;
}

interface DownloadProgress {
  totalBytesWritten: number;
  totalBytesExpectedToWrite: number;
}

export function useAppUpdate() {
  const [loading, setLoading] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloading, setDownloading] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const downloadCallbackRef = useRef<FileSystem.DownloadProgressCallback | null>(null);

  const STORAGE_KEYS = {
    LAST_UPDATE_CHECK: 'last_update_check_time',
    SKIP_UPDATE_UNTIL: 'skip_update_until',
  };

  // 下载进度回调
  const handleDownloadProgress = (data: FileSystem.DownloadProgressData) => {
    const progress = data.totalBytesWritten / data.totalBytesExpectedToWrite;
    setDownloadProgress(Math.round(progress * 100));
  };

  // 下载APK文件
  const downloadAndInstallAPK = async (updateUrl: string, version: string): Promise<boolean> => {
    try {
      setDownloading(true);
      setDownloadProgress(0);
      setShowProgressModal(true);

      // 生成文件名
      const fileName = `emotion-diary-v${version}.apk`;
      const downloadResumable = FileSystem.createDownloadResumable(
        updateUrl,
        FileSystem.documentDirectory + fileName,
        {},
        handleDownloadProgress
      );

      console.log('[Update] 开始下载APK:', updateUrl);
      const result = await downloadResumable.downloadAsync();

      if (!result) {
        throw new Error('下载失败：文件未保存');
      }

      console.log('[Update] APK下载成功:', result.uri);

      // 下载完成，打开安装界面
      const success = await openAPKForInstall(result.uri);

      if (success) {
        setDownloadProgress(100);
        Alert.alert('下载完成', '安装界面已打开，请完成安装');
      }

      return success;
    } catch (error: any) {
      console.error('[Update] 下载APK失败:', error);
      Alert.alert('下载失败', error.message || '无法下载更新文件，请检查网络连接');
      return false;
    } finally {
      setDownloading(false);
      setTimeout(() => setShowProgressModal(false), 2000);
    }
  };

  // 打开APK安装界面
  const openAPKForInstall = async (fileUri: string): Promise<boolean> => {
    try {
      if (Platform.OS === 'android') {
        const canOpen = await IntentLauncher.canOpenURL(fileUri);
        if (!canOpen) {
          throw new Error('无法打开APK文件');
        }

        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: fileUri,
          flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
          type: 'application/vnd.android.package-archive',
        });

        return true;
      } else {
        Alert.alert('提示', 'iOS系统暂不支持应用内更新，请前往App Store更新');
        return false;
      }
    } catch (error: any) {
      console.error('[Update] 打开安装界面失败:', error);
      Alert.alert('打开失败', error.message || '无法打开安装界面');
      return false;
    }
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
        '发现新版本（强制更新）',
        message,
        [
          {
            text: '立即更新',
            onPress: () => {
              if (updateInfo.update_url) {
                downloadAndInstallAPK(updateInfo.update_url, updateInfo.latest_version);
              } else {
                Alert.alert('错误', '更新链接无效，请联系管理员');
              }
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
            onPress: () => {
              skipUpdate();
            },
          },
          {
            text: '立即更新',
            onPress: () => {
              if (updateInfo.update_url) {
                downloadAndInstallAPK(updateInfo.update_url, updateInfo.latest_version);
              } else {
                Alert.alert('错误', '更新链接无效，请联系管理员');
              }
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
      console.log('[Update] 用户选择下次继续，跳过更新检查');
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
    console.log('[Update] 已设置跳过更新，24小时后再提醒');
  };

  // 下载进度Modal组件
  const UpdateModal = () => {
    if (!showProgressModal) return null;

    return (
      <Modal
        visible={showProgressModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {downloading ? (
              <>
                <ActivityIndicator size="large" color="#667eea" style={styles.spinner} />
                <Text style={styles.progressText}>下载中... {downloadProgress}%</Text>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${downloadProgress}%` }]} />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.successText}>✅ 下载完成</Text>
                <Text style={styles.successSubText}>安装界面已打开</Text>
              </>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  return {
    loading,
    updateInfo,
    downloadProgress,
    downloading,
    showProgressModal,
    checkForUpdate,
    showUpdateDialog,
    checkAndShowUpdate,
    checkAutoUpdate,
    skipUpdate,
    downloadAndInstallAPK,
    UpdateModal,
  };
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    minWidth: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  spinner: {
    marginBottom: 16,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 16,
  },
  progressBarContainer: {
    width: '100%',
    height: 6,
    backgroundColor: '#E9ECEF',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 3,
  },
  successText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#28A745',
    marginBottom: 8,
  },
  successSubText: {
    fontSize: 14,
    color: '#6C757D',
  },
});
