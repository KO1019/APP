import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import CryptoJS from 'crypto-js';

export type PasswordType = 'pin' | 'pattern' | 'biometric';

interface PasswordContextType {
  isLocked: boolean;
  hasPassword: boolean;
  canUseBiometric: boolean;
  biometricEnabled: boolean;
  offlineMode: boolean;
  encryptionKey: string | null;
  lockApp: () => void;
  unlockApp: (password: string, isGuest: boolean) => Promise<boolean>;
  setupPassword: (type: PasswordType, password: string) => Promise<void>;
  verifyPassword: (password: string) => Promise<boolean>;
  enableBiometric: () => Promise<boolean>;
  disableBiometric: () => Promise<void>;
  toggleOfflineMode: (enabled: boolean) => void;
  generateEncryptionKey: () => string;
  encryptData: (data: string) => string;
  decryptData: (encryptedData: string) => string | null;
  exportAllData: () => Promise<string>;
  deleteAllData: () => Promise<void>;
}

const PasswordContext = createContext<PasswordContextType | undefined>(undefined);

const PASSWORD_KEY = 'user_password';
const BIOMETRIC_KEY = 'biometric_enabled';
const OFFLINE_MODE_KEY = 'offline_mode';
const ENCRYPTION_KEY = 'encryption_key';

