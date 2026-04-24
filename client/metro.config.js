const { getDefaultConfig } = require('expo/metro-config');
const { createProxyMiddleware } = require('http-proxy-middleware');
const connect = require('connect');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

// 安全地获取 Expo 的默认排除列表
const existingBlockList = [].concat(config.resolver.blockList || []);

config.resolver.blockList = [
  ...existingBlockList,
  /.*\/\.expo\/.*/, // Expo 的缓存和构建产物目录

  // 1. 原生代码 (Java/C++/Objective-C)
  /.*\/react-native\/ReactAndroid\/.*/,
  /.*\/react-native\/ReactCommon\/.*/,

  // 2. 纯开发和调试工具
  // 这些工具只在开发电脑上运行，不会被打包到应用中
  /.*\/@typescript-eslint\/eslint-plugin\/.*/,

  // 3. 构建时数据
  // 这个数据库只在打包过程中使用，应用运行时不需要
  /.*\/caniuse-lite\/data\/.*/,

  // 4. 通用规则
  /.*\/__tests__\/.*/, // 排除所有测试目录
  /.*\.git\/.*/, // 排除 Git 目录

  // 5. pnpm 临时目录（避免 ENOENT 错误）
  /.*node_modules\/\.pnpm\/.*_tmp_\d+.*/,
];

const BACKEND_TARGET = 'http://9.129.7.228:9091';

const apiProxy = createProxyMiddleware({
  target: BACKEND_TARGET,
  changeOrigin: true,
  logLevel: 'debug',
  proxyTimeout: 86400000,
  onProxyReq: (proxyReq, req) => {
    const accept = req.headers.accept || '';
    if (accept.includes('text/event-stream')) {
      proxyReq.setHeader('accept-encoding', 'identity');
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    const contentType = proxyRes.headers['content-type'] || '';
    if (contentType.includes('text/event-stream') || contentType.includes('application/stream')) {
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      if (typeof res.flushHeaders === 'function') {
        try { res.flushHeaders(); } catch {}
      }
    }
  },
});

const streamProxy = createProxyMiddleware({
  target: BACKEND_TARGET,
  changeOrigin: true,
  logLevel: 'debug',
  ws: true,
  proxyTimeout: 86400000,
  onProxyReq: (proxyReq, req) => {
    console.log('[Stream Proxy] Proxying request:', req.url, 'Headers:', JSON.stringify(req.headers));
    const upgrade = req.headers.upgrade;
    const accept = req.headers.accept || '';
    if (upgrade && upgrade.toLowerCase() === 'websocket') {
      proxyReq.setHeader('Connection', 'upgrade');
      proxyReq.setHeader('Upgrade', req.headers.upgrade);
      console.log('[Stream Proxy] WebSocket upgrade request');
    } else if (accept.includes('text/event-stream')) {
      proxyReq.setHeader('accept-encoding', 'identity');
      proxyReq.setHeader('Connection', 'keep-alive');
      console.log('[Stream Proxy] SSE request');
    }
  },
  onError: (err, req, res) => {
    console.error('[Stream Proxy] Error:', err);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log('[Stream Proxy] Response status:', proxyRes.statusCode);
    const contentType = proxyRes.headers['content-type'] || '';
    if (contentType.includes('text/event-stream') || contentType.includes('application/stream')) {
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      if (typeof res.flushHeaders === 'function') {
        try { res.flushHeaders(); } catch {}
      }
    }
  },
});

const shouldProxyToBackend = (url) => {
  if (!url) return false;
  // 打印所有请求 URL 以便调试
  console.log('[Proxy Check] URL:', url, 'Pattern:', /^\/api\/v\d+\//.test(url));
  if (/^\/api\/v\d+\//.test(url)) {
    return true;
  }
  return false;
};

const isWebSocketRequest = (req) => {
  const result = !!(req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket');
  if (result) {
    console.log('[WebSocket Request] Detected upgrade request, URL:', req.url, 'Headers:', JSON.stringify(req.headers));
  }
  return result;
};

const isSSERequest = (req) => {
  const accept = req.headers.accept || '';
  return accept.includes('text/event-stream');
};

config.server = {
  ...config.server,
  enhanceMiddleware: (metroMiddleware) => {
    return connect()
      .use((req, res, next) => {
        console.log('[Metro Middleware] Request URL:', req.url, 'Method:', req.method, 'Headers:', JSON.stringify(req.headers));
        if (shouldProxyToBackend(req.url)) {
          console.log(`[Metro Proxy] Forwarding ${req.method} ${req.url}`);

          if (isWebSocketRequest(req) || isSSERequest(req)) {
            console.log('[Metro Proxy] Using stream proxy');
            return streamProxy(req, res, next);
          }
          console.log('[Metro Proxy] Using API proxy');
          return apiProxy(req, res, next);
        }
        console.log('[Metro Middleware] Not proxying, passing to next middleware');
        next();
      })
      .use(metroMiddleware);
  },
};

module.exports = withUniwindConfig(config, {
  // relative path to your global.css file
  cssEntryFile: './global.css',
  // (optional) path where we gonna auto-generate typings
  // defaults to project's root
  dtsFile: './uniwind-types.d.ts'
});
