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
      /**
       * 服务端文件：server/main.py
       * 接口：POST /api/v1/auth/login
       * Body 参数：username: string, password: string
       */
      const response = await fetch(buildApiUrl('/api/v1/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        // 尝试解析错误响应
        let errorMessage = '登录失败';
        try {
          const data = await response.json();
          errorMessage = data.detail || data.error || errorMessage;
        } catch {
          // 如果响应不是JSON，尝试读取文本
          const text = await response.text();
          errorMessage = text || `登录失败 (${response.status})`;
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
      console.error('Error logging in:', error);
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
        // 尝试解析错误响应
        let errorMessage = '注册失败';
        try {
          const data = await response.json();
          errorMessage = data.detail || data.error || errorMessage;
        } catch {
          // 如果响应不是JSON，尝试读取文本
          const text = await response.text();
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
        // 尝试解析错误响应
        let errorMessage = '更新失败';
        try {
          const responseData = await response.json();
          errorMessage = responseData.detail || responseData.error || errorMessage;
        } catch {
          // 如果响应不是JSON，尝试读取文本
          const text = await response.text();
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