export function PasswordProvider({ children }: { children: React.ReactNode }) {
  const [isLocked, setIsLocked] = useState(true);
  const [hasPassword, setHasPassword] = useState(false);
  const [canUseBiometric, setCanUseBiometric] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState<string | null>(null);

  // 初始化：检查是否已设置密码
  const initializePassword = async () => {
    const password = await SecureStore.getItemAsync(PASSWORD_KEY);
    setHasPassword(!!password);
  };

  const checkBiometricSupport = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setCanUseBiometric(compatible && enrolled);
  };

  const loadSettings = async () => {
    const biometric = await SecureStore.getItemAsync(BIOMETRIC_KEY);
    setBiometricEnabled(biometric === 'true');

    const offline = await SecureStore.getItemAsync(OFFLINE_MODE_KEY);
    setOfflineMode(offline === 'true');

    const key = await SecureStore.getItemAsync(ENCRYPTION_KEY);
    if (key) {
      setEncryptionKey(key);
    }
  };

  useEffect(() => {
    const init = async () => {
      const password = await SecureStore.getItemAsync(PASSWORD_KEY);
      setHasPassword(!!password);
    };
    init();

    const checkBio = async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setCanUseBiometric(compatible && enrolled);
    };
    checkBio();

    const load = async () => {
      const biometric = await SecureStore.getItemAsync(BIOMETRIC_KEY);
      setBiometricEnabled(biometric === 'true');

      const offline = await SecureStore.getItemAsync(OFFLINE_MODE_KEY);
      setOfflineMode(offline === 'true');

      const key = await SecureStore.getItemAsync(ENCRYPTION_KEY);
      if (key) {
        setEncryptionKey(key);
      }
    };
    load();
  }, []);

  // 锁定应用
  const lockApp = useCallback(() => {
    setIsLocked(true);
  }, []);

  // 解锁应用
  const unlockApp = async (password: string, isGuest: boolean = false): Promise<boolean> => {
    try {
      const storedPassword = await SecureStore.getItemAsync(PASSWORD_KEY);

      if (!storedPassword) {
        return false;
      }

      // 验证密码
      const hashedPassword = CryptoJS.SHA256(password).toString();
      const isValid = hashedPassword === storedPassword;

      if (isValid) {
        setIsLocked(false);
        // 如果是主人密码，生成加密密钥
        if (!isGuest) {
          const key = generateEncryptionKey();
          setEncryptionKey(key);
          await SecureStore.setItemAsync(ENCRYPTION_KEY, key);
        }
        return true;
      }

      return false;
    } catch (error) {
      console.error('Unlock error:', error);
      return false;
    }
  };

  // 设置密码
  const setupPassword = async (type: PasswordType, password: string): Promise<void> => {
    try {
      // 使用 PBKDF2 派生密钥（加盐哈希）
      const salt = CryptoJS.lib.WordArray.random(128 / 8);
      const hashedPassword = CryptoJS.PBKDF2(password, salt, {
        keySize: 256 / 32,
        iterations: 10000,
      }).toString();

      // 存储盐值和哈希密码
      const passwordData = JSON.stringify({
        salt: CryptoJS.enc.Hex.stringify(salt),
        hash: hashedPassword,
        type,
      });

      await SecureStore.setItemAsync(PASSWORD_KEY, passwordData);
      setHasPassword(true);
    } catch (error) {
      console.error('Setup password error:', error);
      throw new Error('Failed to setup password');
    }
  };

  // 验证密码
  const verifyPassword = async (password: string): Promise<boolean> => {
    try {
      const passwordData = await SecureStore.getItemAsync(PASSWORD_KEY);

      if (!passwordData) {
        return false;
      }

      const data = JSON.parse(passwordData);
      const salt = CryptoJS.enc.Hex.parse(data.salt);

      const hashedPassword = CryptoJS.PBKDF2(password, salt, {
        keySize: 256 / 32,
        iterations: 10000,
      }).toString();

      return hashedPassword === data.hash;
    } catch (error) {
      console.error('Verify password error:', error);
      return false;
    }
  };

  // 启用生物识别
  const enableBiometric = async (): Promise<boolean> => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: '启用生物识别',
        cancelLabel: '取消',
        fallbackLabel: '使用密码',
      });

      if (result.success) {
        await SecureStore.setItemAsync(BIOMETRIC_KEY, 'true');
        setBiometricEnabled(true);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Enable biometric error:', error);
      return false;
    }
  };

  // 禁用生物识别
  const disableBiometric = async (): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(BIOMETRIC_KEY);
      setBiometricEnabled(false);
    } catch (error) {
      console.error('Disable biometric error:', error);
    }
  };

  // 切换离线模式
  const toggleOfflineMode = async (enabled: boolean) => {
    setOfflineMode(enabled);
    await SecureStore.setItemAsync(OFFLINE_MODE_KEY, enabled.toString());
  };

  // 生成加密密钥
  const generateEncryptionKey = (): string => {
    const key = CryptoJS.lib.WordArray.random(256 / 8).toString();
    return key;
  };

  // 加密数据
  const encryptData = (data: string): string => {
    if (!encryptionKey) return data;
    try {
      const encrypted = CryptoJS.AES.encrypt(data, encryptionKey).toString();
      return encrypted;
    } catch (error) {
      console.error('Encrypt error:', error);
      return data;
    }
  };

  // 解密数据
  const decryptData = (encryptedData: string): string | null => {
    if (!encryptionKey) return encryptedData;
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
      return decryptedString || null;
    } catch (error) {
      console.error('Decrypt error:', error);
      return null;
    }
  };

  // 导出所有数据
  const exportAllData = async (): Promise<string> => {
    try {
      // 获取所有本地数据
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/diaries`);
      const diaries = await response.json();

      const exportData = {
        exportDate: new Date().toISOString(),
        totalDiaries: diaries.length,
        diaries: diaries.map((d: any) => ({
          content: d.content,
          mood: d.mood,
          mood_intensity: d.mood_intensity,
          created_at: d.created_at,
        })),
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Export error:', error);
      throw new Error('Failed to export data');
    }
  };

  // 删除所有数据
  const deleteAllData = async (): Promise<void> => {
    try {
      // 删除所有日记
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/diaries`);
      const diaries = await response.json();

      for (const diary of diaries) {
        await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/diaries/${diary.id}`, {
          method: 'DELETE',
        });
      }

      // 删除本地密码
      await SecureStore.deleteItemAsync(PASSWORD_KEY);
      await SecureStore.deleteItemAsync(BIOMETRIC_KEY);
      await SecureStore.deleteItemAsync(OFFLINE_MODE_KEY);
      await SecureStore.deleteItemAsync(ENCRYPTION_KEY);

      // 重置状态
      setHasPassword(false);
      setBiometricEnabled(false);
      setOfflineMode(false);
      setEncryptionKey(null);
      setIsLocked(false);
    } catch (error) {
      console.error('Delete error:', error);
      throw new Error('Failed to delete data');
    }
  };

  return (
    <PasswordContext.Provider
      value={{
        isLocked,
        hasPassword,
        canUseBiometric,
        biometricEnabled,
        offlineMode,
        encryptionKey,
        lockApp,
        unlockApp,
        setupPassword,
        verifyPassword,
        enableBiometric,
        disableBiometric,
        toggleOfflineMode,
        generateEncryptionKey,
        encryptData,
        decryptData,
        exportAllData,
        deleteAllData,
      }}
    >
      {children}
    </PasswordContext.Provider>
  );
}

export function usePassword() {
  const context = useContext(PasswordContext);
  if (!context) {
    throw new Error('usePassword must be used within PasswordProvider');
  }
  return context;
}
