import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import Toast from 'react-native-toast-message';
import { Provider } from '@/components/Provider';
import { PasswordProvider } from '@/contexts/PasswordContext';
import { AppLockProvider } from '@/components/AppLockProvider';
import { AuthProvider } from '@/contexts/AuthContext';

import '../global.css';

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
              <Stack.Screen name="conversation-history" options={{ headerShown: false }} />
            </Stack>
            <Toast />
          </Provider>
        </AppLockProvider>
      </PasswordProvider>
    </AuthProvider>
  );
}
