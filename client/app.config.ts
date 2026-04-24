import { ExpoConfig, ConfigContext } from 'expo/config';

// 直接定义配置（避免在Node.js环境下加载复杂模块）
const APP_CONFIG = {
  name: process.env.EXPO_PUBLIC_APP_NAME || 'AI情绪日记',
  version: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
  bundleId: process.env.EXPO_PUBLIC_APP_BUNDLE_ID || 'com.emotiondiary.app',
  scheme: process.env.EXPO_PUBLIC_APP_SCHEME || 'emotiondiary',
} as const;

const projectName = process.env.COZE_PROJECT_NAME || process.env.EXPO_PUBLIC_COZE_PROJECT_NAME || APP_CONFIG.name;
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
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": APP_CONFIG.bundleId
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": APP_CONFIG.bundleId,
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
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#ffffff"
        }
      ],
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
      "url": process.env.EXPO_PUBLIC_UPDATES_URL || "https://u.expo.dev/your-update-url"
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
