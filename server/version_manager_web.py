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
import requests
from dotenv import load_dotenv

load_dotenv()

# FastAPI应用
app = FastAPI(title="版本管理系统")

# 配置
BASE_URL = os.getenv('VERSION_MANAGER_API_URL', 'http://localhost:9091')
API_BASE = f"{BASE_URL}/api/v1"

# HTML模板
HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>版本管理系统</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }

        .header h1 {
            font-size: 32px;
            margin-bottom: 10px;
        }

        .header p {
            opacity: 0.9;
            font-size: 14px;
        }

        .nav {
            display: flex;
            gap: 10px;
            padding: 20px 30px;
            background: #f8f9fa;
            border-bottom: 1px solid #e9ecef;
            flex-wrap: wrap;
        }

        .nav button {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s;
            background: white;
            color: #495057;
            border: 2px solid #dee2e6;
        }

        .nav button:hover {
            background: #667eea;
            color: white;
            border-color: #667eea;
            transform: translateY(-2px);
        }

        .nav button.active {
            background: #667eea;
            color: white;
            border-color: #667eea;
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
            background: #f8f9fa;
            border-radius: 12px;
            padding: 20px;
            border: 1px solid #e9ecef;
        }

        .card h3 {
            color: #495057;
            margin-bottom: 15px;
            font-size: 18px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .card .version-info {
            font-size: 24px;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 10px;
        }

        .card .build-number {
            color: #6c757d;
            font-size: 14px;
            margin-bottom: 10px;
        }

        .card .release-date {
            color: #6c757d;
            font-size: 12px;
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
            color: #495057;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 12px;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.3s;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #667eea;
        }

        .form-group textarea {
            min-height: 120px;
            resize: vertical;
        }

        .form-group small {
            color: #6c757d;
            font-size: 12px;
            margin-top: 5px;
            display: block;
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
            background: #667eea;
            color: white;
        }

        .btn-primary:hover {
            background: #5568d3;
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }

        .btn-danger {
            background: #dc3545;
            color: white;
        }

        .btn-danger:hover {
            background: #c82333;
        }

        .btn-success {
            background: #28a745;
            color: white;
        }

        .btn-success:hover {
            background: #218838;
        }

        .btn-info {
            background: #17a2b8;
            color: white;
        }

        .btn-info:hover {
            background: #138496;
        }

        .btn-warning {
            background: #ffc107;
            color: #212529;
        }

        .btn-warning:hover {
            background: #e0a800;
        }

        .btn-secondary {
            background: #6c757d;
            color: white;
        }

        .btn-secondary:hover {
            background: #5a6268;
        }

        .btn-small {
            padding: 6px 12px;
            font-size: 12px;
        }

        .versions-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        .versions-table th,
        .versions-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e9ecef;
        }

        .versions-table th {
            background: #f8f9fa;
            font-weight: 500;
            color: #495057;
        }

        .versions-table tr:hover {
            background: #f8f9fa;
        }

        .badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
        }

        .badge-success {
            background: #d4edda;
            color: #155724;
        }

        .badge-warning {
            background: #fff3cd;
            color: #856404;
        }

        .badge-danger {
            background: #f8d7da;
            color: #721c24;
        }

        .badge-info {
            background: #d1ecf1;
            color: #0c5460;
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
            border-radius: 12px;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }

        .modal h2 {
            margin-bottom: 15px;
            color: #495057;
        }

        .modal p {
            color: #6c757d;
            margin-bottom: 20px;
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
            border: 2px solid #e9ecef;
            border-radius: 6px;
            font-size: 14px;
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
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📦 版本管理系统</h1>
            <p>管理APP版本、推送更新、查看更新统计</p>
        </div>

        <div class="nav">
            <button onclick="showSection('dashboard')" class="active" id="nav-dashboard">📊 仪表盘</button>
            <button onclick="showSection('users')" id="nav-users">👥 用户管理</button>
            <button onclick="showSection('models')" id="nav-models">🤖 模型管理</button>
            <button onclick="showSection('stats')" id="nav-stats">📈 数据统计</button>
            <button onclick="showSection('create')" id="nav-create">➕ 创建版本</button>
            <button onclick="showSection('list')" id="nav-list">📋 版本列表</button>
            <button onclick="showSection('active')" id="nav-active">✅ 激活的版本</button>
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
                            <label for="version">版本号 *</label>
                            <input type="text" id="version" name="version" placeholder="例如: 1.0.1" required>
                            <small>使用语义化版本号 (如 1.0.1, 1.1.0, 2.0.0)</small>
                        </div>

                        <div class="form-group">
                            <label for="build_number">构建号 *</label>
                            <input type="number" id="build_number" name="build_number" placeholder="例如: 101" required>
                            <small>递增的整数，每次发布递增1</small>
                        </div>

                        <div class="form-group">
                            <label for="platform">平台 *</label>
                            <select id="platform" name="platform" required>
                                <option value="">请选择平台</option>
                                <option value="android">Android</option>
                                <option value="ios">iOS</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="force_update">更新类型 *</label>
                            <select id="force_update" name="force_update" required>
                                <option value="false">可选更新（用户可以选择稍后更新）</option>
                                <option value="true">强制更新（用户必须更新才能使用）</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="release_notes">更新说明 *</label>
                            <textarea id="release_notes" name="release_notes" placeholder="请输入更新说明（支持换行）" required></textarea>
                            <small>详细描述本次更新的内容，用户会看到这些说明</small>
                        </div>

                        <div class="form-group">
                            <label for="update_url">更新包URL（可选）</label>
                            <input type="url" id="update_url" name="update_url" placeholder="https://example.com/app-v1.0.1.apk">
                            <small>APK或IPA的下载地址</small>
                        </div>

                        <button type="submit" class="btn btn-primary">创建版本</button>
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

    <script>
        const API_BASE = '/api/v1';

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
            if (sectionId === 'stats') loadStats();
            if (sectionId === 'list') loadVersions();
            if (sectionId === 'active') loadActiveVersions();
        }

        // 加载仪表盘
        async function loadDashboard() {
            const content = document.getElementById('dashboard-content');
            try {
                const response = await fetch(`${API_BASE}/admin/versions/active`);
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

        // 创建版本
        async function createVersion(event) {
            event.preventDefault();
            const message = document.getElementById('create-message');

            const form = event.target;
            const formData = new FormData(form);

            const data = {
                version: formData.get('version'),
                build_number: parseInt(formData.get('build_number')),
                platform: formData.get('platform'),
                force_update: formData.get('force_update') === 'true',
                release_notes: formData.get('release_notes'),
                update_url: formData.get('update_url') || null
            };

            try {
                const response = await fetch(`${API_BASE}/admin/versions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    message.innerHTML = '<div class="success">✅ 版本创建成功！</div>';
                    form.reset();
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
                const response = await fetch(url);
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
                const response = await fetch(`${API_BASE}/admin/versions/active`);
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
                const response = await fetch(`${API_BASE}/admin/versions/${versionId}`);
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
                const response = await fetch(`${API_BASE}/admin/versions/${pendingActivation}/activate`, {
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
                const response = await fetch(`${API_BASE}/admin/versions/${pendingDelete}`, {
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
            loadDashboard();
        };

        // ========== 用户管理相关函数 ==========

        // 加载用户列表
        async function loadUsers() {
            const content = document.getElementById('users-content');

            try {
                const response = await fetch(`${API_BASE}/admin/users?skip=0&limit=50`);
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
                    const response = await fetch(`${API_BASE}/admin/users?skip=0&limit=50`);
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
                const response = await fetch(`${API_BASE}/admin/users/${userId}`);
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
                const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
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
                const response = await fetch(`${API_BASE}/admin/users/${userId}/password`, {
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
                const response = await fetch(`${API_BASE}/admin/users/${userId}/diaries?skip=0&limit=20`);
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
                const response = await fetch(`${API_BASE}/admin/users/${pendingDeleteUser}`, {
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
                const response = await fetch(`${API_BASE}/admin/stats`);
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
                const response = await fetch(`${API_BASE}/admin/models`);
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
                const response = await fetch(`${API_BASE}/admin/models/${modelName}/enable`, {
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
                const response = await fetch(`${API_BASE}/admin/models/${modelName}/disable`, {
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
                const response = await fetch(`${API_BASE}/admin/models/${modelName}/reset-failure`, {
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
                const response = await fetch(`${API_BASE}/admin/models`);
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
                const response = await fetch(`${API_BASE}/admin/models/${modelName}/config`, {
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
    </script>
</body>
</html>
"""


@app.get("/version-manager", response_class=HTMLResponse)
async def version_manager():
    """版本管理Web界面"""
    return HTML_TEMPLATE


if __name__ == "__main__":
    print("🚀 版本管理系统 Web可视化工具启动中...")
    print(f"📊 访问地址: http://localhost:9091/version-manager")
    print(f"🔗 后端API: {API_BASE}")

    uvicorn.run(
        "version_manager_web:app",
        host="0.0.0.0",
        port=9092,
        reload=False,
        log_level="info"
    )
