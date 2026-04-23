/**
 * 应用配置文件
 * 集中管理所有配置项，便于部署时修改
 */

// 环境判断（兼容 Node.js 和浏览器环境）
const isDevelopment = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';
const isWeb = typeof window !== 'undefined';

// 检测是否在真正的本地开发环境
const isLocalhost = isWeb && window.location &&
  (window.location.hostname === 'localhost' ||
   window.location.hostname === '127.0.0.1' ||
   window.location.hostname === '');

/**
 * 应用基础配置
 */
export const APP_CONFIG = {
  name: process.env.EXPO_PUBLIC_APP_NAME || 'AI情绪日记',
  version: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
  bundleId: process.env.EXPO_PUBLIC_APP_BUNDLE_ID || 'com.emotiondiary.app',
  scheme: process.env.EXPO_PUBLIC_APP_SCHEME || 'emotiondiary',
} as const;

/**
 * API配置
 */
export const API_CONFIG = {
  // 后端API基础URL
  baseUrl: (() => {
    const envUrl = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

    // 优先使用环境变量配置
    if (envUrl && envUrl.trim() !== '') {
      return envUrl;
    }

    // 如果环境变量未设置，根据当前环境智能判断
    if (isDevelopment) {
      // 检测当前URL的hostname
      if (isWeb && window.location) {
        const hostname = window.location.hostname;

        // 如果在 dev.coze.site 域名下（沙箱环境），使用阿里云后端
        if (hostname.includes('dev.coze.site')) {
          return 'http://59.110.39.235:9091';
        }

        // 如果在 localhost 上，使用本地后端
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '') {
          return 'http://localhost:9091';
        }
      }

      // 默认开发环境地址
      return 'http://59.110.39.235:9091';
    }

    // 生产环境默认值
    return 'http://59.110.39.235:9091';
  })(),

  // API超时时间（毫秒）
  timeout: parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '30000', 10),
} as const;

/**
 * 存储配置
 */
export const STORAGE_CONFIG = {
  // 是否启用加密
  enableEncryption: process.env.EXPO_PUBLIC_ENABLE_ENCRYPTION !== 'false',

  // 密码最小长度
  passwordMinLength: parseInt(process.env.EXPO_PUBLIC_PASSWORD_MIN_LENGTH || '4', 10),

  // Token过期时间（天）
  tokenExpireDays: 30,

  // 本地存储键名前缀
  storagePrefix: '@emotion_diary_',
} as const;

/**
 * 功能开关配置
 */
export const FEATURE_CONFIG = {
  // 是否启用离线模式
  enableOfflineMode: process.env.EXPO_PUBLIC_ENABLE_OFFLINE_MODE !== 'false',

  // 是否启用AI聊天功能
  enableAIChat: process.env.EXPO_PUBLIC_ENABLE_AI_CHAT !== 'false',

  // 是否启用情绪分析功能
  enableMoodAnalysis: process.env.EXPO_PUBLIC_ENABLE_MOOD_ANALYSIS !== 'false',

  // 是否启用位置记录
  enableLocation: process.env.EXPO_PUBLIC_ENABLE_LOCATION !== 'false',

  // 是否启用图片上传
  enableImageUpload: true,

  // 最大图片数量
  maxImageCount: 9,

  // 最大图片大小（字节）
  maxImageSize: 5 * 1024 * 1024, // 5MB

  // 图片压缩质量
  imageQuality: 0.8,
} as const;

/**
 * UI配置
 */
export const UI_CONFIG = {
  // 主题模式
  themeMode: (process.env.EXPO_PUBLIC_THEME_MODE as 'light' | 'dark' | 'auto') || 'auto',

  // 动画时长（毫秒）
  animationDuration: 300,

  // 默认字体大小
  defaultFontSize: 16,
} as const;

/**
 * 更新配置
 */
export const UPDATES_CONFIG = {
  // 更新URL
  url: process.env.EXPO_PUBLIC_UPDATES_URL,

  // 自动检查更新间隔（小时）
  checkInterval: 24,
} as const;

/**
 * 日志配置
 */
export const LOG_CONFIG = {
  // 是否启用日志
  enableLogs: isDevelopment,

  // 日志级别：debug, info, warn, error
  level: isDevelopment ? 'debug' : 'error',

  // 是否上报错误日志
  reportErrors: !isDevelopment,
} as const;

/**
 * 导出所有配置
 */
export const CONFIG = {
  app: APP_CONFIG,
  api: API_CONFIG,
  storage: STORAGE_CONFIG,
  feature: FEATURE_CONFIG,
  ui: UI_CONFIG,
  updates: UPDATES_CONFIG,
  log: LOG_CONFIG,
} as const;

/**
 * 配置验证函数
 * 在应用启动时调用，确保配置正确
 */
export const validateConfig = (): boolean => {
  const errors: string[] = [];

  // 验证API配置
  if (!API_CONFIG.baseUrl) {
    errors.push('API基础URL未配置');
  }

  // 验证功能配置
  if (FEATURE_CONFIG.maxImageCount < 1) {
    errors.push('最大图片数量必须大于0');
  }

  if (FEATURE_CONFIG.maxImageSize < 1024) {
    errors.push('最大图片大小必须大于1KB');
  }

  if (STORAGE_CONFIG.passwordMinLength < 4) {
    errors.push('密码最小长度必须大于等于4');
  }

  if (errors.length > 0) {
    console.error('[Config] 配置验证失败:', errors);
    return false;
  }

  console.log('[Config] 配置验证通过');
  return true;
};

/**
 * 获取当前环境信息
 */
export const getEnvironmentInfo = () => {
  return {
    isDevelopment,
    isWeb,
    isProduction: !isDevelopment,
    platform: typeof window !== 'undefined' ? 'web' : 'native',
    config: CONFIG,
  };
};
