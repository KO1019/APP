import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useCSSVariable } from 'uniwind';
import Toast from 'react-native-toast-message';
import { buildApiUrl, createFormDataFile } from '@/utils';
import { useSafeRouter } from '@/hooks/useSafeRouter';

export default function ProfileInfoScreen() {
  const { user, token, refreshUser } = useAuth();
  const router = useSafeRouter();

  const [nickname, setNickname] = useState(user?.nickname || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // 密码修改相关
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [background, surface, accent, foreground, muted, border, error] = useCSSVariable([
    '--color-background',
    '--color-surface',
    '--color-accent',
    '--color-foreground',
    '--color-muted',
    '--color-border',
    '--color-error',
  ]) as string[];

  // 选择头像
  const pickAvatar = async () => {
    try {
      // 请求相册权限
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限提示', '需要相册权限才能选择头像');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Toast.show({ type: 'error', text1: '选择图片失败' });
    }
  };

  // 上传头像
  const uploadAvatar = async (uri: string) => {
    try {
      setUploadingAvatar(true);

      // 创建跨平台兼容的文件对象
      const file = await createFormDataFile(uri, 'avatar.jpg', 'image/jpeg');

      // 创建FormData
      const formData = new FormData();
      if (Platform.OS === 'web') {
        // Web端使用File对象
        formData.append('file', file as File);
      } else {
        // 移动端使用{ uri, type, name }对象
        formData.append('file', file as any);
      }

      // 上传到对象存储（不要手动设置Content-Type，让fetch自动处理）
      /**
       * 服务端文件：server/main.py
       * 接口：POST /api/v1/upload
       */
      const uploadResponse = await fetch(buildApiUrl('/api/v1/upload'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('上传失败');
      }

      const uploadData = await uploadResponse.json();
      const avatarUrl = uploadData.url;

      // 更新用户资料
      await updateProfile({ avatar: avatarUrl });

      Toast.show({ type: 'success', text1: '头像更新成功' });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      Toast.show({ type: 'error', text1: '头像上传失败' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // 更新用户资料
  const updateProfile = async (data: { nickname?: string; avatar?: string }) => {
    try {
      /**
       * 服务端文件：server/main.py
       * 接口：POST /api/v1/auth/profile
       * Body 参数：nickname?: string, email?: string, avatar?: string
       */
      const response = await fetch(buildApiUrl('/api/v1/auth/profile'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('更新失败');
      }

      // 刷新用户信息
      await refreshUser();
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  // 保存用户名
  const handleSaveNickname = async () => {
    if (!nickname.trim()) {
      Toast.show({ type: 'error', text1: '用户名不能为空' });
      return;
    }

    try {
      setLoading(true);
      await updateProfile({ nickname: nickname.trim() });
      Toast.show({ type: 'success', text1: '用户名更新成功' });
    } catch (error) {
      Toast.show({ type: 'error', text1: '更新失败，请重试' });
    } finally {
      setLoading(false);
    }
  };

  // 修改密码
  const handleChangePassword = async () => {
    if (!oldPassword) {
      Toast.show({ type: 'error', text1: '请输入旧密码' });
      return;
    }

    if (newPassword.length < 6) {
      Toast.show({ type: 'error', text1: '新密码长度至少6个字符' });
      return;
    }

    if (newPassword !== confirmPassword) {
      Toast.show({ type: 'error', text1: '两次输入的密码不一致' });
      return;
    }

    if (oldPassword === newPassword) {
      Toast.show({ type: 'error', text1: '新密码不能与旧密码相同' });
      return;
    }

    try {
      setChangingPassword(true);
      /**
       * 服务端文件：server/main.py
       * 接口：POST /api/v1/auth/change-password
       * Body 参数：old_password: string, new_password: string
       */
      const response = await fetch(buildApiUrl('/api/v1/auth/change-password'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '修改密码失败');
      }

      Toast.show({ type: 'success', text1: '密码修改成功' });

      // 清空表单并关闭
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
    } catch (error) {
      console.error('Error changing password:', error);
      Toast.show({
        type: 'error',
        text1: '修改密码失败',
        text2: error instanceof Error ? error.message : '请稍后重试',
      });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <Screen safeAreaEdges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView style={[styles.container, { backgroundColor: background }]}>
          {/* 顶部导航栏 */}
          <View style={[styles.headerBar, { borderBottomColor: border }]}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={24} color={foreground} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: foreground }]}>个人信息</Text>
            <TouchableOpacity onPress={handleSaveNickname} style={styles.saveButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              {loading ? (
                <ActivityIndicator color={accent} size="small" />
              ) : (
                <Text style={[styles.saveButtonText, { color: accent }]}>保存</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {/* 头像部分 */}
            <View style={styles.avatarSection}>
              <TouchableOpacity onPress={pickAvatar} style={styles.avatarContainer} activeOpacity={0.7}>
                {avatar ? (
                  <Image source={{ uri: avatar }} style={styles.avatarImage} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: `${accent}20` }]}>
                    <Ionicons name="person" size={40} color={accent} />
                  </View>
                )}
                <View style={[styles.cameraBadge, { backgroundColor: accent }]}>
                  <Ionicons name="camera" size={16} color="#FFFFFF" />
                </View>
                {uploadingAvatar && (
                  <View style={[styles.uploadingOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  </View>
                )}
              </TouchableOpacity>
              <Text style={[styles.avatarHint, { color: muted }]}>点击更换头像</Text>
            </View>

            {/* 用户名 */}
            <View style={[styles.formContainer, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: foreground }]}>用户名</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: background, color: foreground, borderColor: border }]}
                  placeholder="请输入用户名"
                  placeholderTextColor={muted}
                  value={nickname}
                  onChangeText={setNickname}
                  autoCapitalize="none"
                />
              </View>

              <View style={[styles.divider, { backgroundColor: border }]} />

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: muted }]}>账号</Text>
                <Text style={[styles.infoValue, { color: foreground }]}>{user?.email || '未设置'}</Text>
              </View>
            </View>

            {/* 修改密码按钮 */}
            <TouchableOpacity
              style={[styles.changePasswordButton, { backgroundColor: surface, borderColor: border, borderWidth: 1 }]}
              onPress={() => setShowPasswordForm(!showPasswordForm)}
              activeOpacity={0.7}
            >
              <Ionicons name="key" size={20} color={accent} style={styles.buttonIcon} />
              <View style={styles.buttonContent}>
                <Text style={[styles.buttonTitle, { color: foreground }]}>修改账号密码</Text>
                <Text style={[styles.buttonSubtitle, { color: muted }]}>用于登录账户的密码</Text>
              </View>
              <Ionicons name={showPasswordForm ? "chevron-up" : "chevron-right"} size={16} color={muted} />
            </TouchableOpacity>

            {/* 修改密码表单 */}
            {showPasswordForm && (
              <View style={[styles.passwordFormContainer, { backgroundColor: `${surface}50`, borderColor: border, borderWidth: 1 }]}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: foreground }]}>旧密码</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: background, color: foreground, borderColor: border }]}
                    placeholder="请输入旧密码"
                    placeholderTextColor={muted}
                    value={oldPassword}
                    onChangeText={setOldPassword}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: foreground }]}>新密码</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: background, color: foreground, borderColor: border }]}
                    placeholder="请输入新密码（至少6位）"
                    placeholderTextColor={muted}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: foreground }]}>确认新密码</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: background, color: foreground, borderColor: border }]}
                    placeholder="请再次输入新密码"
                    placeholderTextColor={muted}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: accent }]}
                  onPress={handleChangePassword}
                  disabled={changingPassword}
                  activeOpacity={0.8}
                >
                  {changingPassword ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.submitButtonText}>确认修改</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* 提示信息 */}
            <View style={[styles.tipCard, { backgroundColor: `${accent}10`, borderColor: `${accent}30`, borderWidth: 1 }]}>
              <Ionicons name="circle-info" size={16} color={accent} style={styles.tipIcon} />
              <Text style={[styles.tipText, { color: foreground }]}>
                账号密码用于登录系统，与应用锁密码不同
              </Text>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  saveButton: {
    width: 60,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 8,
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarHint: {
    fontSize: 14,
  },
  formContainer: {
    borderRadius: 16,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    fontSize: 16,
  },
  divider: {
    height: 1,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  changePasswordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  buttonIcon: {
    marginRight: 12,
  },
  buttonContent: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  buttonSubtitle: {
    fontSize: 13,
  },
  passwordFormContainer: {
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  submitButton: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  tipIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
