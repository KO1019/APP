const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 8080;
const BACKEND_URL = 'http://localhost:9091';

// 代理 /api/v1 请求到后端
app.use('/api/v1', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/v1': '/api/v1',
  },
}));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Proxy server running on port ${PORT}`);
  console.log(`Proxying /api/v1 to ${BACKEND_URL}`);
});
