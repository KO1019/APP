// 应用入口点 - 根据登录状态重定向
import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  // 等待认证状态加载完成
  if (isLoading) {
    return null;
  }

  // 已登录 → 跳转到首页，未登录 → 跳转到启动页
  return isAuthenticated ? <Redirect href="/(tabs)" /> : <Redirect href="/splash" />;
}
