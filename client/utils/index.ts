import { Platform } from 'react-native';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { API_CONFIG } from '@/config';
import { debug } from '@/components/DebugPanel';
dayjs.extend(utc);

// 使用统一的API配置，从环境变量读取后端地址
const API_BASE = API_CONFIG.baseUrl.replace(/\/$/, '');

/**
 * 构建API URL
 * @param path API路径，如 '/api/v1/auth/me'
 * @returns 完整的API URL
 * @throws Error 如果后端URL未配置
 */
export const buildApiUrl = (path: string): string => {
  console.log('========== [buildApiUrl] 开始构建URL ==========');
  console.log('[buildApiUrl] 输入参数:');
  console.log('  path:', path);
  console.log('  type:', typeof path);
  console.log('[buildApiUrl] 当前配置:');
  console.log('  API_CONFIG.baseUrl:', API_CONFIG.baseUrl);
  console.log('  API_CONFIG.baseUrl类型:', typeof API_CONFIG.baseUrl);
  console.log('  process.env.EXPO_PUBLIC_BACKEND_BASE_URL:', process.env.EXPO_PUBLIC_BACKEND_BASE_URL);
  console.log('  Platform.OS:', Platform.OS);

  // 检查后端URL是否已配置
  if (!API_CONFIG.baseUrl) {
    const errorMessage = '[buildApiUrl] 后端URL未配置，请在 .env 文件中设置 EXPO_PUBLIC_BACKEND_BASE_URL';
    debug.error(errorMessage);
    console.error(errorMessage);
    console.error('[buildApiUrl] 当前配置:', {
      baseUrl: API_CONFIG.baseUrl,
      envBackendUrl: process.env.EXPO_PUBLIC_BACKEND_BASE_URL,
    });
    console.log('========== [buildApiUrl] 构建失败 ==========');
    throw new Error('后端URL未配置，请检查环境变量');
  }

  let url: string;
  let baseUrl = API_CONFIG.baseUrl;

  console.log('[buildApiUrl] 开始处理路径...');
  console.log('  原始baseUrl:', baseUrl);
  console.log('  原始path:', path);

  // 智能处理：如果baseUrl已经以/api结尾，则去掉path中的/api前缀
  if (baseUrl.endsWith('/api')) {
    console.log('[buildApiUrl] baseUrl以/api结尾，需要调整path');
    // 如果path以/api开头，则去掉path的/api部分
    if (path.startsWith('/api')) {
      path = path.substring(4); // 去掉 '/api'
      console.log('  移除path的/api前缀，新path:', path);
    }
    // 确保baseUrl不以斜杠结尾
    baseUrl = baseUrl.replace(/\/$/, '');
    console.log('  调整后baseUrl:', baseUrl);
  }

  // 构建最终URL
  url = `${baseUrl}${path}`;

  console.log('[buildApiUrl] 构建完成:');
  console.log('  最终URL:', url);
  console.log('  最终URL长度:', url.length);
  console.log('========== [buildApiUrl] 构建完成 ==========');

  const logInfo = {
    platform: Platform.OS,
    baseUrl: API_CONFIG.baseUrl,
    originalPath: path,
    finalUrl: url
  };

  debug.info('[buildApiUrl] 构建URL:', JSON.stringify(logInfo, null, 2));
  console.log('[buildApiUrl] 详细信息:', logInfo);

  return url;
};

/**
 * 创建跨平台兼容的文件对象，用于 FormData.append()
 * - Web 端返回 File 对象
 * - 移动端返回 { uri, type, name } 对象（RN fetch 会自动处理）
 * @param fileUri Expo 媒体库（如 expo-image-picker、expo-camera）返回的 uri
 * @param fileName 上传时的文件名，如 'photo.jpg'
 * @param mimeType 文件 MIME 类型，如 'image/jpeg'、'audio/mpeg'
 */
export async function createFormDataFile(
  fileUri: string,
  fileName: string,
  mimeType: string
): Promise<File | { uri: string; type: string; name: string }> {
  if (Platform.OS === 'web') {
    const response = await fetch(fileUri);
    const blob = await response.blob();
    return new File([blob], fileName, { type: mimeType });
  }
  return { uri: fileUri, type: mimeType, name: fileName };
}

/**
 * 构建文件或图片完整的URL
 * @param url 相对或绝对路径
 * @param w 宽度 (px) - 自动向下取整
 * @param h 高度 (px)
 */
export const buildAssetUrl = (url?: string | null, w?: number, h?: number): string | undefined => {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url; // 绝对路径直接返回

  // 1. 去除 Base 尾部和 Path 头部的斜杠
  const base = API_BASE;
  const path = url.replace(/^\//, '');
  const abs = `${base}/${path}`;

  // 2. 无需缩略图则直接返回
  if (!w && !h) return abs;

  // 3. 构造参数，保留原有 Query (如有)
  const separator = abs.includes('?') ? '&' : '?';
  const query = [
    w ? `w=${Math.floor(w)}` : '',
    h ? `h=${Math.floor(h)}` : ''
  ].filter(Boolean).join('&');
  return `${abs}${separator}${query}`;
};

/**
 * 将UTC时间字符串转换为本地时间字符串
 * @param utcDateStr UTC时间字符串，格式如：2025-11-26T01:49:48.009573
 * @returns 本地时间字符串，格式如：2025-11-26 08:49:48
 */
export const convertToLocalTimeStr = (utcDateStr: string): string => {
  if (!utcDateStr) {
    return utcDateStr;
  }
  const microUtcRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{1,6}/;
  if (!microUtcRegex.test(utcDateStr)) {
    console.log('invalid utcDateStr:', utcDateStr);
    return utcDateStr;
  }
  const normalized = utcDateStr.replace(/\.(\d{6})$/, (_, frac) => `.${frac.slice(0, 3)}`);
  const d = dayjs.utc(normalized);
  if (!d.isValid()) {
    return utcDateStr;
  }
  return d.local().format('YYYY-MM-DD HH:mm:ss');
}
