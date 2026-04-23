import React from 'react';
import { View, Text, ActivityIndicator, Modal, StyleSheet } from 'react-native';

interface UpdateProgressModalProps {
  visible: boolean;
  downloading: boolean;
  downloadProgress: number;
}

export function UpdateProgressModal({ visible, downloading, downloadProgress }: UpdateProgressModalProps) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="fade">
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
