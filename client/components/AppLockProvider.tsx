import React, { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { usePassword } from '@/contexts/PasswordContext';

export function AppLockProvider({ children }: { children: React.ReactNode }) {
  const router = useSafeRouter();
  const { isLocked, hasPassword, lockApp } = usePassword();

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    // 应用从后台切换到前台时，如果已设置密码且当前不在锁屏页面，则锁定
    if (nextAppState === 'active' && hasPassword) {
      // 延迟一下，避免频繁锁定
      setTimeout(() => {
        lockApp();
        router.replace('/lock-screen');
      }, 500);
    }
  };

  // 监听应用状态变化
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // 应用启动时检查锁屏状态
    if (hasPassword && isLocked) {
      router.replace('/lock-screen');
    }

    return () => subscription.remove();
  }, [hasPassword, isLocked, router, lockApp]);

  return <>{children}</>;
}
