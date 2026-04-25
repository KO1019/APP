import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildApiUrl } from '@/utils';

interface User {
  id: string;
  username: string;
  email: string | null;
  nickname: string;
  avatar: string | null;
  cloud_sync_enabled: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOfflineMode: boolean; // 离线模式
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, email?: string, nickname?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
  toggleCloudSync: () => Promise<void>;
  toggleOfflineMode: () => Promise<void>; // 切换离线模式
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEYS = {
  TOKEN: '@ai_diary_token',
  USER: '@ai_diary_user',
  OFFLINE_MODE: '@ai_diary_offline_mode',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // 初始化：从本地存储恢复登录状态
  useEffect(() => {
    loadAuthData();
  }, []);

  const loadAuthData = async () => {
    try {
      const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      const storedOfflineMode = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_MODE);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));

        // 加载离线模式状态
        if (storedOfflineMode) {
          setIsOfflineMode(storedOfflineMode === 'true');
        }

        // 验证token是否有效（只有在线模式下才验证）
        if (storedOfflineMode !== 'true') {
          await refreshUserInfo(storedToken);
        }
      }
    } catch (error) {
      console.error('Error loading auth data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUserInfo = async (authToken: string) => {
    try {
      /**
       * 服务端文件：server/main.py
       * 接口：GET /api/v1/auth/me
       * Headers: Authorization: Bearer {token}
       */
      const response = await fetch(buildApiUrl('/api/v1/auth/me'), {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
      } else {
        // Token无效，清除登录状态
        await logout();
      }
    } catch (error) {
      console.error('Error refreshing user info:', error);
      // 网络错误不自动登出，保留本地状态
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const apiUrl = buildApiUrl('/api/v1/auth/login');
      console.log('[Auth] ==================== 登录开始 ====================');
      console.log('[Auth] 目标URL:', apiUrl);
      console.log('[Auth] 用户名:', username);
      console.log('[Auth] API配置:', API_CONFIG);
      console.log('[Auth] 环境变量:', process.env.EXPO_PUBLIC_BACKEND_BASE_URL);

      /**
       * 服务端文件：server/main.py
       * 接口：POST /api/v1/auth/login
       * Body 参数：username: string, password: string
       */
      console.log('[Auth] 发送请求...');
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      console.log('[Auth] 响应状态:', response.status);
      console.log('[Auth] 响应类型:', response.type);
      console.log('[Auth] 响应ok:', response.ok);

      if (!response.ok) {
        // 先读取响应内容（只读取一次，避免"body stream already read"错误）
        const text = await response.text();
        console.log('[Auth] 错误响应内容:', text);
        console.log('[Auth] 错误响应长度:', text.length);

        let errorMessage = '登录失败';

        try {
          // 尝试解析为JSON
          const data = JSON.parse(text);
          errorMessage = data.detail || data.error || errorMessage;
          console.log('[Auth] 解析的错误消息:', errorMessage);
        } catch {
          // 如果不是JSON，使用原始文本
          errorMessage = text || `登录失败 (${response.status})`;
          console.log('[Auth] 原始错误文本:', errorMessage);
        }

        console.error('[Auth] 抛出错误:', errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('[Auth] 登录成功！');
      console.log('[Auth] 用户数据:', {
        username: data.user.username,
        email: data.user.email,
        is_admin: data.user.is_admin,
      });
      console.log('[Auth] ==================== 登录结束 ====================');

      // 保存到本地存储
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, data.token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));

      // 更新状态
      setToken(data.token);
      setUser(data.user);
    } catch (error: any) {
      console.error('[Auth] ==================== 登录错误 ====================');
      console.error('[Auth] 错误消息:', error.message);
      console.error('[Auth] 错误类型:', error.name);
      console.error('[Auth] 错误堆栈:', error.stack);
      if (error.cause) {
        console.error('[Auth] 错误原因:', error.cause);
      }
      console.error('[Auth] 目标URL:', buildApiUrl('/api/v1/auth/login'));
      console.error('[Auth] API配置:', API_CONFIG);
      console.error('[Auth] =====================================================');
      throw error;
    }
  };

  const register = async (username: string, password: string, email?: string, nickname?: string) => {
    try {
      /**
       * 服务端文件：server/main.py
       * 接口：POST /api/v1/auth/register
       * Body 参数：username: string, password: string, email?: string, nickname?: string
       */
      const response = await fetch(buildApiUrl('/api/v1/auth/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, email, nickname }),
      });

      if (!response.ok) {
        // 先读取响应内容（只读取一次，避免"body stream already read"错误）
        const text = await response.text();
        let errorMessage = '注册失败';

        try {
          // 尝试解析为JSON
          const data = JSON.parse(text);
          errorMessage = data.detail || data.error || errorMessage;
        } catch {
          // 如果不是JSON，使用原始文本
          errorMessage = text || `注册失败 (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const { user, token: newToken } = data;

      // 保存到本地存储
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, newToken);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));

      // 更新状态
      setToken(newToken);
      setUser(user);
    } catch (error: any) {
      console.error('Error registering:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER);
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    try {
      if (!token) throw new Error('Not authenticated');

      /**
       * 服务端文件：server/main.py
       * 接口：PUT /api/v1/auth/me
       * Headers: Authorization: Bearer {token}
       * Body 参数：nickname?: string, email?: string, avatar?: string, cloud_sync_enabled?: boolean
       */
      const response = await fetch(buildApiUrl('/api/v1/auth/me'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        // 先读取响应内容（只读取一次，避免"body stream already read"错误）
        const text = await response.text();
        let errorMessage = '更新失败';

        try {
          // 尝试解析为JSON
          const responseData = JSON.parse(text);
          errorMessage = responseData.detail || responseData.error || errorMessage;
        } catch {
          // 如果不是JSON，使用原始文本
          errorMessage = text || `更新失败 (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      const updatedUser = responseData.user;

      // 更新本地存储
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));

      // 更新状态
      setUser(updatedUser);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const refreshUser = useCallback(async () => {
    if (token) {
      await refreshUserInfo(token);
    }
  }, [token]);

  const toggleCloudSync = async () => {
    try {
      if (!user) throw new Error('Not authenticated');

      const newStatus = !user.cloud_sync_enabled;

      // 显示确认弹窗
      if (newStatus) {
        // 用户需要同意开启云端同步
        await updateProfile({ cloud_sync_enabled: true });
      } else {
        // 关闭云端同步
        await updateProfile({ cloud_sync_enabled: false });
      }
    } catch (error: any) {
      console.error('Error toggling cloud sync:', error);
      throw error;
    }
  };

  const toggleOfflineMode = async () => {
    try {
      const newOfflineMode = !isOfflineMode;

      if (newOfflineMode) {
        // 开启离线模式：断开所有后端连接
        setIsOfflineMode(true);
        await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_MODE, 'true');
      } else {
        // 关闭离线模式：恢复在线模式
        setIsOfflineMode(false);
        await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_MODE, 'false');

        // 刷新用户信息（验证token）
        if (token) {
          await refreshUserInfo(token);
        }
      }
    } catch (error: any) {
      console.error('Error toggling offline mode:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    isOfflineMode,
    login,
    register,
    logout,
    updateProfile,
    refreshUser,
    toggleCloudSync,
    toggleOfflineMode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
