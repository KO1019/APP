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

import '../global.css';

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
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="register" options={{ headerShown: false }} />
              <Stack.Screen name="lock-screen" options={{ headerShown: false, gestureEnabled: false }} />
              <Stack.Screen name="setup-password" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="write-diary" options={{ headerShown: false }} />
              <Stack.Screen name="diary-detail" options={{ headerShown: false }} />
              <Stack.Screen name="ai-companion" options={{ headerShown: false }} />
              <Stack.Screen name="conversation-history" options={{ headerShown: false }} />
              <Stack.Screen name="voice-chat-realtime" options={{ headerShown: false }} />
            </Stack>
            <Toast config={toastConfig} />
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
