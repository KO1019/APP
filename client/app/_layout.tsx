import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { View, Text, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import { FontAwesome6 } from '@expo/vector-icons';
import { Provider } from '@/components/Provider';
import { PasswordProvider } from '@/contexts/PasswordContext';
import { AppLockProvider } from '@/components/AppLockProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import { API_CONFIG, validateConfig } from '@/config';
import DebugPanel from '@/components/DebugPanel';
import { debug } from '@/components/DebugPanel';

import '../global.css';

// 在应用启动时验证配置
if (!validateConfig()) {
  const errorMsg = '[App] 配置验证失败，请检查 .env 文件';
  debug.error(errorMsg);
  console.error(errorMsg);
  console.error('[App] 当前后端URL:', API_CONFIG.baseUrl);
  console.error('[App] 请确保已设置 EXPO_PUBLIC_BACKEND_BASE_URL 环境变量');
} else {
  debug.info('[App] 配置验证通过');
  debug.info(`[App] 后端URL: ${API_CONFIG.baseUrl}`);
}

// 忽略特定的警告
LogBox.ignoreLogs([
  'Warning: ...',
  'Remote debugger is in a background tab',
]);

// 自定义Toast样式
const toastConfig = {
  success: (internalState: any) => (
    <View style={styles.toastContainer}>
      <View style={[styles.toastIcon, { backgroundColor: '#10B981' }]}>
        <FontAwesome6 name="check" size={16} color="#FFFFFF" />
      </View>
      <View style={styles.toastContent}>
        <Text style={styles.toastTitle}>{internalState.text1}</Text>
        {internalState.text2 && (
          <Text style={styles.toastMessage}>{internalState.text2}</Text>
        )}
      </View>
    </View>
  ),
  error: (internalState: any) => (
    <View style={styles.toastContainer}>
      <View style={[styles.toastIcon, { backgroundColor: '#EF4444' }]}>
        <FontAwesome6 name="circle-exclamation" size={16} color="#FFFFFF" />
      </View>
      <View style={styles.toastContent}>
        <Text style={styles.toastTitle}>{internalState.text1}</Text>
        {internalState.text2 && (
          <Text style={styles.toastMessage}>{internalState.text2}</Text>
        )}
      </View>
    </View>
  ),
  info: (internalState: any) => (
    <View style={styles.toastContainer}>
      <View style={[styles.toastIcon, { backgroundColor: '#3B82F6' }]}>
        <FontAwesome6 name="circle-info" size={16} color="#FFFFFF" />
      </View>
      <View style={styles.toastContent}>
        <Text style={styles.toastTitle}>{internalState.text1}</Text>
        {internalState.text2 && (
          <Text style={styles.toastMessage}>{internalState.text2}</Text>
        )}
      </View>
    </View>
  ),
};

LogBox.ignoreLogs([
  "TurboModuleRegistry.getEnforcing(...): 'RNMapsAirModule' could not be found",
  // 添加其它想暂时忽略的错误或警告信息
]);

export default function RootLayout() {
  return (
    <AuthProvider>
      <PasswordProvider>
        <AppLockProvider>
          <Provider>
            <Stack
              screenOptions={{
                animation: 'slide_from_right',
                gestureEnabled: true,
                gestureDirection: 'horizontal',
                headerShown: false
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="splash" options={{ headerShown: false, gestureEnabled: false }} />
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="register" options={{ headerShown: false }} />
              <Stack.Screen name="welcome" options={{ headerShown: false, gestureEnabled: false }} />
              <Stack.Screen name="lock-screen" options={{ headerShown: false, gestureEnabled: false }} />
              <Stack.Screen name="setup-password" options={{ headerShown: false }} />
              <Stack.Screen name="download" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="write-diary" options={{ headerShown: false }} />
              <Stack.Screen name="diary-detail" options={{ headerShown: false }} />
              <Stack.Screen name="conversation-history" options={{ headerShown: false }} />
              <Stack.Screen name="voice-chat-realtime" options={{ headerShown: false }} />
              <Stack.Screen name="change-password" options={{ headerShown: false }} />
              <Stack.Screen name="profile-info" options={{ headerShown: false }} />
              <Stack.Screen name="privacy-settings" options={{ headerShown: false }} />
              <Stack.Screen name="about" options={{ headerShown: false }} />
            </Stack>
            <Toast config={toastConfig} />
            {/* 开发模式下显示调试面板 */}
            {typeof __DEV__ !== 'undefined' && __DEV__ && <DebugPanel />}
          </Provider>
        </AppLockProvider>
      </PasswordProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  toastIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  toastContent: {
    flex: 1,
  },
  toastTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  toastMessage: {
    fontSize: 13,
    color: '#6B7280',
  },
});
