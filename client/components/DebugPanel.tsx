import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Dimensions, ActivityIndicator, Alert, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { buildApiUrl } from '@/utils';
import { API_CONFIG } from '@/config';

const { width, height } = Dimensions.get('window');

interface DebugLog {
  timestamp: string;
  message: string;
  type: 'info' | 'warn' | 'error';
}

let logs: DebugLog[] = [];
let maxLogs = 200; // 增加日志数量限制

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
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
    const log: DebugLog = {
      timestamp: new Date().toLocaleTimeString(),
      message: message, // 不限制长度
      type: 'error'
    };
    logs = [log, ...logs].slice(0, maxLogs);
  };

  console.warn = (...args: any[]) => {
    originalConsoleWarn.apply(console, args);
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
    const log: DebugLog = {
      timestamp: new Date().toLocaleTimeString(),
      message: message, // 不限制长度
      type: 'warn'
    };
    logs = [log, ...logs].slice(0, maxLogs);
  };

  console.info = (...args: any[]) => {
    originalConsoleInfo.apply(console, args);
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
    const log: DebugLog = {
      timestamp: new Date().toLocaleTimeString(),
      message: message, // 不限制长度
      type: 'info'
    };
    logs = [log, ...logs].slice(0, maxLogs);
  };

  console.log = (...args: any[]) => {
    originalConsoleLog.apply(console, args);
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
    const log: DebugLog = {
      timestamp: new Date().toLocaleTimeString(),
      message: message, // 不限制长度
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
  const [testingConnection, setTestingConnection] = useState(false);

  const toggleDebug = () => {
    setCurrentLogs(logs);
    setVisible(!visible);
  };

  const clearLogs = () => {
    debug.clearLogs();
    setCurrentLogs([]);
  };

  const testConnection = async () => {
    setTestingConnection(true);
    try {
      const healthUrl = buildApiUrl('/api/v1/health');
      debug.info('==================== 测试后端连接 ====================');
      debug.info('目标URL:', healthUrl);
      debug.info('API配置:', JSON.stringify(API_CONFIG, null, 2));
      debug.info('环境变量:', process.env.EXPO_PUBLIC_BACKEND_BASE_URL);

      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      debug.info('响应状态:', response.status);
      debug.info('响应类型:', response.type);

      if (response.ok) {
        const data = await response.json();
        debug.info('连接成功！响应数据:', JSON.stringify(data, null, 2));
        Alert.alert('连接测试', '✅ 后端连接成功！');
      } else {
        const text = await response.text();
        debug.error('连接失败！状态码:', response.status);
        debug.error('错误响应:', text);
        Alert.alert('连接测试', `❌ 后端连接失败\n状态码: ${response.status}\n错误: ${text}`);
      }
      debug.info('====================================================');
    } catch (error: any) {
      debug.error('连接异常！', error.message);
      debug.error('错误详情:', error.toString());
      Alert.alert('连接测试', `❌ 连接异常\n错误: ${error.message}`);
    } finally {
      setCurrentLogs([...logs]);
      setTestingConnection(false);
    }
  };

  const copyLogs = async () => {
    try {
      // 格式化日志内容
      const logText = currentLogs.map(log => {
        const typeIcon = log.type === 'error' ? '❌' : log.type === 'warn' ? '⚠️' : 'ℹ️';
        return `[${log.timestamp}] ${typeIcon} ${log.message}`;
      }).join('\n\n');

      // 添加配置信息
      const configText = `\n\n========== 配置信息 ==========\n`;
      const configDetails = [
        `后端URL: ${API_CONFIG.baseUrl || '未配置'}`,
        `环境变量: ${process.env.EXPO_PUBLIC_BACKEND_BASE_URL || '未设置'}`,
        `平台: ${typeof window !== 'undefined' ? 'web' : 'native'}`,
        typeof window === 'undefined' && `设备: ${Platform.OS} ${Platform.Version}`,
        typeof window === 'undefined' && `网络: ${Platform.OS === 'android' ? '移动网络/WiFi' : 'WiFi'}`,
        `环境: ${process.env.NODE_ENV || 'unknown'}`,
      ].filter(Boolean).join('\n');

      const fullText = logText + configText;

      await Clipboard.setStringAsync(fullText);
      Alert.alert('复制成功', `已复制 ${currentLogs.length} 条日志到剪贴板`);
    } catch (error: any) {
      Alert.alert('复制失败', error.message);
    }
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
                <TouchableOpacity onPress={testConnection} style={styles.testButton} disabled={testingConnection}>
                  {testingConnection ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.testButtonText}>测试连接</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={copyLogs} style={styles.copyButton}>
                  <Text style={styles.copyButtonText}>📋 复制</Text>
                </TouchableOpacity>
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
              <Text style={styles.configText}>后端URL: {API_CONFIG.baseUrl || '未配置'}</Text>
              <Text style={styles.configText}>环境变量: {process.env.EXPO_PUBLIC_BACKEND_BASE_URL || '未设置'}</Text>
              <Text style={styles.configText}>平台: {typeof window !== 'undefined' ? 'web' : 'native'}</Text>
              {typeof window === 'undefined' && (
                <>
                  <Text style={styles.configText}>设备: {Platform.OS} {Platform.Version}</Text>
                  <Text style={styles.configText}>网络: {Platform.OS === 'android' ? '移动网络/WiFi' : 'WiFi'}</Text>
                </>
              )}
              <Text style={styles.configText}>环境: {process.env.NODE_ENV || 'unknown'}</Text>
              <TouchableOpacity onPress={testConnection} style={styles.testConnectionButton} disabled={testingConnection}>
                {testingConnection ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.testConnectionButtonText}>测试中...</Text>
                  </>
                ) : (
                  <Text style={styles.testConnectionButtonText}>🔗 测试后端连接</Text>
                )}
              </TouchableOpacity>
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
    width: 60,
    height: 60,
    borderRadius: 30,
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
    fontSize: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.95, // 增加宽度到95%
    height: height * 0.75, // 改为固定高度，而不是maxHeight
    backgroundColor: '#1F2937',
    borderRadius: 16,
    overflow: 'hidden',
    flexDirection: 'column', // 明确使用列布局
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
    gap: 10,
    alignItems: 'center',
  },
  testButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#10B981',
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  testButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  copyButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#6366F1',
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  copyButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
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
    minHeight: 100, // 确保最小高度
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 40,
  },
  logItem: {
    flexDirection: 'column', // 改为垂直布局
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#374151',
    borderRadius: 8,
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
    marginBottom: 4,
  },
  logMessage: {
    fontSize: 13,
    color: '#E5E7EB',
    lineHeight: 18, // 增加行高
  },
  configInfo: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#374151',
    borderTopWidth: 1,
    borderTopColor: '#4B5563',
    flexShrink: 0, // 防止被压缩
  },
  configLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  configText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  testConnectionButton: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  testConnectionButtonText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
