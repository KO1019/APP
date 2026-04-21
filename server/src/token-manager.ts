/**
 * 火山引擎语音服务 Access Token 管理
 *
 * 功能：
 * 1. 自动获取 Access Token
 * 2. 缓存 Token
 * 3. 自动刷新过期 Token
 */

// Token 缓存
interface TokenCache {
  accessToken: string;
  expireTime: number; // 过期时间戳
  appId: string;
}

let tokenCache: TokenCache | null = null;

/**
 * 获取 Access Token
 */
export async function getAccessToken(
  appId: string,
  secretKey: string
): Promise<string> {
  // 检查缓存
  if (tokenCache && tokenCache.appId === appId) {
    // 如果Token还有30分钟以上有效期，直接使用
    const now = Date.now();
    const timeUntilExpiry = tokenCache.expireTime - now;
    const thirtyMinutes = 30 * 60 * 1000;

    if (timeUntilExpiry > thirtyMinutes) {
      console.log('✅ Using cached Access Token, expires in:', Math.floor(timeUntilExpiry / 60000), 'minutes');
      return tokenCache.accessToken;
    }

    // 如果Token即将过期（剩余30分钟内），刷新
    console.log('⚠️ Access Token expiring soon, refreshing...');
  }

  // 获取新 Token
  console.log('🔑 Fetching new Access Token...');
  const token = await fetchAccessToken(appId, secretKey);

  // 更新缓存
  tokenCache = {
    accessToken: token,
    expireTime: Date.now() + 23 * 60 * 60 * 1000, // 23小时后过期（提前1小时刷新）
    appId,
  };

  console.log('✅ New Access Token cached, expires in 23 hours');

  return token;
}

/**
 * 调用火山引擎 API 获取 Access Token
 */
async function fetchAccessToken(
  appId: string,
  secretKey: string
): Promise<string> {
  try {
    // 根据火山引擎文档，使用HTTP POST请求获取Token
    // API: https://open.volcengineapi.com
    // Action: GetToken
    // Version: 2021-01-01

    const response = await fetch(
      'https://open.volcengineapi.com?Action=GetToken&Version=2021-01-01',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appkey: appId,
          secret: secretKey,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get Access Token: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // 解析返回的 Token
    if (data.Error) {
      throw new Error(`API Error: ${data.Error.Code} - ${data.Error.Message}`);
    }

    if (!data.Result || !data.Result.AccessToken) {
      throw new Error('Invalid response format: Missing AccessToken');
    }

    return data.Result.AccessToken;
  } catch (error: any) {
    console.error('❌ Failed to fetch Access Token:', error);
    throw error;
  }
}

/**
 * 清除缓存的 Token
 */
export function clearTokenCache(): void {
  console.log('🗑️ Clearing token cache');
  tokenCache = null;
}

/**
 * 获取 Token 缓存信息（用于调试）
 */
export function getTokenCacheInfo(): TokenCache | null {
  if (!tokenCache) {
    return null;
  }

  const now = Date.now();
  const timeUntilExpiry = tokenCache.expireTime - now;

  return {
    ...tokenCache,
    expireTime: timeUntilExpiry, // 返回剩余毫秒数
  };
}
