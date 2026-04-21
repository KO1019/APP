import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

// 检测是否为 Web 环境
const isWeb = Platform.OS === 'web';

// Web 端兼容的存储函数
const getSecureItemAsync = async (key: string): Promise<string | null> => {
  if (isWeb) return await AsyncStorage.getItem(key);
  return await SecureStore.getItemAsync(key);
};

const setSecureItemAsync = async (key: string, value: string): Promise<void> => {
  if (isWeb) {
    await AsyncStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
};

const deleteSecureItemAsync = async (key: string): Promise<void> => {
  if (isWeb) {
    await AsyncStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
};

export function PasswordProvider({ children }: { children: React.ReactNode }) {
  // Web 端不启用锁屏
  const [isLocked, setIsLocked] = useState(!isWeb);
  const [hasPassword, setHasPassword] = useState(false);
  const [canUseBiometric, setCanUseBiometric] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState<string | null>(null);

  useEffect(() => {
    if (isWeb) {
      setIsLocked(false);
      return;
    }

    const init = async () => {
      const password = await getSecureItemAsync(PASSWORD_KEY);
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
      const biometric = await getSecureItemAsync(BIOMETRIC_KEY);
      setBiometricEnabled(biometric === 'true');

      const offline = await getSecureItemAsync(OFFLINE_MODE_KEY);
      setOfflineMode(offline === 'true');

      const key = await getSecureItemAsync(ENCRYPTION_KEY);
      if (key) setEncryptionKey(key);
    };
    load();
  }, []);

  const lockApp = useCallback(() => {
    if (isWeb) return;
    setIsLocked(true);
  }, []);

  const unlockApp = async (password: string, isGuest: boolean = false): Promise<boolean> => {
    if (isWeb) return true;

    try {
      const storedPassword = await getSecureItemAsync(PASSWORD_KEY);
      if (!storedPassword) return false;

      const hashedPassword = CryptoJS.SHA256(password).toString();
      const isValid = hashedPassword === storedPassword;

      if (isValid) {
        setIsLocked(false);
        if (!isGuest) {
          const key = generateEncryptionKey();
          setEncryptionKey(key);
          await setSecureItemAsync(ENCRYPTION_KEY, key);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Unlock error:', error);
      return false;
    }
  };

  const setupPassword = async (type: PasswordType, password: string): Promise<void> => {
    if (isWeb) return;

    try {
      const salt = CryptoJS.lib.WordArray.random(128 / 8);
      const hashedPassword = CryptoJS.PBKDF2(password, salt, {
        keySize: 256 / 32,
        iterations: 10000,
      }).toString();

      const passwordData = JSON.stringify({
        salt: CryptoJS.enc.Hex.stringify(salt),
        hash: hashedPassword,
        type,
      });

      await setSecureItemAsync(PASSWORD_KEY, passwordData);
      setHasPassword(true);
    } catch (error) {
      console.error('Setup password error:', error);
      throw new Error('Failed to setup password');
    }
  };

  const verifyPassword = async (password: string): Promise<boolean> => {
    if (isWeb) return true;

    try {
      const passwordData = await getSecureItemAsync(PASSWORD_KEY);
      if (!passwordData) return false;

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

  const enableBiometric = async (): Promise<boolean> => {
    if (isWeb) return false;

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: '启用生物识别',
        cancelLabel: '取消',
        fallbackLabel: '使用密码',
      });

      if (result.success) {
        await setSecureItemAsync(BIOMETRIC_KEY, 'true');
        setBiometricEnabled(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Enable biometric error:', error);
      return false;
    }
  };

  const disableBiometric = async (): Promise<void> => {
    try {
      await deleteSecureItemAsync(BIOMETRIC_KEY);
      setBiometricEnabled(false);
    } catch (error) {
      console.error('Disable biometric error:', error);
    }
  };

  const toggleOfflineMode = useCallback(async (enabled: boolean) => {
    setOfflineMode(enabled);
    await setSecureItemAsync(OFFLINE_MODE_KEY, enabled.toString());
  }, []);

  const generateEncryptionKey = (): string => {
    return CryptoJS.lib.WordArray.random(256 / 8).toString();
  };

  const encryptData = (data: string): string => {
    if (!encryptionKey) return data;
    try {
      return CryptoJS.AES.encrypt(data, encryptionKey).toString();
    } catch (error) {
      console.error('Encrypt error:', error);
      return data;
    }
  };

  const decryptData = (encryptedData: string): string | null => {
    if (!encryptionKey) return encryptedData;
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
      return decrypted.toString(CryptoJS.enc.Utf8) || null;
    } catch (error) {
      console.error('Decrypt error:', error);
      return null;
    }
  };

  const exportAllData = async (): Promise<string> => {
    try {
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

  const deleteAllData = async (): Promise<void> => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/diaries`);
      const diaries = await response.json();

      for (const diary of diaries) {
        await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/diaries/${diary.id}`, {
          method: 'DELETE',
        });
      }

      await deleteSecureItemAsync(PASSWORD_KEY);
      await deleteSecureItemAsync(BIOMETRIC_KEY);
      await deleteSecureItemAsync(OFFLINE_MODE_KEY);
      await deleteSecureItemAsync(ENCRYPTION_KEY);

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
