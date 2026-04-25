import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

interface DebugLog {
  timestamp: string;
  message: string;
  type: 'info' | 'warn' | 'error';
}

let logs: DebugLog[] = [];
let maxLogs = 50;

// 重写console方法，同步输出到调试面板
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleInfo = console.info;
const originalConsoleLog = console.log;

if (typeof __DEV__ !== 'undefined' && __DEV__) {
  console.error = (...args: any[]) => {
    // 先调用原始console输出
    originalConsoleError.apply(console, args);
    // 然后记录到日志数组
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
    const log: DebugLog = {
      timestamp: new Date().toLocaleTimeString(),
      message: message.substring(0, 500), // 限制长度
      type: 'error'
    };
    logs = [log, ...logs].slice(0, maxLogs);
  };

  console.warn = (...args: any[]) => {
    originalConsoleWarn.apply(console, args);
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
    const log: DebugLog = {
      timestamp: new Date().toLocaleTimeString(),
      message: message.substring(0, 500),
      type: 'warn'
    };
    logs = [log, ...logs].slice(0, maxLogs);
  };

  console.info = (...args: any[]) => {
    originalConsoleInfo.apply(console, args);
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
    const log: DebugLog = {
      timestamp: new Date().toLocaleTimeString(),
      message: message.substring(0, 500),
      type: 'info'
    };
    logs = [log, ...logs].slice(0, maxLogs);
  };

  console.log = (...args: any[]) => {
    originalConsoleLog.apply(console, args);
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
    const log: DebugLog = {
      timestamp: new Date().toLocaleTimeString(),
      message: message.substring(0, 500),
      type: 'info'
    };
    logs = [log, ...logs].slice(0, maxLogs);
  };
}

export const debug = {
  info: (message: string) => {
    const log: DebugLog = {
      timestamp: new Date().toLocaleTimeString(),
      message: message.substring(0, 500),
      type: 'info'
    };
    logs = [log, ...logs].slice(0, maxLogs);
  },
  warn: (message: string) => {
    const log: DebugLog = {
      timestamp: new Date().toLocaleTimeString(),
      message: message.substring(0, 500),
      type: 'warn'
    };
    logs = [log, ...logs].slice(0, maxLogs);
  },
  error: (message: string) => {
    const log: DebugLog = {
      timestamp: new Date().toLocaleTimeString(),
      message: message.substring(0, 500),
      type: 'error'
    };
    logs = [log, ...logs].slice(0, maxLogs);
  },
  getLogs: () => logs,
  clearLogs: () => {
    logs = [];
  }
};

export default function DebugPanel() {
  const [visible, setVisible] = useState(false);
  const [currentLogs, setCurrentLogs] = useState<DebugLog[]>(logs);

  const toggleDebug = () => {
    setCurrentLogs(logs);
    setVisible(!visible);
  };

  const clearLogs = () => {
    debug.clearLogs();
    setCurrentLogs([]);
  };

  return (
    <>
      {/* 调试按钮 */}
      <TouchableOpacity
        style={styles.debugButton}
        onPress={toggleDebug}
        activeOpacity={0.7}
      >
        <Text style={styles.debugButtonText}>🔍</Text>
      </TouchableOpacity>

      {/* 调试面板 */}
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>调试日志</Text>
              <View style={styles.headerButtons}>
                <TouchableOpacity onPress={clearLogs} style={styles.clearButton}>
                  <Text style={styles.clearButtonText}>清空</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={toggleDebug} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.logContainer}>
              {currentLogs.length === 0 ? (
                <Text style={styles.emptyText}>暂无日志</Text>
              ) : (
                currentLogs.map((log, index) => (
                  <View key={index} style={[
                    styles.logItem,
                    log.type === 'error' && styles.logError,
                    log.type === 'warn' && styles.logWarn
                  ]}>
                    <Text style={styles.logTimestamp}>{log.timestamp}</Text>
                    <Text style={styles.logMessage} numberOfLines={2}>
                      {log.message}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.configInfo}>
              <Text style={styles.configLabel}>配置信息:</Text>
              {typeof __DEV__ !== 'undefined' && __DEV__ && (
                <>
                  <Text style={styles.configText}>后端URL: {process.env.EXPO_PUBLIC_BACKEND_BASE_URL || '未配置'}</Text>
                  <Text style={styles.configText}>平台: {typeof window !== 'undefined' ? 'web' : 'native'}</Text>
                  <Text style={styles.configText}>环境: {process.env.NODE_ENV || 'unknown'}</Text>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  debugButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  debugButtonText: {
    fontSize: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.9,
    maxHeight: height * 0.6,
    backgroundColor: '#1F2937',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#374151',
    borderBottomWidth: 1,
    borderBottomColor: '#4B5563',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#4B5563',
    borderRadius: 6,
  },
  clearButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  closeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  logContainer: {
    flex: 1,
    padding: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 40,
  },
  logItem: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 6,
    backgroundColor: '#374151',
    borderRadius: 8,
    gap: 12,
  },
  logError: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  logWarn: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  logTimestamp: {
    fontSize: 10,
    color: '#9CA3AF',
    minWidth: 70,
  },
  logMessage: {
    flex: 1,
    fontSize: 12,
    color: '#E5E7EB',
  },
  configInfo: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#374151',
    borderTopWidth: 1,
    borderTopColor: '#4B5563',
  },
  configLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  configText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 2,
  },
});
