import { useState } from 'react';
import * as Updates from 'expo-updates';
import * as Application from 'expo-application';
import { Platform, Alert, Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, BackHandler } from 'react-native';
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

interface UpdateModalProps {
  updateInfo: UpdateInfo | null;
  showModal: boolean;
  downloading: boolean;
  onClose: () => void;
  onSkip: () => void;
  onUpdate: () => void;
  onExit: () => void;
}

// UpdateModal 组件
function UpdateModal({ updateInfo, showModal, downloading, onClose, onSkip, onUpdate, onExit }: UpdateModalProps) {
  if (!updateInfo || !showModal) {
    return null;
  }

  return (
    <Modal
      visible={showModal}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!updateInfo.force_update) {
          onClose();
        }
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>发现新版本</Text>
            {!updateInfo.force_update && (
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Body */}
          <ScrollView style={styles.modalBody}>
            <View style={styles.versionInfo}>
              <View style={styles.versionRow}>
                <Text style={styles.versionLabel}>当前版本:</Text>
                <Text style={styles.versionValue}>{updateInfo.current_version}</Text>
              </View>
              <View style={styles.versionRow}>
                <Text style={styles.versionLabel}>最新版本:</Text>
                <Text style={styles.versionValueHighlight}>{updateInfo.latest_version}</Text>
              </View>
              {updateInfo.force_update && (
                <View style={styles.forceUpdateBadge}>
                  <Text style={styles.forceUpdateText}>⚠️ 强制更新</Text>
                </View>
              )}
            </View>

            <View style={styles.divider} />

            <Text style={styles.notesTitle}>更新内容:</Text>
            <Text style={styles.releaseNotes}>{updateInfo.release_notes}</Text>
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            {downloading ? (
              <View style={styles.downloadingContainer}>
                <ActivityIndicator size="large" color="#4F46E5" />
                <Text style={styles.downloadingText}>正在下载更新...</Text>
              </View>
            ) : (
              <>
                {!updateInfo.force_update && (
                  <TouchableOpacity
                    style={[styles.button, styles.buttonSkip]}
                    onPress={onSkip}
                  >
                    <Text style={styles.buttonSkipText}>下次继续</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.button, styles.buttonUpdate]}
                  onPress={onUpdate}
                >
                  <Text style={styles.buttonUpdateText}>立即更新</Text>
                </TouchableOpacity>
                {updateInfo.force_update && (
                  <TouchableOpacity
                    style={[styles.button, styles.buttonExit]}
                    onPress={onExit}
                  >
                    <Text style={styles.buttonExitText}>退出应用</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// 样式
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#9CA3AF',
  },
  modalBody: {
    padding: 20,
  },
  versionInfo: {
    marginBottom: 16,
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  versionLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  versionValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  versionValueHighlight: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: 'bold',
  },
  forceUpdateBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  forceUpdateText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  notesTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  releaseNotes: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
  },
  modalFooter: {
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  downloadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  downloadingText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#4F46E5',
    fontWeight: '500',
  },
  button: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSkip: {
    backgroundColor: '#F3F4F6',
  },
  buttonSkipText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  buttonUpdate: {
    backgroundColor: '#4F46E5',
  },
  buttonUpdateText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  buttonExit: {
    backgroundColor: '#DC2626',
  },
  buttonExitText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

// Hook
export function useAppUpdate() {
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [showModal, setShowModal] = useState(false);

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
      const currentVersion = Application.nativeApplicationVersion || '1.0.0';
      const backendBaseUrl = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

      const response = await fetch(`${backendBaseUrl}/api/v1/app/check-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: Platform.OS === 'android' ? 'android' : 'ios',
          current_version: currentVersion,
          build_number: parseInt(Application.nativeBuildVersion || '100', 10),
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

  const downloadUpdate = async () => {
    // 检查 expo-updates 是否可用
    if (!Updates.isEmbeddedLaunch) {
      console.log('Running in development mode, skipping update');
      return false;
    }

    setDownloading(true);
    try {
      // 检查更新
      const update = await Updates.checkForUpdateAsync();

      if (!update.isAvailable) {
        Alert.alert('提示', '没有可用的更新');
        return false;
      }

      // 下载更新
      await Updates.fetchUpdateAsync();

      // 下载完成后自动重启
      await Updates.reloadAsync();

      return true;
    } catch (error) {
      console.error('下载更新失败:', error);
      Alert.alert('错误', '下载更新失败，请稍后重试');
      return false;
    } finally {
      setDownloading(false);
    }
  };

  const skipUpdate = async () => {
    // 设置"下次继续"，24小时后再提醒
    const skipUntil = Date.now() + 24 * 60 * 60 * 1000; // 24小时后
    await AsyncStorage.setItem(STORAGE_KEYS.SKIP_UPDATE_UNTIL, skipUntil.toString());
    setShowModal(false);
  };

  const forceExitApp = () => {
    // 注意：在Web环境中无法真正退出应用
    if (Platform.OS !== 'web') {
      BackHandler.exitApp();
    } else {
      console.log('Web环境无法退出应用');
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
      setShowModal(true);
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

  return {
    loading,
    downloading,
    updateInfo,
    showModal,
    checkForUpdate,
    downloadUpdate,
    showUpdateDialog: () => setShowModal(true),
    checkAndShowUpdate,
    checkAutoUpdate,
    skipUpdate,
    forceExitApp,
    UpdateModal: () => (
      <UpdateModal
        updateInfo={updateInfo}
        showModal={showModal}
        downloading={downloading}
        onClose={() => setShowModal(false)}
        onSkip={skipUpdate}
        onUpdate={downloadUpdate}
        onExit={forceExitApp}
      />
    ),
  };
}
