import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Switch } from 'react-native';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useCSSVariable } from 'uniwind';
import Toast from 'react-native-toast-message';
import { buildApiUrl } from '@/utils';

interface PrivacySettings {
  cloud_sync_enabled: boolean;
  data_encryption_enabled: boolean;
  anonymous_analytics: boolean;
}

export default function PrivacySettingsScreen() {
  const { user, token } = useAuth();

  const [settings, setSettings] = useState<PrivacySettings>({
    cloud_sync_enabled: false,
    data_encryption_enabled: true,
    anonymous_analytics: false,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [background, surface, accent, foreground, muted, border] = useCSSVariable([
    '--color-background',
    '--color-surface',
    '--color-accent',
    '--color-foreground',
    '--color-muted',
    '--color-border',
  ]) as string[];

  // 获取隐私设置
  const fetchPrivacySettings = async () => {
    try {
      setLoading(true);
      /**
       * 服务端文件：server/main.py
       * 接口：GET /api/v1/auth/privacy-settings
       */
      const response = await fetch(buildApiUrl('/api/v1/auth/privacy-settings'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('获取隐私设置失败');
      }

      const data = await response.json();
      setSettings(data.settings);
    } catch (error) {
      console.error('Error fetching privacy settings:', error);
      Toast.show({ type: 'error', text1: '获取隐私设置失败' });
    } finally {
      setLoading(false);
    }
  };

  // 保存隐私设置
  const savePrivacySettings = async () => {
    try {
      setSaving(true);
      /**
       * 服务端文件：server/main.py
       * 接口：POST /api/v1/auth/privacy-settings
       * Body 参数：cloud_sync_enabled: boolean, data_encryption_enabled: boolean, anonymous_analytics: boolean
       */
      const response = await fetch(buildApiUrl('/api/v1/auth/privacy-settings'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('保存隐私设置失败');
      }

      Toast.show({ type: 'success', text1: '隐私设置已保存' });
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      Toast.show({ type: 'error', text1: '保存隐私设置失败' });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchPrivacySettings();
  }, []);

  return (
    <Screen>
      <View style={[styles.container, { backgroundColor: background }]}>
        <View style={styles.form}>
          {/* 标题 */}
          <View style={styles.header}>
            <FontAwesome6 name="shield-halved" size={32} color={accent} />
            <Text style={[styles.title, { color: foreground }]}>隐私设置</Text>
            <Text style={[styles.subtitle, { color: muted }]}>
              控制您的数据隐私和安全选项
            </Text>
          </View>

          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={accent} />
              <Text style={[styles.loadingText, { color: muted }]}>加载中...</Text>
            </View>
          ) : (
            <>
              {/* 云端同步 */}
              <View style={[styles.settingItem, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}>
                <View style={styles.settingContent}>
                  <FontAwesome6 name="cloud" size={24} color={accent} style={styles.settingIcon} />
                  <View style={styles.settingText}>
                    <Text style={[styles.settingTitle, { color: foreground }]}>云端同步</Text>
                    <Text style={[styles.settingDesc, { color: muted }]}>
                      将您的数据同步到云端，方便多设备访问
                    </Text>
                  </View>
                </View>
                <Switch
                  value={settings.cloud_sync_enabled}
                  onValueChange={(value) => setSettings({ ...settings, cloud_sync_enabled: value })}
                  trackColor={{ false: muted, true: accent }}
                />
              </View>

              {/* 数据加密 */}
              <View style={[styles.settingItem, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}>
                <View style={styles.settingContent}>
                  <FontAwesome6 name="lock" size={24} color={accent} style={styles.settingIcon} />
                  <View style={styles.settingText}>
                    <Text style={[styles.settingTitle, { color: foreground }]}>数据加密</Text>
                    <Text style={[styles.settingDesc, { color: muted }]}>
                      对您的数据进行端到端加密保护
                    </Text>
                  </View>
                </View>
                <Switch
                  value={settings.data_encryption_enabled}
                  onValueChange={(value) => setSettings({ ...settings, data_encryption_enabled: value })}
                  trackColor={{ false: muted, true: accent }}
                />
              </View>

              {/* 匿名分析 */}
              <View style={[styles.settingItem, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}>
                <View style={styles.settingContent}>
                  <FontAwesome6 name="chart-line" size={24} color={accent} style={styles.settingIcon} />
                  <View style={styles.settingText}>
                    <Text style={[styles.settingTitle, { color: foreground }]}>匿名分析</Text>
                    <Text style={[styles.settingDesc, { color: muted }]}>
                      帮助改进产品体验，仅收集匿名数据
                    </Text>
                  </View>
                </View>
                <Switch
                  value={settings.anonymous_analytics}
                  onValueChange={(value) => setSettings({ ...settings, anonymous_analytics: value })}
                  trackColor={{ false: muted, true: accent }}
                />
              </View>

              {/* 保存按钮 */}
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: accent }]}
                onPress={savePrivacySettings}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>保存设置</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  form: {
    marginTop: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  loading: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  saveButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
