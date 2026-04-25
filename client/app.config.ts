import { ExpoConfig, ConfigContext } from 'expo/config';

// 直接定义配置（避免在Node.js环境下加载复杂模块）
const APP_CONFIG = {
  name: 'Emotion Diary', // 强制使用英文名称，避免本地构建中文路径问题
  displayName: 'Emotion Diary', // 显示名称
  version: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
  bundleId: process.env.EXPO_PUBLIC_APP_BUNDLE_ID || 'com.emotiondiary.app',
  scheme: process.env.EXPO_PUBLIC_APP_SCHEME || 'emotiondiary',
} as const;

// 使用英文名称，避免本地构建中文路径问题
const projectName = APP_CONFIG.name;
const projectId = process.env.COZE_PROJECT_ID || process.env.EXPO_PUBLIC_COZE_PROJECT_ID;
const slugAppName = projectId ? `app${projectId}` : 'emotion-diary-app';

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config,
    "name": projectName,
    "slug": slugAppName,
    "version": APP_CONFIG.version,
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": APP_CONFIG.scheme,
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "backgroundColor": "#EA580C", // 设置启动画面背景色与启动页面一致
    "splash": {
      "image": "./assets/images/icon-transparent.png", // 自定义启动画面：机器人抱日记本
      "backgroundColor": "#EA580C", // 橙色背景
      "resizeMode": "contain", // 图片保持比例，居中显示
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": APP_CONFIG.bundleId,
      "backgroundColor": "#EA580C",
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon-safe.png",
        "backgroundColor": "#EA580C",
        "monochromeImage": "./assets/images/icon-safe.png"
      },
      "icon": "./assets/images/icon-safe.png",
      "package": APP_CONFIG.bundleId,
      "backgroundColor": "#EA580C",
      "permissions": [
        'INTERNET',
        'ACCESS_NETWORK_STATE',
        'CAMERA',
        'CAMERA_ROLL',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'ACCESS_COARSE_LOCATION',
        'ACCESS_FINE_LOCATION',
        'RECORD_AUDIO',
        'MODIFY_AUDIO_SETTINGS',
        'REQUEST_INSTALL_PACKAGES',
      ],
    },
    "web": {
      "bundler": "metro",
      "output": "single",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-updates",
      "expo-router",
      [
        "expo-image-picker",
        {
          "photosPermission": `允许${projectName}访问您的相册，以便您上传或保存图片。`,
          "cameraPermission": `允许${projectName}使用您的相机，以便您直接拍摄照片上传。`,
          "microphonePermission": `允许${projectName}访问您的麦克风，以便您拍摄带有声音的视频。`
        }
      ],
      [
        "expo-location",
        {
          "locationWhenInUsePermission": `${projectName}需要访问您的位置以提供周边服务及导航功能。`
        }
      ],
      [
        "expo-av",
        {
          "microphonePermission": `允许${projectName}使用麦克风以进行录音。`,
        }
      ]
    ],
    "updates": {
      // 移除 URL 配置，使用默认配置避免 EAS Build 警告
    },
    "runtimeVersion": {
      "policy": "appVersion"
    },
    "experiments": {
      "typedRoutes": true
    },
    "extra": {
      "eas": {
        "projectId": "e70a1058-aa9d-4766-9249-c0b4be85d069"
      }
    }
  }
}
