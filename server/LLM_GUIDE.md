# 大模型集成使用指南

## 📋 目录

- [支持的模型](#支持的模型)
- [API接口](#api接口)
- [使用示例](#使用示例)
- [模型推荐](#模型推荐)
- [常见问题](#常见问题)

---

## 支持的模型

本项目已集成以下12个大模型，来自6个不同的提供商：

### 1. 豆包（Doubao）- 火山引擎

| 模型Key | 模型名称 | 描述 | 适用场景 |
|---------|----------|------|----------|
| `doubao-pro` | 豆包Pro | 旗舰级全能通用模型，面向复杂推理与长链路任务执行场景 | 复杂推理、长对话、内容创作 |
| `doubao-lite` | 豆包Lite ⭐ | 均衡型模型，综合能力超越上一代，性价比高 | 日常对话、日记分析（默认） |
| `doubao-mini` | 豆包Mini | 轻量级模型，适合低时延、高并发场景 | 实时对话、简单问答 |
| `doubao-vision` | 豆包Vision | 视觉理解模型，支持图像和视频分析 | 图像识别、视频分析 |

### 2. 通义千问（Qwen）- 阿里云

| 模型Key | 模型名称 | 描述 | 适用场景 |
|---------|----------|------|----------|
| `qwen-plus` | 通义千问3.5 Plus | 原生视觉语言系列Plus模型，基于混合架构设计，推理效率高 | 对话、推理、内容创作 |

### 3. DeepSeek

| 模型Key | 模型名称 | 描述 | 适用场景 |
|---------|----------|------|----------|
| `deepseek-v3` | DeepSeek V3.2 | 平衡推理能力与输出长度，适合日常使用 | 日常对话、问答 |
| `deepseek-r1` | DeepSeek R1 | 671B满血最新版R1，深度推理能力 | 深度推理、复杂问题 |

### 4. Kimi - 月之暗面

| 模型Key | 模型名称 | 描述 | 适用场景 |
|---------|----------|------|----------|
| `kimi-k25` | Kimi K2.5 | Kimi迄今最智能的模型，Agent、代码、视觉理解SoTA表现 | 代码生成、Agent任务、视觉理解 |

### 5. 智谱GLM

| 模型Key | 模型名称 | 描述 | 适用场景 |
|---------|----------|------|----------|
| `glm-5` | GLM-5 | 新一代旗舰基座模型，面向Agentic Engineering打造 | Agent任务、系统工程 |
| `glm-5-turbo` | GLM-5 Turbo | 面向OpenClaw龙虾场景深度优化的基座模型 | 高性能任务 |
| `glm-4-7` | GLM-4.7 | 最新旗舰模型，更强的编程能力和多步骤推理 | 编程、推理、执行 |

### 6. MiniMax

| 模型Key | 模型名称 | 描述 | 适用场景 |
|---------|----------|------|----------|
| `minimax-m25` | MiniMax M2.5 | 编码与智能体领域SOTA，专为Agent Universe设计 | Agent构建、编程 |

---

## API接口

### 1. 获取所有模型

```
GET /api/v1/models
```

**响应示例**：

```json
{
  "models": [
    {
      "key": "doubao-lite",
      "model_id": "doubao-seed-2-0-lite-260215",
      "model_name": "豆包Lite",
      "provider": "doubao",
      "description": "均衡型模型，综合能力超越上一代，性价比高",
      "supports_streaming": true,
      "supports_multimodal": false
    }
  ],
  "default_model": "doubao-lite",
  "total": 12
}
```

### 2. 按提供商获取模型

```
GET /api/v1/models/{provider}
```

**提供商**：
- `doubao` - 豆包
- `qwen` - 通义千问
- `deepseek` - DeepSeek
- `kimi` - Kimi
- `glm` - 智谱GLM
- `minimax` - MiniMax

**响应示例**：

```json
{
  "provider": "qwen",
  "models": [
    {
      "key": "qwen-plus",
      "model_id": "qwen-3-5-plus-260215",
      "model_name": "通义千问3.5 Plus",
      "description": "原生视觉语言系列Plus模型，基于混合架构设计，推理效率高"
    }
  ],
  "total": 1
}
```

### 3. 获取推荐模型

```
GET /api/v1/models/recommended/{task}
```

**任务类型**：
- `chat` - 聊天对话
- `diary_analysis` - 日记分析
- `emotion_analysis` - 情绪分析
- `diary_generation` - 日记生成
- `vision` - 视觉分析
- `code` - 代码生成
- `reasoning` - 深度推理

**响应示例**：

```json
{
  "task": "emotion_analysis",
  "model_key": "doubao-pro",
  "model_id": "doubao-seed-2-0-pro-260215",
  "model_name": "豆包Pro",
  "provider": "doubao",
  "description": "旗舰级全能通用模型，面向复杂推理与长链路任务执行场景"
}
```

### 4. 获取模型详细配置

```
GET /api/v1/models/config/{model_key}
```

**响应示例**：

```json
{
  "key": "doubao-lite",
  "model_id": "doubao-seed-2-0-lite-260215",
  "model_name": "豆包Lite",
  "provider": "doubao",
  "description": "均衡型模型，综合能力超越上一代，性价比高",
  "max_tokens": 32768,
  "supports_streaming": true,
  "supports_thinking": true,
  "supports_multimodal": false,
  "recommended_temperature": 0.7
}
```

### 5. AI对话（支持模型切换）

```
POST /api/v1/chat?model_key={model_key}
```

**请求参数**：
- `model_key`（可选）：模型key，如 `doubao-lite`, `qwen-plus` 等

**请求体**：

```json
{
  "message": "你好，今天心情不太好",
  "diaryId": null
}
```

**响应**：
SSE流式响应

---

## 使用示例

### 示例1：获取所有可用模型

```typescript
const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/models`);
const data = await response.json();

console.log('可用模型数量:', data.total);
console.log('默认模型:', data.default_model);

data.models.forEach(model => {
  console.log(`${model.model_name} (${model.provider})`);
});
```

### 示例2：按提供商获取模型

```typescript
const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/models/qwen`);
const data = await response.json();

console.log('通义千问模型:', data.models);
```

### 示例3：获取推荐模型

```typescript
const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/models/recommended/emotion_analysis`);
const data = await response.json();

console.log('情绪分析推荐模型:', data.model_name);
```

### 示例4：使用指定模型进行对话

```typescript
import { RNSSE } from 'react-native-sse';

const sse = new RNSSE(
  `${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/chat?model_key=qwen-plus`,
  { method: 'POST' }
);

sse.addEventListener('message', (event) => {
  if (event.data === '[DONE]') {
    sse.close();
    return;
  }
  console.log('AI回复:', event.data);
});
```

---

## 模型推荐

根据不同的任务类型，系统会自动推荐最合适的模型：

| 任务类型 | 推荐模型 | 原因 |
|---------|---------|------|
| 聊天对话 | `doubao-lite` | 性价比高，响应快 |
| 日记分析 | `doubao-lite` | 均衡性能，适合文本分析 |
| 情绪分析 | `doubao-pro` | 更强的推理能力 |
| 日记生成 | `doubao-lite` | 文本生成效果好 |
| 视觉分析 | `doubao-vision` | 专用视觉模型 |
| 代码生成 | `kimi-k25` | 代码生成能力强 |
| 深度推理 | `deepseek-r1` | 671B参数，推理能力强 |

---

## 常见问题

### Q1: 如何切换模型？

**A**: 在调用API时添加 `model_key` 参数：

```typescript
// 使用通义千问
POST /api/v1/chat?model_key=qwen-plus

// 使用豆包Pro
POST /api/v1/chat?model_key=doubao-pro
```

### Q2: 默认使用哪个模型？

**A**: 默认使用 `doubao-lite`（豆包Lite），因为它性价比高，适合大多数场景。

### Q3: 模型调用失败会怎么办？

**A**: 系统会自动尝试使用备用模型（`doubao-lite`），如果所有模型都失败，会返回友好的错误提示。

### Q4: 如何查看所有可用的模型？

**A**: 调用 `GET /api/v1/models` 接口。

### Q5: 通义千问需要配置API Key吗？

**A**: 不需要！所有模型都通过 `coze_coding_dev_sdk` 统一调用，无需单独配置API Key。

### Q6: 哪个模型最便宜？

**A**: `doubao-mini`（豆包Mini）是最便宜的轻量级模型，适合简单任务。

### Q7: 哪个模型最智能？

**A**: 根据任务不同：
- 通用任务：`doubao-pro`（豆包Pro）
- 代码生成：`kimi-k25`（Kimi K2.5）
- 深度推理：`deepseek-r1`（DeepSeek R1）

### Q8: 支持多模态（图像理解）吗？

**A**: 支持！使用 `doubao-vision` 模型可以处理图像和视频。

---

## 技术实现

### 核心组件

1. **model_config.py** - 模型配置文件
   - 定义所有模型配置
   - 提供模型推荐功能
   - 支持按提供商筛选

2. **main.py** - 后端API
   - 使用 `coze_coding_dev_sdk` 统一调用
   - 支持模型切换
   - 自动降级到备用模型

### SDK依赖

```python
from coze_coding_dev_sdk import LLMClient
```

### 调用流程

```
用户请求
    ↓
验证模型配置
    ↓
创建 LLMClient
    ↓
设置模型
    ↓
添加消息
    ↓
流式调用
    ↓
返回结果
```

---

## 更新日志

### v1.0.0 (2026-04-23)

- ✅ 集成12个大模型
- ✅ 支持6个提供商（豆包、通义千问、DeepSeek、Kimi、GLM、MiniMax）
- ✅ 实现模型切换功能
- ✅ 添加模型推荐系统
- ✅ 自动降级机制

---

**最后更新**：2026-04-23
**维护者**：AI情绪日记团队
