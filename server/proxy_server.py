#!/usr/bin/env python3
"""
简单的 HTTP 代理服务
用于解决浏览器混合内容安全策略问题
将 HTTPS 请求转发到 HTTP 后端
"""

import http.server
import socketserver
import urllib.request
import urllib.parse
import json
from typing import Tuple

# 后端服务器地址
BACKEND_HOST = "localhost"
BACKEND_PORT = 9091
BACKEND_URL = f"http://{BACKEND_HOST}:{BACKEND_PORT}"

class ProxyHTTPRequestHandler(http.server.BaseHTTPRequestHandler):
    """代理请求处理器"""

    def do_GET(self):
        self.handle_request("GET")

    def do_POST(self):
        self.handle_request("POST")

    def do_PUT(self):
        self.handle_request("PUT")

    def do_DELETE(self):
        self.handle_request("DELETE")

    def handle_request(self, method: str):
        """处理 HTTP 请求"""
        try:
            # 获取请求体
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length) if content_length > 0 else None

            # 构建后端 URL
            url = BACKEND_URL + self.path

            # 解析查询参数
            if '?' in self.path:
                url += self.path.split('?')[1]

            # 创建请求
            req = urllib.request.Request(url, data=body, method=method)

            # 复制请求头
            skip_headers = {'host', 'content-length'}
            for key, value in self.headers.items():
                if key.lower() not in skip_headers:
                    req.add_header(key, value)

            # 发送请求到后端
            with urllib.request.urlopen(req) as response:
                # 获取响应数据
                response_data = response.read()

                # 设置响应头
                self.send_response(response.status)
                skip_response_headers = {'content-encoding', 'transfer-encoding'}
                for key, value in response.headers.items():
                    if key.lower() not in skip_response_headers:
                        self.send_header(key, value)
                self.end_headers()

                # 发送响应数据
                self.wfile.write(response_data)

        except urllib.error.HTTPError as e:
            # 处理 HTTP 错误
            self.send_response(e.code)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()

            error_response = json.dumps({
                "detail": f"Proxy error: {e.reason}",
                "status": e.code
            })
            self.wfile.write(error_response.encode('utf-8'))

        except Exception as e:
            # 处理其他错误
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()

            error_response = json.dumps({
                "detail": f"Proxy error: {str(e)}",
                "status": 500
            })
            self.wfile.write(error_response.encode('utf-8'))

    def log_message(self, format, *args):
        """自定义日志格式"""
        print(f"[Proxy] {self.address_string()} - {format % args}")


def run_proxy_server(port: int = 8080):
    """启动代理服务器"""
    with socketserver.TCPServer(("", port), ProxyHTTPRequestHandler) as httpd:
        print(f"🚀 Proxy server running on http://0.0.0.0:{port}")
        print(f"📦 Forwarding requests to: {BACKEND_URL}")
        print(f"🔗 Access via: http://9.129.7.228:{port}/api/v1/...")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n⏹️  Proxy server stopped")


if __name__ == "__main__":
    PORT = 8080
    run_proxy_server(PORT)
