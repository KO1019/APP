import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { AppState, AppStateStatus } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { usePassword } from '@/contexts/PasswordContext';

export function AppLockProvider({ children }: { children: React.ReactNode }) {
  // Web 端不启用应用锁定
  if (Platform.OS === 'web') {
    return <>{children}</>;
  }

  return <AppLockProviderImpl>{children}</AppLockProviderImpl>;
}

function AppLockProviderImpl({ children }: { children: React.ReactNode }) {
  const router = useSafeRouter();
  const { isLocked, hasPassword, lockApp } = usePassword();

  // 使用 ref 跟踪状态，避免依赖导致的循环
  const stateRef = useRef({ hasPassword, isLocked });
  const lockTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 更新 ref
  useEffect(() => {
    stateRef.current = { hasPassword, isLocked };
  }, [hasPassword, isLocked]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // 应用从后台切换到前台时，如果已设置密码且当前不在锁屏页面，则锁定
      if (nextAppState === 'active' && stateRef.current.hasPassword) {
        // 清除之前的定时器
        if (lockTimeoutRef.current) {
          clearTimeout(lockTimeoutRef.current);
        }
        // 延迟一下，避免频繁锁定
        lockTimeoutRef.current = setTimeout(() => {
          lockApp();
          router.replace('/lock-screen');
        }, 500);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // 应用启动时检查锁屏状态
    if (stateRef.current.hasPassword && stateRef.current.isLocked) {
      router.replace('/lock-screen');
    }

    return () => {
      subscription.remove();
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
      }
    };
  }, [router, lockApp]); // 只依赖 router 和 lockApp

  return <>{children}</>;
}
