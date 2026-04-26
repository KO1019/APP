#!/usr/bin/env python3
"""
版本管理系统 Web可视化工具
提供图形化界面管理APP版本
"""

import os
from datetime import datetime
from typing import Optional
import json
import uvicorn
from fastapi import FastAPI, Request, HTTPException, Form
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
import requests
from dotenv import load_dotenv

load_dotenv()

# FastAPI应用
app = FastAPI(title="版本管理系统")

# CORS中间件 - 允许管理后台跨域访问后端API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 配置
# API基础URL - 必须从环境变量读取
API_BASE_URL = os.getenv('API_BASE_URL')
if not API_BASE_URL:
    raise ValueError('环境变量 API_BASE_URL 未设置，请在 .env 文件中配置')
API_BASE = f"{API_BASE_URL}/api/v1"

# HTML模板
HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>版本管理系统</title>
    <link rel="icon" type="image/png" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAQAAAGKDAGaAAAFgUlEQVRYw7WXa2wUVRTH/20p7fZBW0p5iAplaUELCqEFlUCMYKwJKMYgaEwIUpQYNCIWRYgvQtTS6AeiKEqIQDBIAEFAEEm1DUVUoIqPVqhCC/IoammhC9vt/vywM7szu7NLLfHMl7n3nP/533vuPefMSHap8wNIoG57pxIYSErZDyCgB8qogTYUeKT+v2C+SlLanqA3v4EBwSdAasAI4CUUcA7wRsiBMbDIjQDQd4M0ogimtkrbMWSgAVzibUIouTIwfc4kJaVIkpT+PTxLiGplkHCo6Wq+uSOydlrYl3jD1xOSAQ5zdzcA1CJJK/ygOEk91kIhAMsQmeMDq9MRg7ojGExIINkrOAm8D4DHSg9QwiQApiDmeQzFWaDE2LUQ4DXjedimsAQaShgbqXj4NM4ISZpmVeTbdt6vGISrWtElfs76Fuig9+9hij7qFjbTs6GecEnxSdKa4DjbK0nFrzWFTI4yE/jVsvDsMaauP0JxX0ARviBgOg0A3GnZaVpO4N3llZRYYZrez8dhC/KRxrBVYSt37TPVgSh6GQN8FFxSQPLOqbsBSP3Wy2gLwJIRQcC91mPIOGyaTaTKARBxbllH7EtqZkJsgCRlvrTbF21JQiS3KN7pkFNH/BMOiJ+nq8vQTTNI8ChZnZabXJs7bxzf9zjAO/8kTLfNxynXwTpze6PlnG8/o16B+fzTfqCRgq1W62nXtYff1X1orjRiqzn2M8TgySlqAFjNuqDxFdIRKpWeag/Vo7zfJWXXei1ep3AaKDYDWypNvhLQnETk1+kWf/hC3iUrdGil0i3lAE8iRM/r1cpm3g0aNzAdgB8sACnvm8Bo0AuSLgLwKMeBQjosTEuCAJu0BSPgjsjo5WS0KyUM4Amqf6aO2cFRPUKU0cLAOhvgsgUAUM4u/PQz9lAGwC5/75eDgFlhAHuxKzNmynGtMwDtvMWOmIBahEjbYAACBWYCzY6A18kx3jI2WXolQJvRKMLqb6g5bbO0AnMPlbwSFdBrpwMA4FkOOwJ6mw08q/J8jChZnhtCR9HdfTo2IP6JyGQrfKbVGZBeETWdB723PwzQ/ZISr1IDchs9IcCtnasbWWMvCC3SNUhm2ophJ2raq9pyjycvjbju1yTje/604IzHllMXmH0256BGRBoPTipaO/jv4ktTPaNaC+rd02I5dqUsdTdUXiaGfOYbdKbPi2bnLkjLO3cszGJx+00fRLoemXlg1qkLVDOOxVyM6v4MM4kLlpQh6cObI22OIcatNh0nJj3X/8S2S3aTFhZwJ9/Z5raTZ71npZKUOWVxhPtDuBD5jZI7c+8DJ8/Giga7GcObzCMxMkFKJWlUYm6ztU0cYbihH7lccbv3cw9z+Tuq+yrG8gptNDGHBEcCSXGDjz7NDG6zWQyYLylhTyDSl1nK7VRYHLfxKmOpjCDcaH5dR5T1obPddekel9f95/BPs/ubwa+wB76acTzPRJ6hOWbYGnkEEb/wqlc96eu2CHAJ1cznLg5Fdf8lBQjxBqv87qbcx2MQJFd5HAjMyrSD0bxN6ABbWUiSQ9f4jQnNA7epjwNBSvWVGATmrX+M+xjjUGbLbHbtLLvU7w/dYf/0OrCV0ZTjjUEQ/WOxzJYh+QiRut5GkP6dz/jBms0kartA0ByWIekbbQQ9DnXYHG2gkIJOE7gc5jK32AgyavwOZ/A504N/AjG/px2entvtxf5Hoh5yByspZMN/JMjZbQ/RwRrf1W5RLZMY3Pkd7Ii8q5N71y9rae/CLbI/PY5qfKyk7ttvy13nj3aBIN6XslwZnW2TcX1KMlre8vk7RZB6QsVd7ccD3dUPXTwVhSCuI+lD80fi2iQhb1H+X5ssBEmn9KD+B7k54yut0XX/HfgvpUkmTvPggOsAAAAASUVORK5CYII=">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #FFF7ED; /* 暖橙色背景 */
            min-height: 100vh;
            margin: 0;
        }

        /* 主界面容器样式 */
        .main-screen-wrapper {
            min-height: 100vh;
            background: #FFF7ED;
        }

        /* 登录页面样式 - 居中布局 */
        .login-wrapper {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            min-height: 100vh;
            padding: 20px;
            background: #FFF7ED;
            position: relative;
            overflow: hidden;
        }

        /* 背景装饰 */
        .login-wrapper::before {
            content: '';
            position: absolute;
            top: -20%;
            right: -20%;
            width: 60%;
            height: 60%;
            background: radial-gradient(circle, rgba(234, 88, 12, 0.08) 0%, transparent 70%);
            border-radius: 50%;
        }

        .login-wrapper::after {
            content: '';
            position: absolute;
            bottom: -20%;
            left: -20%;
            width: 50%;
            height: 50%;
            background: radial-gradient(circle, rgba(234, 88, 12, 0.05) 0%, transparent 70%);
            border-radius: 50%;
        }

        .login-card {
            width: 100%;
            max-width: 420px;
            background: rgba(255, 255, 255, 0.85); /* 半透明白色 */
            backdrop-filter: blur(20px);
            border-radius: 24px;
            padding: 48px;
            box-shadow:
                0 2px 8px rgba(234, 88, 12, 0.08),
                0 1px 4px rgba(234, 88, 12, 0.04),
                0 0 1px rgba(234, 88, 12, 0.06),
                0 20px 40px rgba(234, 88, 12, 0.08);
            position: relative;
            z-index: 1;
            border: 1px solid rgba(234, 88, 12, 0.05);
        }

        .login-header {
            text-align: center;
            margin-bottom: 40px;
        }

        .login-logo {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #EA580C 0%, #F97316 100%);
            border-radius: 20px;
            margin: 0 auto 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
            box-shadow:
                0 2px 4px rgba(234, 88, 12, 0.04),
                0 1px 2px rgba(234, 88, 12, 0.06);
        }

        .login-card h2 {
            font-size: 28px;
            color: #422006; /* 暖褐色 */
            margin-bottom: 8px;
            font-weight: 700;
            letter-spacing: -0.5px;
        }

        .login-card .subtitle {
            color: #78350F; /* 暖褐色 */
            font-size: 14px;
            opacity: 0.8;
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-group label {
            display: block;
            margin-bottom: 8px;
            color: #422006; /* 暖褐色 */
            font-size: 14px;
            font-weight: 500;
        }

        .form-group input {
            width: 100%;
            padding: 14px 16px;
            border: 2px solid rgba(234, 88, 12, 0.1);
            border-radius: 12px;
            font-size: 15px;
            transition: all 0.3s;
            background: #FFF7ED; /* 暖橙色背景 */
            color: #422006; /* 暖褐色 */
        }

        .form-group input:focus {
            outline: none;
            border-color: #EA580C;
            background: white;
            box-shadow: 0 0 0 3px rgba(234, 88, 12, 0.1);
        }

        .form-group input::placeholder {
            color: #78350F; /* 暖褐色 */
            opacity: 0.5;
        }

        .login-btn {
            width: 100%;
            padding: 16px;
            background: linear-gradient(135deg, #EA580C 0%, #F97316 100%);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            margin-top: 10px;
            box-shadow:
                0 2px 4px rgba(234, 88, 12, 0.04),
                0 1px 2px rgba(234, 88, 12, 0.06);
        }

        .login-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow:
                0 4px 8px rgba(234, 88, 12, 0.12),
                0 2px 4px rgba(234, 88, 12, 0.08);
        }

        .login-btn:active:not(:disabled) {
            transform: translateY(0);
        }

        .login-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .login-error {
            color: #DC2626;
            margin-bottom: 20px;
            padding: 12px 16px;
            background: rgba(220, 38, 38, 0.1);
            border: 1px solid rgba(220, 38, 38, 0.2);
            border-radius: 8px;
            font-size: 14px;
            text-align: center;
        }

        /* 主界面样式 */
        .main-content {
            display: none;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.85); /* 半透明白色 */
            backdrop-filter: blur(20px);
            border-radius: 24px;
            box-shadow:
                0 2px 8px rgba(234, 88, 12, 0.08),
                0 1px 4px rgba(234, 88, 12, 0.04),
                0 20px 40px rgba(234, 88, 12, 0.08);
            overflow: hidden;
            border: 1px solid rgba(234, 88, 12, 0.05);
        }

        .header {
            background: linear-gradient(135deg, #EA580C 0%, #F97316 100%);
            color: white;
            padding: 30px;
            text-align: center;
            position: relative;
        }

        .logout-btn {
            position: absolute;
            right: 30px;
            top: 30px;
            padding: 10px 20px;
            background: rgba(255,255,255,0.2);
            border: 1px solid rgba(255,255,255,0.5);
            border-radius: 8px;
            color: white;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.3s;
        }

        .logout-btn:hover {
            background: rgba(255,255,255,0.3);
        }

        .header h1 {
            font-size: 32px;
            margin-bottom: 10px;
            font-weight: 700;
        }

        .header p {
            opacity: 0.9;
            font-size: 14px;
        }

        .nav {
            display: flex;
            gap: 10px;
            padding: 20px 30px;
            background: #FFF7ED; /* 暖橙色背景 */
            border-bottom: 1px solid rgba(234, 88, 12, 0.1);
            flex-wrap: wrap;
        }

        .nav button {
            padding: 10px 20px;
            border: 2px solid rgba(234, 88, 12, 0.1);
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s;
            background: white;
            color: #422006; /* 暖褐色 */
        }

        .nav button:hover {
            background: #EA580C;
            color: white;
            border-color: #EA580C;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(234, 88, 12, 0.12);
        }

        .nav button.active {
            background: #EA580C;
            color: white;
            border-color: #EA580C;
            box-shadow: 0 2px 4px rgba(234, 88, 12, 0.08);
        }

        .content {
            padding: 30px;
        }

        .section {
            display: none;
        }

        .section.active {
            display: block;
        }

        .dashboard {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .card {
            background: white;
            border-radius: 16px;
            padding: 24px;
            border: 1px solid rgba(234, 88, 12, 0.1);
            box-shadow:
                0 2px 4px rgba(234, 88, 12, 0.04),
                0 1px 2px rgba(234, 88, 12, 0.06);
            transition: all 0.3s;
        }

        .card:hover {
            box-shadow:
                0 4px 8px rgba(234, 88, 12, 0.08),
                0 2px 4px rgba(234, 88, 12, 0.12);
        }

        .card h3 {
            color: #422006; /* 暖褐色 */
            margin-bottom: 15px;
            font-size: 18px;
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 600;
        }

        .card .version-info {
            font-size: 24px;
            font-weight: bold;
            color: #EA580C; /* 暖橙色 */
            margin-bottom: 10px;
        }

        .card .build-number {
            color: #78350F; /* 暖褐色 */
            font-size: 14px;
            margin-bottom: 10px;
            opacity: 0.8;
        }

        .card .release-date {
            color: #78350F; /* 暖褐色 */
            font-size: 12px;
            opacity: 0.8;
        }

        .form {
            max-width: 600px;
            margin: 0 auto;
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #422006; /* 暖褐色 */
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 12px;
            border: 2px solid rgba(234, 88, 12, 0.1);
            border-radius: 8px;
            font-size: 14px;
            transition: all 0.3s;
            background: #FFF7ED; /* 暖橙色背景 */
            color: #422006; /* 暖褐色 */
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #EA580C;
            background: white;
            box-shadow: 0 0 0 3px rgba(234, 88, 12, 0.1);
        }

        .form-group textarea {
            min-height: 120px;
            resize: vertical;
        }

        .form-group small {
            color: #78350F; /* 暖褐色 */
            font-size: 12px;
            margin-top: 5px;
            display: block;
            opacity: 0.8;
        }

        /* 表单分区样式 */
        .form-section {
            margin-bottom: 24px;
            padding: 16px;
            background: rgba(234, 88, 12, 0.03);
            border-radius: 12px;
            border: 1px solid rgba(234, 88, 12, 0.08);
        }

        .form-section-title {
            font-size: 15px;
            font-weight: 600;
            color: #422006;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 2px solid rgba(234, 88, 12, 0.1);
        }

        .form-row {
            display: flex;
            gap: 16px;
            flex-wrap: wrap;
        }

        .form-row .form-group {
            flex: 1;
            min-width: 200px;
            margin-bottom: 12px;
        }

        /* 图片预览样式 */
        .image-preview {
            position: relative;
            margin-top: 12px;
            border-radius: 8px;
            overflow: hidden;
            border: 2px solid rgba(234, 88, 12, 0.2);
            max-width: 400px;
        }

        .image-preview img {
            width: 100%;
            height: auto;
            display: block;
            max-height: 300px;
            object-fit: contain;
            background: #FFF7ED;
        }

        .remove-image-btn {
            position: absolute;
            top: 8px;
            right: 8px;
            background: rgba(220, 38, 38, 0.9);
            color: white;
            border: none;
            border-radius: 4px;
            padding: 4px 12px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .remove-image-btn:hover {
            background: #DC2626;
        }

        /* 上传区域样式 */
        .upload-area {
            display: flex;
            flex-direction: column;
            gap: 8px;
            align-items: flex-start;
        }

        /* 复选框组样式 */
        .checkbox-group {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .checkbox-label {
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
            padding: 8px 12px;
            background: rgba(234, 88, 12, 0.05);
            border-radius: 8px;
            transition: all 0.2s;
        }

        .checkbox-label:hover {
            background: rgba(234, 88, 12, 0.1);
        }

        .checkbox-label input[type="checkbox"] {
            display: none;
        }

        .checkbox-custom {
            width: 20px;
            height: 20px;
            border: 2px solid rgba(234, 88, 12, 0.3);
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            background: white;
        }

        .checkbox-label input[type="checkbox"]:checked + .checkbox-custom {
            background: #EA580C;
            border-color: #EA580C;
        }

        .checkbox-label input[type="checkbox"]:checked + .checkbox-custom::after {
            content: '✓';
            color: white;
            font-size: 14px;
            font-weight: bold;
        }

        .checkbox-label span:not(.checkbox-custom) {
            font-weight: 500;
            color: #422006;
        }

        /* 模态框样式优化 */
        .modal-content h2 {
            color: #422006;
            margin-bottom: 20px;
            font-size: 24px;
        }

        .modal-content .form-group:last-child {
            margin-bottom: 0;
        }

        /* 公告列表卡片样式 */
        .announcement-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
            gap: 20px;
        }

        .announcement-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
            border: 2px solid rgba(234, 88, 12, 0.08);
            transition: all 0.3s;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .announcement-card:hover {
            box-shadow: 0 4px 16px rgba(234, 88, 12, 0.12);
            border-color: rgba(234, 88, 12, 0.2);
            transform: translateY(-2px);
        }

        .announcement-card-header {
            display: flex;
            gap: 12px;
        }

        .announcement-card-image {
            width: 80px;
            height: 80px;
            border-radius: 8px;
            overflow: hidden;
            flex-shrink: 0;
            background: rgba(234, 88, 12, 0.05);
        }

        .announcement-card-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .announcement-card-info {
            flex: 1;
            min-width: 0;
        }

        .announcement-card-info h3 {
            margin: 0 0 8px 0;
            font-size: 16px;
            font-weight: 600;
            color: #422006;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .announcement-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }

        .announcement-content {
            margin: 0;
            font-size: 14px;
            color: #78350F;
            line-height: 1.6;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .announcement-footer {
            display: flex;
            align-items: center;
            gap: 12px;
            padding-top: 12px;
            border-top: 1px solid rgba(234, 88, 12, 0.1);
        }

        .time-range,
        .created-time {
            font-size: 12px;
            color: #A16207;
            opacity: 0.8;
        }

        .announcement-actions {
            margin-left: auto;
            display: flex;
            gap: 8px;
        }

        @media (max-width: 768px) {
            .announcement-list {
                grid-template-columns: 1fr;
            }
        }

        /* 上传模式选择器样式 */
        .upload-mode-selector {
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
        }

        .upload-mode-label {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 12px 20px;
            border: 2px solid #E5E7EB;
            border-radius: 8px;
            background: white;
            cursor: pointer;
            transition: all 0.2s;
            font-weight: 500;
            color: #374151;
        }

        .upload-mode-label:hover {
            border-color: #EA580C;
            background: rgba(234, 88, 12, 0.05);
        }

        .upload-mode-label.active {
            border-color: #EA580C;
            background: rgba(234, 88, 12, 0.1);
            color: #EA580C;
        }

        .upload-mode-label input[type="radio"] {
            display: none;
        }

        .upload-mode-icon {
            font-size: 18px;
        }

        .upload-mode-text {
            font-size: 14px;
        }

        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }

        .btn-primary {
            background: linear-gradient(135deg, #EA580C 0%, #F97316 100%);
            color: white;
            box-shadow: 0 2px 4px rgba(234, 88, 12, 0.08);
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(234, 88, 12, 0.12);
        }

        .btn-danger {
            background: #DC2626;
            color: white;
        }

        .btn-danger:hover {
            background: #B91C1C;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(220, 38, 38, 0.12);
        }

        .btn-success {
            background: #10B981;
            color: white;
        }

        .btn-success:hover {
            background: #059669;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(16, 185, 129, 0.12);
        }

        .btn-info {
            background: #3B82F6;
            color: white;
        }

        .btn-info:hover {
            background: #2563EB;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(59, 130, 246, 0.12);
        }

        .btn-secondary {
            background: #78350F; /* 暖褐色 */
            color: white;
        }

        .btn-secondary:hover {
            background: #92400E;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(120, 53, 15, 0.12);
        }

        .btn-small {
            padding: 6px 12px;
            font-size: 12px;
        }

        .versions-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            background: white;
            border-radius: 12px;
            overflow: hidden;
        }

        .versions-table th,
        .versions-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid rgba(234, 88, 12, 0.1);
            color: #422006; /* 暖褐色 */
        }

        .versions-table th {
            background: #FFF7ED; /* 暖橙色背景 */
            font-weight: 600;
            color: #422006; /* 暖褐色 */
            border-bottom: 2px solid rgba(234, 88, 12, 0.15);
        }

        .versions-table tr:hover {
            background: #FFF7ED; /* 暖橙色背景 */
        }

        .badge {
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
        }

        .badge-success {
            background: rgba(16, 185, 129, 0.1);
            color: #10B981;
            border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .badge-warning {
            background: rgba(245, 158, 11, 0.1);
            color: #F59E0B;
            border: 1px solid rgba(245, 158, 11, 0.2);
        }

        .badge-danger {
            background: rgba(220, 38, 38, 0.1);
            color: #DC2626;
            border: 1px solid rgba(220, 38, 38, 0.2);
        }

        .badge-info {
            background: rgba(234, 88, 12, 0.1);
            color: #EA580C;
            border: 1px solid rgba(234, 88, 12, 0.2);
        }

        .badge-secondary {
            background: rgba(107, 114, 128, 0.1);
            color: #6B7280;
            border: 1px solid rgba(107, 114, 128, 0.2);
        }

        .loading {
            text-align: center;
            padding: 40px;
            color: #6c757d;
        }

        .empty {
            text-align: center;
            padding: 40px;
            color: #6c757d;
        }

        .error {
            background: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }

        .success {
            background: #d4edda;
            color: #155724;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }

        .version-detail {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 20px;
        }

        .version-detail h2 {
            margin-bottom: 15px;
            color: #495057;
        }

        .version-detail .info-row {
            display: flex;
            margin-bottom: 10px;
        }

        .version-detail .info-label {
            font-weight: 500;
            width: 120px;
            color: #495057;
        }

        .version-detail .info-value {
            color: #6c757d;
        }

        .version-detail .release-notes {
            margin-top: 20px;
            padding: 15px;
            background: white;
            border-radius: 8px;
            white-space: pre-line;
        }

        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 1000;
            align-items: center;
            justify-content: center;
        }

        .modal.active {
            display: flex;
        }

        .modal-content {
            background: white;
            padding: 30px;
            border-radius: 16px;
            max-width: 500px;
            width: 90%;
            box-shadow:
                0 4px 16px rgba(234, 88, 12, 0.1),
                0 -8px 24px rgba(234, 88, 12, 0.04),
                0 20px 40px rgba(234, 88, 12, 0.08);
        }

        .modal h2 {
            margin-bottom: 15px;
            color: #422006; /* 暖褐色 */
            font-weight: 600;
        }

        .modal p {
            color: #78350F; /* 暖褐色 */
            margin-bottom: 20px;
            opacity: 0.8;
        }

        .modal-actions {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
        }

        .filter-bar {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            align-items: center;
        }

        .filter-bar select {
            padding: 8px 12px;
            border: 2px solid rgba(234, 88, 12, 0.1);
            border-radius: 8px;
            font-size: 14px;
            background: #FFF7ED; /* 暖橙色背景 */
            color: #422006; /* 暖褐色 */
        }

        .filter-bar select:focus {
            outline: none;
            border-color: #EA580C;
            box-shadow: 0 0 0 3px rgba(234, 88, 12, 0.1);
        }

        @media (max-width: 768px) {
            .nav {
                flex-direction: column;
            }

            .versions-table {
                font-size: 12px;
            }

            .versions-table th,
            .versions-table td {
                padding: 8px 4px;
            }

            .login-card {
                padding: 32px;
            }
        }

        .main-content {
            display: none;
        }

        .main-content.active {
            display: block;
        }
    </style>
</head>
<body>
    <!-- 登录界面 -->
    <div id="login-screen" class="login-wrapper">
        <div class="login-card">
            <div class="login-header">
                <div class="login-logo">📦</div>
                <h2>欢迎回来</h2>
                <p class="subtitle">登录以访问管理后台</p>
            </div>
            <div id="login-error" class="login-error" style="display: none;"></div>
            <form id="login-form">
                <div class="form-group">
                    <label for="username">用户名</label>
                    <input type="text" id="username" name="username" placeholder="请输入用户名" required>
                </div>
                <div class="form-group">
                    <label for="password">密码</label>
                    <input type="password" id="password" name="password" placeholder="请输入密码" required>
                </div>
                <button type="submit" class="login-btn">登录</button>
            </form>
        </div>
    </div>

    <!-- 主界面 -->
    <div id="main-screen" class="main-content">
        <div class="main-screen-wrapper">
            <div class="container">
            <div class="header">
                <button onclick="logout()" class="logout-btn">🚪 登出</button>
                <h1>📦 版本管理系统</h1>
                <p>管理APP版本、推送更新、查看更新统计</p>
        </div>

        <div class="nav">
            <button onclick="showSection('dashboard')" class="active" id="nav-dashboard">📊 仪表盘</button>
            <button onclick="showSection('users')" id="nav-users">👥 用户管理</button>
            <button onclick="showSection('models')" id="nav-models">🤖 模型管理</button>
            <button onclick="showSection('welcome')" id="nav-welcome">👋 欢迎内容</button>
            <button onclick="showSection('announcements')" id="nav-announcements">📢 公告管理</button>
            <button onclick="showSection('stats')" id="nav-stats">📈 数据统计</button>
            <button onclick="showSection('create')" id="nav-create">➕ 创建版本</button>
            <button onclick="showSection('list')" id="nav-list">📋 版本列表</button>
            <button onclick="showSection('active')" id="nav-active">✅ 激活的版本</button>
            <button onclick="logout()" style="background-color: #dc3545; color: white; margin-left: auto;">🚪 登出</button>
        </div>

        <div class="content">
            <!-- 仪表盘 -->
            <div id="dashboard" class="section active">
                <div class="dashboard" id="dashboard-content">
                    <div class="loading">加载中...</div>
                </div>
            </div>

            <!-- 用户管理 -->
            <div id="users" class="section">
                <div class="filter-bar">
                    <input type="text" id="user-search" placeholder="搜索用户名或邮箱..." oninput="searchUsers()">
                    <button onclick="loadUsers()" class="btn btn-secondary btn-small">刷新</button>
                </div>
                <div id="users-content">
                    <div class="loading">加载中...</div>
                </div>
            </div>

            <!-- 模型管理 -->
            <div id="models" class="section">
                <div class="filter-bar">
                    <button onclick="loadModels()" class="btn btn-secondary btn-small">刷新</button>
                </div>
                <div id="models-content">
                    <div class="loading">加载中...</div>
                </div>
            </div>

            <!-- 欢迎内容管理 -->
            <div id="welcome" class="section">
                <div class="filter-bar">
                    <button onclick="showCreateWelcome()" class="btn btn-primary btn-small">➕ 创建欢迎内容</button>
                    <button onclick="loadWelcomeContents()" class="btn btn-secondary btn-small">刷新</button>
                </div>
                <div id="welcome-content">
                    <div class="loading">加载中...</div>
                </div>
            </div>

            <!-- 公告管理 -->
            <div id="announcements" class="section">
                <div class="filter-bar">
                    <button onclick="showCreateAnnouncement()" class="btn btn-primary btn-small">➕ 创建公告</button>
                    <button onclick="loadAnnouncements()" class="btn btn-secondary btn-small">刷新</button>
                </div>
                <div id="announcements-content">
                    <div class="loading">加载中...</div>
                </div>
            </div>

            <!-- 数据统计 -->
            <div id="stats" class="section">
                <div id="stats-content">
                    <div class="loading">加载中...</div>
                </div>
            </div>

            <!-- 创建版本 -->
            <div id="create" class="section">
                <div class="form">
                    <h2 style="margin-bottom: 20px; color: #495057;">创建新版本</h2>
                    <div id="create-message"></div>
                    <form id="create-form" onsubmit="createVersion(event)">
                        <div class="form-group">
                            <label for="version">版本号</label>
                            <input type="text" id="version" name="version" placeholder="例如: 1.0.1" required>
                            <small>选择文件后自动填充，或手动输入</small>
                        </div>

                        <div class="form-group">
                            <label for="build_number">构建号</label>
                            <input type="number" id="build_number" name="build_number" placeholder="例如: 101" required>
                            <small>选择文件后自动生成，或手动输入</small>
                        </div>

                        <div class="form-group">
                            <label for="platform">平台</label>
                            <select id="platform" name="platform" required>
                                <option value="">请选择平台</option>
                                <option value="android">Android</option>
                                <option value="ios">iOS</option>
                            </select>
                            <small>选择文件后自动检测</small>
                        </div>

                        <div class="form-group">
                            <label for="force_update">更新类型</label>
                            <select id="force_update" name="force_update" required>
                                <option value="false" selected>可选更新（用户可以选择稍后更新）</option>
                                <option value="true">强制更新（用户必须更新才能使用）</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="release_notes">更新说明</label>
                            <textarea id="release_notes" name="release_notes" placeholder="请输入更新说明（支持换行）" required rows="4"></textarea>
                            <small>详细描述本次更新的内容，用户会看到这些说明</small>
                        </div>

                        <div class="form-group">
                            <label>上传安装包</label>
                            <div class="upload-mode-selector">
                                <label class="upload-mode-label active" id="upload-mode-upload-label">
                                    <input type="radio" id="upload-mode-upload" name="upload-mode" value="upload" checked onchange="toggleUploadMode()">
                                    <span class="upload-mode-icon">📤</span>
                                    <span class="upload-mode-text">直接上传</span>
                                </label>
                                <label class="upload-mode-label" id="upload-mode-url-label">
                                    <input type="radio" id="upload-mode-url" name="upload-mode" value="url" onchange="toggleUploadMode()">
                                    <span class="upload-mode-icon">🔗</span>
                                    <span class="upload-mode-text">外部链接</span>
                                </label>
                            </div>
                        </div>

                        <!-- 文件上传 -->
                        <div class="form-group" id="file-upload-group">
                            <label for="file">选择文件 *</label>
                            <input type="file" id="file" name="file" accept=".apk,.ipa">
                            <small>支持 .apk (Android) 或 .ipa (iOS) 文件</small>
                            <div id="upload-progress" style="display: none; margin-top: 10px;">
                                <div style="background: rgba(234, 88, 12, 0.1); border-radius: 8px; overflow: hidden;">
                                    <div id="upload-progress-bar" style="width: 0%; height: 20px; background: linear-gradient(135deg, #EA580C 0%, #F97316 100%); transition: width 0.3s;"></div>
                                </div>
                                <div id="upload-status" style="margin-top: 5px; font-size: 12px; color: #78350F;">正在上传...</div>
                            </div>
                            <div id="upload-success" style="display: none; margin-top: 10px; padding: 10px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px; font-size: 14px; color: #10B981;">
                                ✓ 文件上传成功
                            </div>
                            <div id="upload-error" style="display: none; margin-top: 10px; padding: 10px; background: rgba(220, 38, 38, 0.1); border: 1px solid rgba(220, 38, 38, 0.2); border-radius: 8px; font-size: 14px; color: #DC2626;">
                                ✗ 文件上传失败
                            </div>
                            <input type="hidden" id="uploaded_file_url" name="uploaded_file_url">
                            <input type="hidden" id="uploaded_file_size" name="uploaded_file_size">
                        </div>

                        <!-- 外部链接 -->
                        <div class="form-group" id="url-group" style="display: none;">
                            <label for="update_url">更新包URL *</label>
                            <input type="url" id="update_url" name="update_url" placeholder="https://example.com/app-v1.0.1.apk">
                            <small>APK或IPA的下载地址</small>
                        </div>

                        <button type="submit" class="btn btn-primary" id="create-btn" disabled>创建版本</button>
                    </form>
                </div>
            </div>

            <!-- 版本列表 -->
            <div id="list" class="section">
                <div class="filter-bar">
                    <select id="platform-filter" onchange="loadVersions()">
                        <option value="">所有平台</option>
                        <option value="android">Android</option>
                        <option value="ios">iOS</option>
                    </select>
                    <button onclick="loadVersions()" class="btn btn-secondary btn-small">刷新</button>
                </div>
                <div id="versions-content">
                    <div class="loading">加载中...</div>
                </div>
            </div>

            <!-- 激活的版本 -->
            <div id="active" class="section">
                <div id="active-content">
                    <div class="loading">加载中...</div>
                </div>
            </div>
        </div>
    </div>

    <!-- 确认对话框 -->
    <div id="confirm-modal" class="modal">
        <div class="modal-content">
            <h2 id="confirm-title">确认操作</h2>
            <p id="confirm-message">确定要执行此操作吗？</p>
            <div class="modal-actions">
                <button onclick="closeModal()" class="btn btn-secondary">取消</button>
                <button id="confirm-btn" class="btn btn-primary">确定</button>
            </div>
        </div>
    </div>

    <!-- 用户编辑模态框 -->
    <div id="user-edit-modal" class="modal">
        <div class="modal-content" style="max-width: 600px;">
            <h2>编辑用户信息</h2>
            <div id="user-edit-message"></div>
            <form id="user-edit-form">
                <input type="hidden" id="edit-user-id">
                <div class="form-group">
                    <label for="edit-username">用户名</label>
                    <input type="text" id="edit-username" readonly style="background: #f8f9fa;">
                </div>
                <div class="form-group">
                    <label for="edit-nickname">昵称</label>
                    <input type="text" id="edit-nickname" name="nickname">
                </div>
                <div class="form-group">
                    <label for="edit-email">邮箱</label>
                    <input type="email" id="edit-email" name="email">
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="edit-is-admin" name="is_admin">
                        管理员权限
                    </label>
                    <small style="display: block; margin-top: 5px;">管理员拥有所有权限</small>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="edit-is-active" name="is_active">
                        启用用户
                    </label>
                    <small style="display: block; margin-top: 5px;">禁用后用户无法登录</small>
                </div>
                <div class="modal-actions">
                    <button type="button" onclick="closeUserEditModal()" class="btn btn-secondary">取消</button>
                    <button type="button" onclick="saveUser()" class="btn btn-primary">保存</button>
                </div>
            </form>
        </div>
    </div>

    <!-- 密码重置模态框 -->
    <div id="password-reset-modal" class="modal">
        <div class="modal-content">
            <h2>重置用户密码</h2>
            <p>请输入新密码（至少6个字符）</p>
            <div id="password-reset-message"></div>
            <form id="password-reset-form">
                <input type="hidden" id="reset-user-id">
                <div class="form-group">
                    <label for="new-password">新密码 *</label>
                    <input type="password" id="new-password" name="new_password" required minlength="6">
                </div>
                <div class="form-group">
                    <label for="confirm-password">确认密码 *</label>
                    <input type="password" id="confirm-password" name="confirm_password" required minlength="6">
                </div>
                <div class="modal-actions">
                    <button type="button" onclick="closePasswordResetModal()" class="btn btn-secondary">取消</button>
                    <button type="button" onclick="resetPassword()" class="btn btn-primary">重置密码</button>
                </div>
            </form>
        </div>
    </div>

    <!-- 模型配置编辑模态框 -->
    <div id="model-config-modal" class="modal">
        <div class="modal-content" style="max-width: 600px;">
            <h2>编辑模型配置</h2>
            <div id="model-config-message"></div>
            <form id="model-config-form">
                <input type="hidden" id="config-model-name">
                <div class="form-group">
                    <label for="config-model-display">模型名称</label>
                    <input type="text" id="config-model-display" readonly style="background: #f8f9fa;">
                </div>
                <div class="form-group">
                    <label for="config-temperature">温度 (Temperature)</label>
                    <input type="number" id="config-temperature" name="temperature" step="0.1" min="0" max="2" value="0.7">
                    <small>控制输出的随机性，范围 0-2，默认 0.7</small>
                </div>
                <div class="form-group">
                    <label for="config-max-tokens">最大 Token 数 (Max Tokens)</label>
                    <input type="number" id="config-max-tokens" name="max_tokens" min="1" max="32000" value="4096">
                    <small>最大生成的 token 数量</small>
                </div>
                <div class="form-group">
                    <label for="config-timeout">超时时间 (Timeout, 秒)</label>
                    <input type="number" id="config-timeout" name="timeout" min="1" max="300" value="30">
                    <small>请求超时时间（秒）</small>
                </div>
                <div class="form-group">
                    <label for="config-priority">优先级 (Priority)</label>
                    <input type="number" id="config-priority" name="priority" min="0" max="10" value="0">
                    <small>数值越小优先级越高，0 为最高优先级</small>
                </div>
                <div class="form-group">
                    <label for="config-cost-factor">成本因子 (Cost Factor)</label>
                    <input type="number" id="config-cost-factor" name="cost_factor" step="0.1" min="0.1" value="1.0">
                    <small>成本因子，用于成本计算</small>
                </div>
                <div class="modal-actions">
                    <button type="button" onclick="closeModelConfigModal()" class="btn btn-secondary">取消</button>
                    <button type="button" onclick="saveModelConfig()" class="btn btn-primary">保存</button>
                </div>
            </form>
        </div>
    </div>

    <!-- 欢迎内容编辑模态框 -->
    <div id="welcome-modal" class="modal">
        <div class="modal-content" style="max-width: 600px;">
            <h2 id="welcome-form-title">创建欢迎内容</h2>
            <div id="welcome-message"></div>
            <form id="welcome-form">
                <input type="hidden" id="welcome-id">
                <div class="form-group">
                    <label for="welcome-title">标题 *</label>
                    <input type="text" id="welcome-title" name="title" required>
                </div>
                <div class="form-group">
                    <label for="welcome-content-text">内容 *</label>
                    <textarea id="welcome-content-text" name="content" rows="4" required></textarea>
                </div>
                <div class="form-group">
                    <label for="welcome-image-url">图片 URL</label>
                    <input type="url" id="welcome-image-url" name="image_url" placeholder="https://...">
                    <small>图片必须是公网可访问的 URL</small>
                </div>
                <div class="form-group">
                    <label for="welcome-button-text">按钮文字</label>
                    <input type="text" id="welcome-button-text" name="button_text" value="开始使用">
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="welcome-is-active" name="is_active">
                        启用
                    </label>
                </div>
                <div class="modal-actions">
                    <button type="button" onclick="closeWelcomeModal()" class="btn btn-secondary">取消</button>
                    <button type="button" onclick="saveWelcomeContent()" class="btn btn-primary">保存</button>
                </div>
            </form>
        </div>
    </div>

    <!-- 公告编辑模态框 -->
    <div id="announcement-modal" class="modal">
        <div class="modal-content" style="max-width: 700px;">
            <h2 id="announcement-form-title">创建公告</h2>
            <div id="announcement-message"></div>
            <form id="announcement-form">
                <input type="hidden" id="announcement-id">

                <!-- 基础信息 -->
                <div class="form-section">
                    <div class="form-section-title">📝 基础信息</div>
                    <div class="form-group">
                        <label for="announcement-title">标题 *</label>
                        <input type="text" id="announcement-title" name="title" placeholder="请输入公告标题" required>
                    </div>
                    <div class="form-group">
                        <label for="announcement-content-text">内容 *</label>
                        <textarea id="announcement-content-text" name="content" rows="5" placeholder="请输入公告内容" required></textarea>
                    </div>
                </div>

                <!-- 图片设置 -->
                <div class="form-section">
                    <div class="form-section-title">🖼️ 图片设置</div>
                    <div class="form-group">
                        <label for="announcement-image-url">图片 URL</label>
                        <input type="url" id="announcement-image-url" name="image_url" placeholder="https://..." oninput="previewAnnouncementImage()">
                        <small>图片必须是公网可访问的 URL，建议尺寸：750×440px</small>
                        <div id="announcement-image-preview" class="image-preview" style="display: none;">
                            <img id="announcement-preview-img" src="" alt="预览" onerror="this.parentElement.style.display='none'">
                            <button type="button" class="remove-image-btn" onclick="removeAnnouncementImage()">✕ 移除</button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>上传图片</label>
                        <div class="upload-area">
                            <input type="file" id="announcement-image-file" accept="image/*" style="display: none;" onchange="uploadAnnouncementImage(event)">
                            <button type="button" class="btn btn-secondary" onclick="document.getElementById('announcement-image-file').click()">
                                📤 选择图片上传
                            </button>
                            <small>支持 JPG、PNG 格式，最大 10MB</small>
                        </div>
                    </div>
                </div>

                <!-- 按钮设置 -->
                <div class="form-section">
                    <div class="form-section-title">🔘 按钮设置</div>
                    <div class="form-group">
                        <label for="announcement-button-text">按钮文字</label>
                        <input type="text" id="announcement-button-text" name="button_text" value="我知道了" placeholder="例如：我知道了">
                    </div>
                </div>

                <!-- 高级设置 -->
                <div class="form-section">
                    <div class="form-section-title">⚙️ 高级设置</div>
                    <div class="form-row">
                        <div class="form-group" style="flex: 1;">
                            <label for="announcement-priority">优先级</label>
                            <input type="number" id="announcement-priority" name="priority" value="0" min="0">
                            <small>数值越大优先级越高</small>
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label for="announcement-target-user-type">目标用户类型</label>
                            <select id="announcement-target-user-type" name="target_user_type">
                                <option value="all">所有用户</option>
                                <option value="new">新用户</option>
                                <option value="active">活跃用户</option>
                                <option value="inactive">不活跃用户</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group" style="flex: 1;">
                            <label for="announcement-start-time">开始时间</label>
                            <input type="datetime-local" id="announcement-start-time" name="start_time">
                            <small>留空表示立即开始</small>
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label for="announcement-end-time">结束时间</label>
                            <input type="datetime-local" id="announcement-end-time" name="end_time">
                            <small>留空表示永不结束</small>
                        </div>
                    </div>
                </div>

                <!-- 状态设置 -->
                <div class="form-section">
                    <div class="form-section-title">🚦 状态设置</div>
                    <div class="checkbox-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="announcement-is-active" name="is_active">
                            <span class="checkbox-custom"></span>
                            <span>启用公告</span>
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" id="announcement-is-update-announcement" name="is_update_announcement">
                            <span class="checkbox-custom"></span>
                            <span>更新公告（APP更新后自动弹出）</span>
                        </label>
                    </div>
                </div>

                <div class="modal-actions">
                    <button type="button" onclick="closeAnnouncementModal()" class="btn btn-secondary">取消</button>
                    <button type="button" onclick="saveAnnouncement()" class="btn btn-primary">保存</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        const API_BASE = '{{ API_BASE }}';
        let authToken = localStorage.getItem('adminToken');

        // 登录
        async function login(username, password) {
            try {
                const response = await fetch(`${API_BASE}/login`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({username, password})
                });
                const data = await response.json();
                if (response.ok) {
                    authToken = data.access_token;
                    localStorage.setItem('adminToken', authToken);
                    const loginScreen = document.getElementById('login-screen');
                    const mainScreen = document.getElementById('main-screen');
                    if (loginScreen) loginScreen.style.display = 'none';
                    if (mainScreen) mainScreen.style.display = 'block';
                    loadDashboard();
                    return true;
                } else {
                    const errorEl = document.getElementById('login-error');
                    if (errorEl) {
                        errorEl.textContent = data.detail || '登录失败';
                        errorEl.style.display = 'block';
                    }
                    return false;
                }
            } catch (error) {
                const errorEl = document.getElementById('login-error');
                if (errorEl) {
                    errorEl.textContent = '网络错误，请检查连接';
                    errorEl.style.display = 'block';
                }
                return false;
            }
        }

        // 登出
        function logout() {
            authToken = null;
            localStorage.removeItem('adminToken');
            const loginScreen = document.getElementById('login-screen');
            const mainScreen = document.getElementById('main-screen');
            if (loginScreen) loginScreen.style.display = 'flex';
            if (mainScreen) mainScreen.style.display = 'none';
        }

        // 检查登录状态
        function checkLogin() {
            const loginScreen = document.getElementById('login-screen');
            const mainScreen = document.getElementById('main-screen');
            
            if (!authToken) {
                if (loginScreen) loginScreen.style.display = 'flex';
                if (mainScreen) mainScreen.style.display = 'none';
                return false;
            }
            if (loginScreen) loginScreen.style.display = 'none';
            if (mainScreen) mainScreen.style.display = 'block';
            return true;
        }

        // 登录表单提交
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const submitBtn = e.target.querySelector('button');

            // 显示 loading 状态
            submitBtn.textContent = '登录中...';
            submitBtn.disabled = true;

            const success = await login(username, password);

            // 恢复按钮状态
            submitBtn.textContent = '登录';
            submitBtn.disabled = false;
        });

        // 输入时清除错误提示
        document.getElementById('username').addEventListener('input', function() {
            const errorEl = document.getElementById('login-error');
            if (errorEl) errorEl.style.display = 'none';
        });

        document.getElementById('password').addEventListener('input', function() {
            const errorEl = document.getElementById('login-error');
            if (errorEl) errorEl.style.display = 'none';
        });

        // 修改 fetchWithAuth 函数
        async function fetchWithAuth(url, options = {}) {
            if (authToken) {
                options.headers = options.headers || {};
                options.headers['Authorization'] = `Bearer ${authToken}`;
            }
            const response = await fetch(url, options);
            if (response.status === 401) {
                logout();
                throw new Error('未授权，请重新登录');
            }
            return response;
        }


        // 显示区块
        function showSection(sectionId) {
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));

            document.getElementById(sectionId).classList.add('active');
            document.getElementById('nav-' + sectionId).classList.add('active');

            // 加载数据
            if (sectionId === 'dashboard') loadDashboard();
            if (sectionId === 'users') loadUsers();
            if (sectionId === 'models') loadModels();
            if (sectionId === 'welcome') loadWelcomeContents();
            if (sectionId === 'announcements') loadAnnouncements();
            if (sectionId === 'stats') loadStats();
            if (sectionId === 'list') loadVersions();
            if (sectionId === 'active') loadActiveVersions();
        }

        // 加载仪表盘
        async function loadDashboard() {
            const content = document.getElementById('dashboard-content');
            try {
                const response = await fetchWithAuth(`${API_BASE}/admin/versions/active`);
                const data = await response.json();

                let html = '<div class="card"><h3>📱 Android</h3>';
                const android = data.versions?.find(v => v.platform === 'android');
                if (android) {
                    html += `<div class="version-info">${android.version}</div>`;
                    html += `<div class="build-number">构建号: ${android.build_number}</div>`;
                    html += `<div class="release-date">激活时间: ${new Date(android.updated_at).toLocaleString('zh-CN')}</div>`;
                    html += `<span class="badge ${android.force_update ? 'badge-danger' : 'badge-success'}">${android.force_update ? '强制更新' : '可选更新'}</span>`;
                } else {
                    html += '<div class="empty">没有激活的版本</div>';
                }
                html += '</div>';

                html += '<div class="card"><h3>🍎 iOS</h3>';
                const ios = data.versions?.find(v => v.platform === 'ios');
                if (ios) {
                    html += `<div class="version-info">${ios.version}</div>`;
                    html += `<div class="build-number">构建号: ${ios.build_number}</div>`;
                    html += `<div class="release-date">激活时间: ${new Date(ios.updated_at).toLocaleString('zh-CN')}</div>`;
                    html += `<span class="badge ${ios.force_update ? 'badge-danger' : 'badge-success'}">${ios.force_update ? '强制更新' : '可选更新'}</span>`;
                } else {
                    html += '<div class="empty">没有激活的版本</div>';
                }
                html += '</div>';

                content.innerHTML = html;
            } catch (error) {
                content.innerHTML = '<div class="error">加载失败: ' + error.message + '</div>';
            }
        }

        // 切换上传模式
        function toggleUploadMode() {
            const uploadMode = document.querySelector('input[name="upload-mode"]:checked').value;
            const fileUploadGroup = document.getElementById('file-upload-group');
            const urlGroup = document.getElementById('url-group');
            const fileInput = document.getElementById('file');

            // 更新样式
            const uploadLabel = document.getElementById('upload-mode-upload-label');
            const urlLabel = document.getElementById('upload-mode-url-label');

            if (uploadMode === 'upload') {
                fileUploadGroup.style.display = 'block';
                urlGroup.style.display = 'none';
                fileInput.required = true;
                uploadLabel.classList.add('active');
                urlLabel.classList.remove('active');
            } else {
                fileUploadGroup.style.display = 'none';
                urlGroup.style.display = 'block';
                fileInput.required = false;
                uploadLabel.classList.remove('active');
                urlLabel.classList.add('active');
            }
        }

        // 上传文件到对象存储
        async function uploadFile(file) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('filename', file.name);
            formData.append('folder', 'uploads');

            const progressBar = document.getElementById('upload-progress-bar');
            const uploadStatus = document.getElementById('upload-status');
            const uploadSuccess = document.getElementById('upload-success');
            const uploadError = document.getElementById('upload-error');
            const uploadProgress = document.getElementById('upload-progress');
            const createBtn = document.getElementById('create-btn');

            // 重置状态
            uploadProgress.style.display = 'block';
            uploadSuccess.style.display = 'none';
            uploadError.style.display = 'none';
            uploadStatus.textContent = '正在上传...';
            progressBar.style.width = '0%';
            createBtn.disabled = true;

            try {
                const response = await fetch(`${API_BASE}/files/upload`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: formData
                });

                if (!response.ok) {
                    const contentType = response.headers.get('content-type');
                    let errorMessage = '上传失败';

                    if (contentType && contentType.includes('application/json')) {
                        // 如果返回的是JSON，解析错误信息
                        try {
                            const error = await response.json();
                            errorMessage = error.detail || '上传失败';
                        } catch (e) {
                            console.error('Failed to parse error response:', e);
                            // 解析失败时显示原始响应文本
                            const text = await response.text();
                            errorMessage = `上传失败 (HTTP ${response.status}): ${text.substring(0, 200)}`;
                        }
                    } else {
                        // 如果返回的是HTML或其他格式，使用状态码
                        errorMessage = `上传失败 (HTTP ${response.status})`;
                    }

                    throw new Error(errorMessage);
                }

                const data = await response.json();

                // 更新进度条
                progressBar.style.width = '100%';
                uploadStatus.textContent = '上传成功！';

                // 显示成功消息
                uploadSuccess.style.display = 'block';
                uploadProgress.style.display = 'none';

                // 设置隐藏字段的值
                document.getElementById('uploaded_file_url').value = data.url;
                document.getElementById('uploaded_file_size').value = file.size;

                // 启用创建按钮
                createBtn.disabled = false;
                createBtn.textContent = '创建版本';

                return data;
            } catch (error) {
                uploadError.style.display = 'block';
                uploadError.textContent = '✗ ' + error.message;
                uploadProgress.style.display = 'none';
                createBtn.disabled = false;
                createBtn.textContent = '创建版本';
                throw error;
            }
        }

        // 监听文件选择
        document.addEventListener('DOMContentLoaded', function() {
            const fileInput = document.getElementById('file');
            if (fileInput) {
                fileInput.addEventListener('change', async function(e) {
                    const file = e.target.files[0];
                    if (!file) return;

                    // 检查文件类型
                    const allowedTypes = ['.apk', '.ipa'];
                    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
                    if (!allowedTypes.includes(fileExt)) {
                        alert('只支持 .apk 或 .ipa 文件');
                        fileInput.value = '';
                        return;
                    }

                    // 检查文件大小（最大500MB）
                    const maxSize = 500 * 1024 * 1024;
                    if (file.size > maxSize) {
                        alert('文件大小不能超过500MB');
                        fileInput.value = '';
                        return;
                    }

                    // 自动填充表单字段
                    autoFillFormFields(file);

                    // 开始上传
                    await uploadFile(file);
                });
            }

            // 初始化上传模式
            toggleUploadMode();
        });

        // 自动填充表单字段
        function autoFillFormFields(file) {
            const fileName = file.name;
            const fileExt = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();

            // 1. 从文件名提取版本号（支持格式：appname-v1.0.1.apk 或 appname_1.0.1.apk）
            let version = '';
            const versionMatch = fileName.match(/[-_](\d+\.\d+\.\d+)/);
            if (versionMatch) {
                version = versionMatch[1];
                document.getElementById('version').value = version;
            } else {
                // 如果文件名中没有版本号，尝试从文件名生成
                const cleanName = fileName.replace(/\.(apk|ipa)$/i, '').replace(/[-_]/g, '.');
                const parts = cleanName.split('.');
                if (parts.length >= 3) {
                    // 尝试提取三个数字部分作为版本号
                    const versionParts = [];
                    for (const part of parts) {
                        if (/^\d+$/.test(part)) {
                            versionParts.push(part);
                        }
                        if (versionParts.length >= 3) break;
                    }
                    if (versionParts.length >= 3) {
                        version = versionParts.slice(0, 3).join('.');
                        document.getElementById('version').value = version;
                    }
                }
            }

            // 2. 自动检测平台
            const platform = fileExt === '.apk' ? 'android' : 'ios';
            document.getElementById('platform').value = platform;

            // 3. 自动生成构建号（如果已有版本号）
            if (version) {
                const versionParts = version.split('.').map(Number);
                const buildNumber = versionParts[0] * 10000 + versionParts[1] * 100 + versionParts[2];
                const buildNumberField = document.getElementById('build_number');
                if (!buildNumberField.value) {
                    buildNumberField.value = buildNumber;
                }
            }

            // 4. 显示自动填充提示
            showToast('已自动填充版本信息');
        }

        // 显示提示消息
        function showToast(message) {
            // 创建提示元素
            const toast = document.createElement('div');
            toast.textContent = message;
            toast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #10B981;
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                z-index: 10000;
                animation: slideIn 0.3s ease;
            `;

            // 添加动画样式
            if (!document.getElementById('toast-style')) {
                const style = document.createElement('style');
                style.id = 'toast-style';
                style.textContent = `
                    @keyframes slideIn {
                        from {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                        to {
                            transform: translateX(0);
                            opacity: 1;
                        }
                    }
                    @keyframes fadeOut {
                        from {
                            opacity: 1;
                        }
                        to {
                            opacity: 0;
                        }
                    }
                `;
                document.head.appendChild(style);
            }

            document.body.appendChild(toast);

            // 3秒后自动消失
            setTimeout(() => {
                toast.style.animation = 'fadeOut 0.3s ease';
                setTimeout(() => {
                    document.body.removeChild(toast);
                }, 300);
            }, 3000);
        }

        // 创建版本
        async function createVersion(event) {
            event.preventDefault();
            const message = document.getElementById('create-message');

            const form = event.target;
            const formData = new FormData(form);

            // 检查上传模式
            const uploadMode = document.querySelector('input[name="upload-mode"]:checked').value;

            let fileUrl = null;
            let fileSize = null;

            if (uploadMode === 'upload') {
                // 使用上传的文件
                fileUrl = document.getElementById('uploaded_file_url').value;
                fileSize = parseInt(document.getElementById('uploaded_file_size').value);

                if (!fileUrl) {
                    message.innerHTML = '<div class="error">❌ 请先上传文件</div>';
                    return;
                }
            } else {
                // 使用外部链接
                fileUrl = formData.get('update_url');
                if (!fileUrl) {
                    message.innerHTML = '<div class="error">❌ 请输入更新包URL</div>';
                    return;
                }
            }

            const data = {
                version: formData.get('version'),
                version_name: formData.get('version'),
                build_number: parseInt(formData.get('build_number')),
                version_code: parseInt(formData.get('build_number')),
                platform: formData.get('platform'),
                release_notes: formData.get('release_notes'),
                file_url: fileUrl,
                file_size: fileSize,
                is_active: false
            };

            try {
                const response = await fetchWithAuth(`${API_BASE}/admin/versions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    message.innerHTML = '<div class="success">✅ 版本创建成功！</div>';
                    form.reset();

                    // 重置上传状态
                    document.getElementById('upload-progress').style.display = 'none';
                    document.getElementById('upload-success').style.display = 'none';
                    document.getElementById('upload-error').style.display = 'none';
                    document.getElementById('uploaded_file_url').value = '';
                    document.getElementById('uploaded_file_size').value = '';
                    document.getElementById('upload-progress-bar').style.width = '0%';

                    setTimeout(() => {
                        showSection('list');
                    }, 1500);
                } else {
                    const error = await response.json();
                    message.innerHTML = '<div class="error">❌ 创建失败: ' + (error.detail || '未知错误') + '</div>';
                }
            } catch (error) {
                message.innerHTML = '<div class="error">❌ 请求失败: ' + error.message + '</div>';
            }
        }

        // 加载版本列表
        async function loadVersions() {
            const content = document.getElementById('versions-content');
            const platform = document.getElementById('platform-filter').value;

            try {
                const url = `${API_BASE}/admin/versions${platform ? '?platform=' + platform : ''}`;
                const response = await fetchWithAuth(url);
                const data = await response.json();

                if (!data.versions || data.versions.length === 0) {
                    content.innerHTML = '<div class="empty">没有找到版本</div>';
                    return;
                }

                let html = '<table class="versions-table"><thead><tr>';
                html += '<th>版本</th><th>构建号</th><th>平台</th><th>状态</th><th>类型</th><th>发布日期</th><th>操作</th>';
                html += '</tr></thead><tbody>';

                data.versions.forEach(v => {
                    html += '<tr>';
                    html += `<td><strong>${v.version}</strong></td>`;
                    html += `<td>${v.build_number}</td>`;
                    html += `<td>${v.platform}</td>`;
                    html += `<td>${v.is_active ? '<span class="badge badge-success">已激活</span>' : '<span class="badge badge-warning">未激活</span>'}</td>`;
                    html += `<td>${v.force_update ? '<span class="badge badge-danger">强制</span>' : '<span class="badge badge-info">可选</span>'}</td>`;
                    html += `<td>${new Date(v.release_date).toLocaleDateString('zh-CN')}</td>`;
                    html += '<td>';
                    html += `<button onclick="showVersionDetail('${v.id}')" class="btn btn-secondary btn-small">查看</button> `;
                    if (!v.is_active) {
                        html += `<button onclick="activateVersion('${v.id}')" class="btn btn-success btn-small">激活</button> `;
                        html += `<button onclick="deleteVersion('${v.id}')" class="btn btn-danger btn-small">删除</button>`;
                    }
                    html += '</td>';
                    html += '</tr>';
                });

                html += '</tbody></table>';
                content.innerHTML = html;
            } catch (error) {
                content.innerHTML = '<div class="error">加载失败: ' + error.message + '</div>';
            }
        }

        // 加载激活的版本
        async function loadActiveVersions() {
            const content = document.getElementById('active-content');

            try {
                const response = await fetchWithAuth(`${API_BASE}/admin/versions/active`);
                const data = await response.json();

                if (!data.versions || data.versions.length === 0) {
                    content.innerHTML = '<div class="empty">没有激活的版本</div>';
                    return;
                }

                let html = '';
                data.versions.forEach(v => {
                    html += '<div class="version-detail">';
                    html += `<h2>${v.platform.toUpperCase()} - ${v.version}</h2>`;
                    html += '<div class="info-row"><span class="info-label">构建号:</span><span class="info-value">' + v.build_number + '</span></div>';
                    html += '<div class="info-row"><span class="info-label">类型:</span><span class="info-value">' + (v.force_update ? '强制更新' : '可选更新') + '</span></div>';
                    html += '<div class="info-row"><span class="info-label">激活时间:</span><span class="info-value">' + new Date(v.updated_at).toLocaleString('zh-CN') + '</span></div>';
                    html += '<div class="info-row"><span class="info-label">下载链接:</span><span class="info-value">' + (v.update_url || '未设置') + '</span></div>';
                    html += '<div class="release-notes"><strong>更新说明:</strong><br>' + v.release_notes.replace(/\\n/g, '<br>') + '</div>';
                    html += '</div>';
                });

                content.innerHTML = html;
            } catch (error) {
                content.innerHTML = '<div class="error">加载失败: ' + error.message + '</div>';
            }
        }

        // 显示版本详情
        async function showVersionDetail(versionId) {
            try {
                const response = await fetchWithAuth(`${API_BASE}/admin/versions/${versionId}`);
                const data = await response.json();

                let html = '<div class="version-detail">';
                html += `<h2>版本 ${data.version}</h2>`;
                html += '<div class="info-row"><span class="info-label">ID:</span><span class="info-value">' + data.id + '</span></div>';
                html += '<div class="info-row"><span class="info-label">构建号:</span><span class="info-value">' + data.build_number + '</span></div>';
                html += '<div class="info-row"><span class="info-label">平台:</span><span class="info-value">' + data.platform + '</span></div>';
                html += '<div class="info-row"><span class="info-label">状态:</span><span class="info-value">' + (data.is_active ? '已激活' : '未激活') + '</span></div>';
                html += '<div class="info-row"><span class="info-label">类型:</span><span class="info-value">' + (data.force_update ? '强制更新' : '可选更新') + '</span></div>';
                html += '<div class="info-row"><span class="info-label">发布日期:</span><span class="info-value">' + new Date(data.release_date).toLocaleString('zh-CN') + '</span></div>';
                html += '<div class="info-row"><span class="info-label">下载链接:</span><span class="info-value">' + (data.update_url || '未设置') + '</span></div>';
                html += '<div class="release-notes"><strong>更新说明:</strong><br>' + data.release_notes.replace(/\\n/g, '<br>') + '</div>';
                html += '</div>';
                html += `<button onclick="showSection('list')" class="btn btn-secondary">返回列表</button>`;

                document.getElementById('list-content') = document.getElementById('versions-content');
                document.getElementById('versions-content').innerHTML = html;
            } catch (error) {
                alert('加载失败: ' + error.message);
            }
        }

        // 激活版本
        let pendingActivation = null;
        function activateVersion(versionId) {
            pendingActivation = versionId;
            document.getElementById('confirm-title').textContent = '激活版本';
            document.getElementById('confirm-message').textContent = '激活此版本后，所有用户都会收到更新通知！确定要继续吗？';
            document.getElementById('confirm-btn').onclick = confirmActivation;
            document.getElementById('confirm-modal').classList.add('active');
        }

        async function confirmActivation() {
            if (!pendingActivation) return;

            try {
                const response = await fetchWithAuth(`${API_BASE}/admin/versions/${pendingActivation}/activate`, {
                    method: 'POST'
                });

                if (response.ok) {
                    alert('✅ 版本激活成功！');
                    loadVersions();
                } else {
                    const error = await response.json();
                    alert('❌ 激活失败: ' + (error.detail || '未知错误'));
                }
            } catch (error) {
                alert('❌ 请求失败: ' + error.message);
            } finally {
                closeModal();
            }
        }

        // 删除版本
        let pendingDelete = null;
        function deleteVersion(versionId) {
            pendingDelete = versionId;
            document.getElementById('confirm-title').textContent = '删除版本';
            document.getElementById('confirm-message').textContent = '删除后无法恢复，确定要继续吗？';
            document.getElementById('confirm-btn').onclick = confirmDelete;
            document.getElementById('confirm-btn').className = 'btn btn-danger';
            document.getElementById('confirm-modal').classList.add('active');
        }

        async function confirmDelete() {
            if (!pendingDelete) return;

            try {
                const response = await fetchWithAuth(`${API_BASE}/admin/versions/${pendingDelete}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    alert('✅ 版本删除成功！');
                    loadVersions();
                } else {
                    const error = await response.json();
                    alert('❌ 删除失败: ' + (error.detail || '未知错误'));
                }
            } catch (error) {
                alert('❌ 请求失败: ' + error.message);
            } finally {
                closeModal();
            }
        }

        // 关闭对话框
        function closeModal() {
            document.getElementById('confirm-modal').classList.remove('active');
            pendingActivation = null;
            pendingDelete = null;
        }

        // 初始化
        window.onload = function() {
            // 检查登录状态
            if (checkLogin()) {
                loadDashboard();
            }
        };

        // ========== 用户管理相关函数 ==========

        // 加载用户列表
        async function loadUsers() {
            const content = document.getElementById('users-content');

            try {
                const response = await fetchWithAuth(`${API_BASE}/admin/users?skip=0&limit=50`);
                const data = await response.json();

                if (!data.users || data.users.length === 0) {
                    content.innerHTML = '<div class="empty">没有找到用户</div>';
                    return;
                }

                let html = '<table class="versions-table"><thead><tr>';
                html += '<th>用户名</th><th>昵称</th><th>邮箱</th><th>日记数</th><th>角色</th><th>状态</th><th>注册时间</th><th>操作</th>';
                html += '</tr></thead><tbody>';

                data.users.forEach(u => {
                    html += '<tr>';
                    html += `<td><strong>${u.username}</strong></td>`;
                    html += `<td>${u.nickname || '-'}</td>`;
                    html += `<td>${u.email || '-'}</td>`;
                    html += `<td>${u.diary_count || 0}</td>`;
                    html += `<td>${u.is_admin ? '<span class="badge badge-danger">管理员</span>' : '<span class="badge badge-info">用户</span>'}</td>`;
                    html += `<td>${u.is_active ? '<span class="badge badge-success">启用</span>' : '<span class="badge badge-warning">禁用</span>'}</td>`;
                    html += `<td>${new Date(u.created_at).toLocaleDateString('zh-CN')}</td>`;
                    html += '<td>';
                    html += `<button onclick="editUser('${u.id}')" class="btn btn-secondary btn-small">编辑</button> `;
                    html += `<button onclick="openPasswordReset('${u.id}')" class="btn btn-primary btn-small">重置密码</button> `;
                    html += `<button onclick="viewUserDiaries('${u.id}', '${u.username}')" class="btn btn-info btn-small">查看日记</button> `;
                    html += `<button onclick="deleteUser('${u.id}')" class="btn btn-danger btn-small">删除</button>`;
                    html += '</td>';
                    html += '</tr>';
                });

                html += '</tbody></table>';
                content.innerHTML = html;
            } catch (error) {
                content.innerHTML = '<div class="error">加载失败: ' + error.message + '</div>';
            }
        }

        // 搜索用户
        let searchTimeout = null;
        function searchUsers() {
            clearTimeout(searchTimeout);
            const searchTerm = document.getElementById('user-search').value.toLowerCase();
            if (!searchTerm) {
                loadUsers();
                return;
            }
            searchTimeout = setTimeout(async () => {
                const content = document.getElementById('users-content');
                try {
                    const response = await fetchWithAuth(`${API_BASE}/admin/users?skip=0&limit=50`);
                    const data = await response.json();
                    const filteredUsers = data.users.filter(u =>
                        u.username.toLowerCase().includes(searchTerm) ||
                        (u.email && u.email.toLowerCase().includes(searchTerm)) ||
                        (u.nickname && u.nickname.toLowerCase().includes(searchTerm))
                    );

                    if (!filteredUsers || filteredUsers.length === 0) {
                        content.innerHTML = '<div class="empty">没有找到匹配的用户</div>';
                        return;
                    }

                    let html = '<table class="versions-table"><thead><tr>';
                    html += '<th>用户名</th><th>昵称</th><th>邮箱</th><th>日记数</th><th>角色</th><th>状态</th><th>注册时间</th><th>操作</th>';
                    html += '</tr></thead><tbody>';

                    filteredUsers.forEach(u => {
                        html += '<tr>';
                        html += `<td><strong>${u.username}</strong></td>`;
                        html += `<td>${u.nickname || '-'}</td>`;
                        html += `<td>${u.email || '-'}</td>`;
                        html += `<td>${u.diary_count || 0}</td>`;
                        html += `<td>${u.is_admin ? '<span class="badge badge-danger">管理员</span>' : '<span class="badge badge-info">用户</span>'}</td>`;
                        html += `<td>${u.is_active ? '<span class="badge badge-success">启用</span>' : '<span class="badge badge-warning">禁用</span>'}</td>`;
                        html += `<td>${new Date(u.created_at).toLocaleDateString('zh-CN')}</td>`;
                        html += '<td>';
                        html += `<button onclick="editUser('${u.id}')" class="btn btn-secondary btn-small">编辑</button> `;
                        html += `<button onclick="openPasswordReset('${u.id}')" class="btn btn-primary btn-small">重置密码</button> `;
                        html += `<button onclick="deleteUser('${u.id}')" class="btn btn-danger btn-small">删除</button>`;
                        html += '</td>';
                        html += '</tr>';
                    });

                    html += '</tbody></table>';
                    content.innerHTML = html;
                } catch (error) {
                    content.innerHTML = '<div class="error">加载失败: ' + error.message + '</div>';
                }
            }, 300);
        }

        // 编辑用户
        async function editUser(userId) {
            try {
                const response = await fetchWithAuth(`${API_BASE}/admin/users/${userId}`);
                const data = await response.json();
                const user = data.user;

                document.getElementById('edit-user-id').value = user.id;
                document.getElementById('edit-username').value = user.username;
                document.getElementById('edit-nickname').value = user.nickname || '';
                document.getElementById('edit-email').value = user.email || '';
                document.getElementById('edit-is-admin').checked = user.is_admin;
                document.getElementById('edit-is-active').checked = user.is_active;

                document.getElementById('user-edit-modal').classList.add('active');
            } catch (error) {
                alert('加载用户信息失败: ' + error.message);
            }
        }

        // 保存用户信息
        async function saveUser() {
            const userId = document.getElementById('edit-user-id').value;
            const message = document.getElementById('user-edit-message');

            const data = {
                nickname: document.getElementById('edit-nickname').value,
                email: document.getElementById('edit-email').value,
                is_admin: document.getElementById('edit-is-admin').checked,
                is_active: document.getElementById('edit-is-active').checked
            };

            try {
                const response = await fetchWithAuth(`${API_BASE}/admin/users/${userId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    message.innerHTML = '<div class="success">✅ 用户信息更新成功！</div>';
                    setTimeout(() => {
                        closeUserEditModal();
                        loadUsers();
                    }, 1500);
                } else {
                    const error = await response.json();
                    message.innerHTML = '<div class="error">❌ 更新失败: ' + (error.detail || '未知错误') + '</div>';
                }
            } catch (error) {
                message.innerHTML = '<div class="error">❌ 请求失败: ' + error.message + '</div>';
            }
        }

        // 关闭用户编辑模态框
        function closeUserEditModal() {
            document.getElementById('user-edit-modal').classList.remove('active');
            document.getElementById('user-edit-message').innerHTML = '';
        }

        // 打开密码重置模态框
        function openPasswordReset(userId) {
            document.getElementById('reset-user-id').value = userId;
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-password').value = '';
            document.getElementById('password-reset-message').innerHTML = '';
            document.getElementById('password-reset-modal').classList.add('active');
        }

        // 关闭密码重置模态框
        function closePasswordResetModal() {
            document.getElementById('password-reset-modal').classList.remove('active');
            document.getElementById('password-reset-message').innerHTML = '';
        }

        // 重置密码
        async function resetPassword() {
            const userId = document.getElementById('reset-user-id').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const message = document.getElementById('password-reset-message');

            if (newPassword !== confirmPassword) {
                message.innerHTML = '<div class="error">❌ 两次输入的密码不一致</div>';
                return;
            }

            if (newPassword.length < 6) {
                message.innerHTML = '<div class="error">❌ 密码长度至少6个字符</div>';
                return;
            }

            try {
                const response = await fetchWithAuth(`${API_BASE}/admin/users/${userId}/password`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ new_password: newPassword })
                });

                if (response.ok) {
                    message.innerHTML = '<div class="success">✅ 密码重置成功！</div>';
                    setTimeout(() => {
                        closePasswordResetModal();
                    }, 1500);
                } else {
                    const error = await response.json();
                    message.innerHTML = '<div class="error">❌ 重置失败: ' + (error.detail || '未知错误') + '</div>';
                }
            } catch (error) {
                message.innerHTML = '<div class="error">❌ 请求失败: ' + error.message + '</div>';
            }
        }

        // 查看用户日记
        async function viewUserDiaries(userId, username) {
            try {
                const response = await fetchWithAuth(`${API_BASE}/admin/users/${userId}/diaries?skip=0&limit=20`);
                const data = await response.json();

                let html = `<h2 style="margin-bottom: 20px; color: #495057;">${username} 的日记</h2>`;

                if (!data.diaries || data.diaries.length === 0) {
                    html += '<div class="empty">该用户还没有写日记</div>';
                } else {
                    data.diaries.forEach(d => {
                        html += '<div class="version-detail">';
                        html += `<h3>${d.title || '无标题'} - ${new Date(d.created_at).toLocaleString('zh-CN')}</h3>`;
                        html += `<p><strong>心情:</strong> ${d.mood || '未记录'}</p>`;
                        html += `<div class="release-notes"><strong>内容:</strong><br>${d.content}</div>`;
                        html += '</div>';
                    });
                }

                html += `<button onclick="loadUsers()" class="btn btn-secondary">返回用户列表</button>`;
                document.getElementById('users-content').innerHTML = html;
            } catch (error) {
                alert('加载用户日记失败: ' + error.message);
            }
        }

        // 删除用户
        let pendingDeleteUser = null;
        function deleteUser(userId) {
            pendingDeleteUser = userId;
            document.getElementById('confirm-title').textContent = '删除用户';
            document.getElementById('confirm-message').textContent = '删除用户将同时删除其所有日记，此操作无法恢复！确定要继续吗？';
            document.getElementById('confirm-btn').onclick = confirmDeleteUser;
            document.getElementById('confirm-btn').className = 'btn btn-danger';
            document.getElementById('confirm-modal').classList.add('active');
        }

        async function confirmDeleteUser() {
            if (!pendingDeleteUser) return;

            try {
                const response = await fetchWithAuth(`${API_BASE}/admin/users/${pendingDeleteUser}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    alert('✅ 用户删除成功！');
                    loadUsers();
                } else {
                    const error = await response.json();
                    alert('❌ 删除失败: ' + (error.detail || '未知错误'));
                }
            } catch (error) {
                alert('❌ 请求失败: ' + error.message);
            } finally {
                closeModal();
            }
        }

        // ========== 数据统计相关函数 ==========

        // 加载数据统计
        async function loadStats() {
            const content = document.getElementById('stats-content');

            try {
                const response = await fetchWithAuth(`${API_BASE}/admin/stats`);
                const data = await response.json();

                const stats = data.stats;

                let html = '<div class="dashboard">';
                html += '<div class="card"><h3>👥 总用户数</h3>';
                html += `<div class="version-info">${stats.total_users}</div>`;
                html += '<div class="build-number">所有注册用户</div>';
                html += '</div>';

                html += '<div class="card"><h3>👑 管理员数量</h3>';
                html += `<div class="version-info">${stats.admin_count}</div>`;
                html += '<div class="build-number">拥有管理权限</div>';
                html += '</div>';

                html += '<div class="card"><h3>🔥 活跃用户</h3>';
                html += `<div class="version-info">${stats.active_users_count}</div>`;
                html += '<div class="build-number">最近30天有日记</div>';
                html += '</div>';

                html += '<div class="card"><h3>📔 日记总数</h3>';
                html += `<div class="version-info">${stats.total_diaries}</div>`;
                html += '<div class="build-number">所有用户日记</div>';
                html += '</div>';

                html += '<div class="card"><h3>🆕 最近日记</h3>';
                html += `<div class="version-info">${stats.recent_diaries_count}</div>`;
                html += '<div class="build-number">最近30天新增</div>';
                html += '</div>';
                html += '</div>';

                content.innerHTML = html;
            } catch (error) {
                content.innerHTML = '<div class="error">加载失败: ' + error.message + '</div>';
            }
        }

        // ========== 模型管理相关函数 ==========

        // 加载模型列表
        async function loadModels() {
            const content = document.getElementById('models-content');

            try {
                const response = await fetchWithAuth(`${API_BASE}/admin/models`);
                const data = await response.json();

                if (!data.models || data.models.length === 0) {
                    content.innerHTML = '<div class="empty">没有找到模型</div>';
                    return;
                }

                let html = '<table class="versions-table"><thead><tr>';
                html += '<th>模型名称</th><th>提供商</th><th>状态</th><th>失败次数</th><th>黑名单</th><th>优先级</th><th>温度</th><th>操作</th>';
                html += '</tr></thead><tbody>';

                data.models.forEach(m => {
                    html += '<tr>';
                    html += `<td><strong>${m.name}</strong></td>`;
                    html += `<td>${m.provider}</td>`;
                    html += `<td>${m.enabled ? '<span class="badge badge-success">启用</span>' : '<span class="badge badge-warning">禁用</span>'}</td>`;
                    html += `<td>${m.failure_count}</td>`;
                    html += `<td>${m.is_blacklisted ? '<span class="badge badge-danger">是</span>' : '<span class="badge badge-success">否</span>'}</td>`;
                    html += `<td>${m.priority}</td>`;
                    html += `<td>${m.temperature}</td>`;
                    html += '<td>';
                    html += `<button onclick="editModelConfig('${m.name}')" class="btn btn-secondary btn-small">配置</button> `;
                    if (m.enabled) {
                        html += `<button onclick="disableModel('${m.name}')" class="btn btn-warning btn-small">禁用</button> `;
                    } else {
                        html += `<button onclick="enableModel('${m.name}')" class="btn btn-success btn-small">启用</button> `;
                    }
                    if (m.is_blacklisted || m.failure_count > 0) {
                        html += `<button onclick="resetModelFailure('${m.name}')" class="btn btn-info btn-small">重置</button> `;
                    }
                    html += '</td>';
                    html += '</tr>';
                });

                html += '</tbody></table>';
                content.innerHTML = html;
            } catch (error) {
                content.innerHTML = '<div class="error">加载失败: ' + error.message + '</div>';
            }
        }

        // 启用模型
        async function enableModel(modelName) {
            try {
                const response = await fetchWithAuth(`${API_BASE}/admin/models/${modelName}/enable`, {
                    method: 'PUT'
                });

                if (response.ok) {
                    loadModels();
                } else {
                    alert('❌ 启用失败');
                }
            } catch (error) {
                alert('❌ 请求失败: ' + error.message);
            }
        }

        // 禁用模型
        async function disableModel(modelName) {
            if (!confirm(`确定要禁用模型 ${modelName} 吗？`)) return;

            try {
                const response = await fetchWithAuth(`${API_BASE}/admin/models/${modelName}/disable`, {
                    method: 'PUT'
                });

                if (response.ok) {
                    loadModels();
                } else {
                    alert('❌ 禁用失败');
                }
            } catch (error) {
                alert('❌ 请求失败: ' + error.message);
            }
        }

        // 重置模型失败计数
        async function resetModelFailure(modelName) {
            try {
                const response = await fetchWithAuth(`${API_BASE}/admin/models/${modelName}/reset-failure`, {
                    method: 'PUT'
                });

                if (response.ok) {
                    loadModels();
                } else {
                    alert('❌ 重置失败');
                }
            } catch (error) {
                alert('❌ 请求失败: ' + error.message);
            }
        }

        // 编辑模型配置
        async function editModelConfig(modelName) {
            try {
                const response = await fetchWithAuth(`${API_BASE}/admin/models`);
                const data = await response.json();
                const model = data.models.find(m => m.name === modelName);

                if (!model) {
                    alert('未找到模型配置');
                    return;
                }

                document.getElementById('config-model-name').value = model.name;
                document.getElementById('config-model-display').value = model.name;
                document.getElementById('config-temperature').value = model.temperature;
                document.getElementById('config-max-tokens').value = model.max_tokens;
                document.getElementById('config-timeout').value = model.timeout;
                document.getElementById('config-priority').value = model.priority;
                document.getElementById('config-cost-factor').value = model.cost_factor;

                document.getElementById('model-config-modal').classList.add('active');
            } catch (error) {
                alert('加载模型配置失败: ' + error.message);
            }
        }

        // 关闭模型配置模态框
        function closeModelConfigModal() {
            document.getElementById('model-config-modal').classList.remove('active');
            document.getElementById('model-config-message').innerHTML = '';
        }

        // 保存模型配置
        async function saveModelConfig() {
            const modelName = document.getElementById('config-model-name').value;
            const message = document.getElementById('model-config-message');

            const data = {
                temperature: parseFloat(document.getElementById('config-temperature').value),
                max_tokens: parseInt(document.getElementById('config-max-tokens').value),
                timeout: parseInt(document.getElementById('config-timeout').value),
                priority: parseInt(document.getElementById('config-priority').value),
                cost_factor: parseFloat(document.getElementById('config-cost-factor').value)
            };

            try {
                const response = await fetchWithAuth(`${API_BASE}/admin/models/${modelName}/config`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    message.innerHTML = '<div class="success">✅ 模型配置更新成功！</div>';
                    setTimeout(() => {
                        closeModelConfigModal();
                        loadModels();
                    }, 1500);
                } else {
                    const error = await response.json();
                    message.innerHTML = '<div class="error">❌ 更新失败: ' + (error.detail || '未知错误') + '</div>';
                }
            } catch (error) {
                message.innerHTML = '<div class="error">❌ 请求失败: ' + error.message + '</div>';
            }
        }

        // ========== 欢迎内容管理相关函数 ==========

        // 加载欢迎内容列表
        async function loadWelcomeContents() {
            const content = document.getElementById('welcome-content');

            try {
                const response = await fetchWithAuth(`${API_BASE}/admin/welcome`);
                const data = await response.json();

                if (!data.welcome_contents || data.welcome_contents.length === 0) {
                    content.innerHTML = '<div class="empty">没有欢迎内容</div>';
                    return;
                }

                let html = '<table class="versions-table"><thead><tr>';
                html += '<th>ID</th><th>标题</th><th>内容</th><th>按钮文字</th><th>状态</th><th>创建时间</th><th>操作</th>';
                html += '</tr></thead><tbody>';

                data.welcome_contents.forEach(w => {
                    html += '<tr>';
                    html += `<td><small>${w.id.substring(0, 8)}...</small></td>`;
                    html += `<td><strong>${w.title}</strong></td>`;
                    html += `<td><small>${w.content.substring(0, 50)}...</small></td>`;
                    html += `<td>${w.button_text}</td>`;
                    html += `<td>${w.is_active ? '<span class="badge badge-success">启用</span>' : '<span class="badge badge-warning">禁用</span>'}</td>`;
                    html += `<td>${new Date(w.created_at).toLocaleDateString('zh-CN')}</td>`;
                    html += '<td>';
                    html += `<button onclick="editWelcomeContent('${w.id}')" class="btn btn-secondary btn-small">编辑</button> `;
                    html += `<button onclick="deleteWelcomeContent('${w.id}')" class="btn btn-danger btn-small">删除</button>`;
                    html += '</td>';
                    html += '</tr>';
                });

                html += '</tbody></table>';
                content.innerHTML = html;
            } catch (error) {
                content.innerHTML = '<div class="error">加载失败: ' + error.message + '</div>';
            }
        }

        // 显示创建欢迎内容模态框
        function showCreateWelcome() {
            document.getElementById('welcome-form-title').textContent = '创建欢迎内容';
            document.getElementById('welcome-id').value = '';
            document.getElementById('welcome-title').value = '';
            document.getElementById('welcome-content-text').value = '';
            document.getElementById('welcome-image-url').value = '';
            document.getElementById('welcome-button-text').value = '开始使用';
            document.getElementById('welcome-is-active').checked = true;
            document.getElementById('welcome-message').innerHTML = '';
            document.getElementById('welcome-modal').classList.add('active');
        }

        // 编辑欢迎内容
        async function editWelcomeContent(welcomeId) {
            try {
                const response = await fetchWithAuth(`${API_BASE}/admin/welcome`);
                const data = await response.json();
                const welcome = data.welcome_contents.find(w => w.id === welcomeId);

                if (!welcome) {
                    alert('未找到欢迎内容');
                    return;
                }

                document.getElementById('welcome-form-title').textContent = '编辑欢迎内容';
                document.getElementById('welcome-id').value = welcome.id;
                document.getElementById('welcome-title').value = welcome.title;
                document.getElementById('welcome-content-text').value = welcome.content;
                document.getElementById('welcome-image-url').value = welcome.image_url || '';
                document.getElementById('welcome-button-text').value = welcome.button_text;
                document.getElementById('welcome-is-active').checked = welcome.is_active;
                document.getElementById('welcome-message').innerHTML = '';
                document.getElementById('welcome-modal').classList.add('active');
            } catch (error) {
                alert('加载欢迎内容失败: ' + error.message);
            }
        }

        // 保存欢迎内容
        async function saveWelcomeContent() {
            const id = document.getElementById('welcome-id').value;
            const message = document.getElementById('welcome-message');

            const data = {
                title: document.getElementById('welcome-title').value,
                content: document.getElementById('welcome-content-text').value,
                image_url: document.getElementById('welcome-image-url').value,
                button_text: document.getElementById('welcome-button-text').value,
                is_active: document.getElementById('welcome-is-active').checked
            };

            try {
                let url, method;
                if (id) {
                    url = `${API_BASE}/admin/welcome/${id}`;
                    method = 'PUT';
                } else {
                    url = `${API_BASE}/admin/welcome`;
                    method = 'POST';
                }

                const response = await fetchWithAuth(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    message.innerHTML = '<div class="success">✅ 保存成功！</div>';
                    setTimeout(() => {
                        closeWelcomeModal();
                        loadWelcomeContents();
                    }, 1500);
                } else {
                    const error = await response.json();
                    message.innerHTML = '<div class="error">❌ 保存失败: ' + (error.detail || '未知错误') + '</div>';
                }
            } catch (error) {
                message.innerHTML = '<div class="error">❌ 请求失败: ' + error.message + '</div>';
            }
        }

        // 关闭欢迎内容模态框
        function closeWelcomeModal() {
            document.getElementById('welcome-modal').classList.remove('active');
        }

        // 删除欢迎内容
        function deleteWelcomeContent(welcomeId) {
            if (!confirm('确定要删除这个欢迎内容吗？')) return;

            fetch(`${API_BASE}/admin/welcome/${welcomeId}`, { method: 'DELETE' })
                .then(response => response.ok ? loadWelcomeContents() : alert('删除失败'))
                .catch(error => alert('删除失败: ' + error.message));
        }

        // ========== 公告管理相关函数 ==========

        // 加载公告列表
        async function loadAnnouncements() {
            const content = document.getElementById('announcements-content');

            try {
                const response = await fetchWithAuth(`${API_BASE}/admin/announcements`);
                const data = await response.json();

                if (!data.announcements || data.announcements.length === 0) {
                    content.innerHTML = '<div class="empty">没有公告</div>';
                    return;
                }

                let html = '<div class="announcement-list">';

                data.announcements.forEach(a => {
                    const timeRange = a.start_time && a.end_time
                        ? `${new Date(a.start_time).toLocaleDateString('zh-CN')} - ${new Date(a.end_time).toLocaleDateString('zh-CN')}`
                        : '无限制';

                    const targetUserMap = {
                        'all': '所有用户',
                        'new': '新用户',
                        'active': '活跃用户',
                        'inactive': '不活跃用户'
                    };

                    html += '<div class="announcement-card">';
                    html += '<div class="announcement-card-header">';
                    if (a.image_url) {
                        html += `<div class="announcement-card-image">`;
                        html += `<img src="${a.image_url}" alt="公告图片" onerror="this.parentElement.style.display='none'">`;
                        html += `</div>`;
                    }
                    html += '<div class="announcement-card-info">';
                    html += `<h3>${a.title}</h3>`;
                    html += '<div class="announcement-meta">';
                    html += `<span class="badge ${a.is_active ? 'badge-success' : 'badge-warning'}">${a.is_active ? '启用' : '禁用'}</span>`;
                    html += `<span class="badge badge-info">优先级: ${a.priority}</span>`;
                    html += `<span class="badge badge-info">${targetUserMap[a.target_user_type] || a.target_user_type}</span>`;
                    if (a.is_update_announcement) {
                        html += `<span class="badge badge-secondary">更新公告</span>`;
                    }
                    html += '</div>';
                    html += '</div>';
                    html += '</div>';
                    html += `<p class="announcement-content">${a.content}</p>`;
                    html += '<div class="announcement-footer">';
                    html += `<small class="time-range">📅 ${timeRange}</small>`;
                    html += `<small class="created-time">创建于 ${new Date(a.created_at).toLocaleString('zh-CN')}</small>`;
                    html += '<div class="announcement-actions">';
                    html += `<button onclick="editAnnouncement('${a.id}')" class="btn btn-secondary btn-small">编辑</button> `;
                    html += `<button onclick="deleteAnnouncement('${a.id}')" class="btn btn-danger btn-small">删除</button>`;
                    html += '</div>';
                    html += '</div>';
                    html += '</div>';
                });

                html += '</div>';
                content.innerHTML = html;
            } catch (error) {
                content.innerHTML = '<div class="error">加载失败: ' + error.message + '</div>';
            }
        }

        // 显示创建公告模态框
        function showCreateAnnouncement() {
            document.getElementById('announcement-form-title').textContent = '创建公告';
            document.getElementById('announcement-id').value = '';
            document.getElementById('announcement-title').value = '';
            document.getElementById('announcement-content-text').value = '';
            document.getElementById('announcement-image-url').value = '';
            document.getElementById('announcement-button-text').value = '我知道了';
            document.getElementById('announcement-priority').value = '0';
            document.getElementById('announcement-start-time').value = '';
            document.getElementById('announcement-end-time').value = '';
            document.getElementById('announcement-target-user-type').value = 'all';
            document.getElementById('announcement-is-active').checked = true;
            document.getElementById('announcement-is-update-announcement').checked = false;
            document.getElementById('announcement-message').innerHTML = '';

            // 隐藏图片预览
            document.getElementById('announcement-image-preview').style.display = 'none';

            document.getElementById('announcement-modal').classList.add('active');
        }

        // 编辑公告
        async function editAnnouncement(announcementId) {
            try {
                const response = await fetchWithAuth(`${API_BASE}/admin/announcements`);
                const data = await response.json();
                const announcement = data.announcements.find(a => a.id === announcementId);

                if (!announcement) {
                    alert('未找到公告');
                    return;
                }

                document.getElementById('announcement-form-title').textContent = '编辑公告';
                document.getElementById('announcement-id').value = announcement.id;
                document.getElementById('announcement-title').value = announcement.title;
                document.getElementById('announcement-content-text').value = announcement.content;
                document.getElementById('announcement-image-url').value = announcement.image_url || '';
                document.getElementById('announcement-button-text').value = announcement.button_text || '我知道了';
                document.getElementById('announcement-priority').value = announcement.priority || 0;
                document.getElementById('announcement-start-time').value = announcement.start_time || '';
                document.getElementById('announcement-end-time').value = announcement.end_time || '';
                document.getElementById('announcement-target-user-type').value = announcement.target_user_type || 'all';
                document.getElementById('announcement-is-active').checked = announcement.is_active;
                document.getElementById('announcement-is-update-announcement').checked = announcement.is_update_announcement || false;
                document.getElementById('announcement-message').innerHTML = '';

                // 显示图片预览
                previewAnnouncementImage();

                document.getElementById('announcement-modal').classList.add('active');
            } catch (error) {
                alert('加载公告失败: ' + error.message);
            }
        }

        // 保存公告
        async function saveAnnouncement() {
            const id = document.getElementById('announcement-id').value;
            const message = document.getElementById('announcement-message');

            const data = {
                title: document.getElementById('announcement-title').value,
                content: document.getElementById('announcement-content-text').value,
                image_url: document.getElementById('announcement-image-url').value,
                button_text: document.getElementById('announcement-button-text').value,
                priority: parseInt(document.getElementById('announcement-priority').value),
                start_time: document.getElementById('announcement-start-time').value || null,
                end_time: document.getElementById('announcement-end-time').value || null,
                target_user_type: document.getElementById('announcement-target-user-type').value,
                is_active: document.getElementById('announcement-is-active').checked,
                is_update_announcement: document.getElementById('announcement-is-update-announcement').checked
            };

            try {
                let url, method;
                if (id) {
                    url = `${API_BASE}/admin/announcements/${id}`;
                    method = 'PUT';
                } else {
                    url = `${API_BASE}/admin/announcements`;
                    method = 'POST';
                }

                const response = await fetchWithAuth(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    message.innerHTML = '<div class="success">✅ 保存成功！</div>';
                    setTimeout(() => {
                        closeAnnouncementModal();
                        loadAnnouncements();
                    }, 1500);
                } else {
                    const error = await response.json();
                    message.innerHTML = '<div class="error">❌ 保存失败: ' + (error.detail || '未知错误') + '</div>';
                }
            } catch (error) {
                message.innerHTML = '<div class="error">❌ 请求失败: ' + error.message + '</div>';
            }
        }

        // 关闭公告模态框
        function closeAnnouncementModal() {
            document.getElementById('announcement-modal').classList.remove('active');
        }

        // 预览公告图片
        function previewAnnouncementImage() {
            const imageUrl = document.getElementById('announcement-image-url').value;
            const preview = document.getElementById('announcement-image-preview');
            const img = document.getElementById('announcement-preview-img');

            if (imageUrl && imageUrl.trim()) {
                img.src = imageUrl;
                preview.style.display = 'block';
            } else {
                preview.style.display = 'none';
            }
        }

        // 移除公告图片
        function removeAnnouncementImage() {
            document.getElementById('announcement-image-url').value = '';
            document.getElementById('announcement-image-preview').style.display = 'none';
        }

        // 上传公告图片
        async function uploadAnnouncementImage(event) {
            const file = event.target.files[0];
            if (!file) return;

            // 检查文件类型
            if (!file.type.match(/^image\/(jpeg|jpg|png|gif|webp)$/i)) {
                alert('请选择图片文件（JPG、PNG、GIF、WebP）');
                return;
            }

            // 检查文件大小（10MB）
            if (file.size > 10 * 1024 * 1024) {
                alert('图片大小不能超过 10MB');
                return;
            }

            const messageDiv = document.getElementById('announcement-message');
            messageDiv.innerHTML = '<div class="success">⏳ 正在上传...</div>';

            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('filename', `announcement_${Date.now()}_${file.name}`);
                formData.append('folder', 'announcements');

                const response = await fetch(`${API_BASE}/files/upload`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: formData
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || '上传失败');
                }

                const result = await response.json();
                const imageUrl = result.url;

                // 设置图片URL并显示预览
                document.getElementById('announcement-image-url').value = imageUrl;
                previewAnnouncementImage();

                messageDiv.innerHTML = '<div class="success">✅ 图片上传成功！</div>';
                setTimeout(() => {
                    messageDiv.innerHTML = '';
                }, 2000);

            } catch (error) {
                messageDiv.innerHTML = `<div class="error">❌ 上传失败: ${error.message}</div>`;
                // 清空文件输入
                event.target.value = '';
            }
        }

        // 删除公告
        async function deleteAnnouncement(announcementId) {
            if (!confirm('确定要删除这个公告吗？')) return;

            try {
                const response = await fetchWithAuth(`${API_BASE}/admin/announcements/${announcementId}`, { method: 'DELETE' });
                if (response.ok) {
                    loadAnnouncements();
                } else {
                    alert('删除失败');
                }
            } catch (error) {
                alert('删除失败: ' + error.message);
            }
        }
    </script>
</body>
</html>
"""


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """根路径，显示版本管理页面"""
    return await version_manager(request)

@app.get("/version-manager", response_class=HTMLResponse)
async def version_manager(request: Request):
    """版本管理Web界面"""
    # 从 URL 参数获取 API 地址
    api_url = request.query_params.get('api_url')

    # 如果没有指定，使用环境变量配置的地址
    if not api_url:
        api_url = API_BASE_URL

    # 如果api_url已经是完整URL（包含协议），直接使用
    if api_url.startswith('http://') or api_url.startswith('https://'):
        api_base = f"{api_url}/api/v1"
    else:
        # 检测请求协议（用于解决混合内容错误）
        # 优先使用X-Forwarded-Proto头（nginx等反向代理设置）
        # 其次使用URL scheme
        protocol = 'http'
        forwarded_proto = request.headers.get('x-forwarded-proto')
        if forwarded_proto:
            protocol = forwarded_proto
        elif hasattr(request, 'url') and '://' in str(request.url):
            protocol = str(request.url).split('://')[0]

        # 添加协议
        api_base = f'{protocol}://{api_url}/api/v1'

    return HTML_TEMPLATE.replace('{{ API_BASE }}', api_base)


if __name__ == "__main__":
    print("🚀 版本管理系统 Web可视化工具启动中...")
    print(f"📊 访问地址: {API_BASE_URL}/version-manager")
    print(f"🔗 后端API: {API_BASE}")

    uvicorn.run(
        "version_manager_web:app",
        host="0.0.0.0",
        port=9092,
        reload=False,
        log_level="info"
    )
