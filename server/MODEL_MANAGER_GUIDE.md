# 大语言模型管理系统使用指南

## 📋 目录

- [系统概述](#系统概述)
- [支持的模型](#支持的模型)
- [任务类型](#任务类型)
- [故障切换机制](#故障切换机制)
- [配置说明](#配置说明)
- [监控接口](#监控接口)
- [最佳实践](#最佳实践)

---

## 系统概述

大语言模型管理系统是一个智能的模型调度系统，支持多个大语言模型，并能够根据任务类型和模型状态自动选择最合适的模型。

### 核心特性

- ✅ **多模型支持**：同时支持豆包ARK和阿里云DashScope的多个模型
- ✅ **智能调度**：根据任务类型自动选择最适合的模型
- ✅ **自动故障切换**：当某个模型失败时，自动切换到备用模型
- ✅ **模型黑名单**：故障模型会被暂时禁用，避免重复调用
- ✅ **状态监控**：提供API查询所有模型的运行状态
- ✅ **成本优化**：根据任务复杂度选择不同成本的模型

### 工作原理

```
用户请求 → 任务类型识别 → 获取可用模型列表 → 依次尝试模型
                                                    ↓
                                           成功 → 返回结果
                                                    ↓
                                           失败 → 记录失败 → 尝试下一个模型
```

---

## 支持的模型

### 豆包ARK模型

| 模型名称 | 优先级 | 特点 | 适用场景 |
|---------|-------|------|---------|
| `ark-max` | 0 | 最强大的模型 | 复杂任务、情绪分析 |
| `ark-chat` | 1 | 通用对话模型 | 日常对话 |
| `ark-realtime` | 0 | 端到端实时语音模型 | **实时语音对话（固定，不可切换）** |

### 阿里云DashScope模型

| 模型名称 | 优先级 | 特点 | 适用场景 |
|---------|-------|------|---------|
| `qwen-max` | 1 | 最强大的千问模型 | 情绪分析、复杂任务 |
| `qwen-plus` | 2 | 平衡性能和成本 | 日记生成、通用任务 |
| `qwen-flash` | 3 | 快速响应模型 | 实时对话、低延迟任务 |
| `qwen-vl-plus` | 1 | 多模态模型 | 图片理解（未启用） |

---

## 任务类型

系统将不同的任务分类，并为每种任务类型配置不同的模型列表。

### 1. CHAT - 对话聊天

**使用模型**：`qwen-flash` → `qwen-plus` → `ark-chat`

**特点**：
- 需要快速响应
- 不要求极高准确性
- 成本敏感

**示例**：
```
用户：今天天气怎么样？
系统：使用 qwen-flash 快速回复
```

### 2. DIARY_GENERATION - 日记生成

**使用模型**：`qwen-plus` → `qwen-max`（固定，不可切换）

**特点**：
- 需要高质量输出
- 可以适当延迟
- 需要理解上下文

**示例**：
```
用户：帮我写一篇关于旅行的日记
系统：使用 qwen-plus 生成高质量内容
```

### 3. MOOD_ANALYSIS - 情绪分析

**使用模型**：`qwen-max`（固定，不可切换）

**特点**：
- 需要极高的准确性
- 不能容忍错误
- 对成本不敏感

**示例**：
```
用户输入：我今天好开心啊！
系统：使用 qwen-max 准确分析情绪
```

### 4. REALTIME_VOICE - 实时语音对话

**使用模型**：`ark-realtime`（固定，不可切换）

**特点**：
- 端到端实时语音处理
- 前端已适配豆包接口
- 极低延迟要求
- **必须使用豆包模型，不能切换**

**示例**：
```
用户：（语音输入）今天的天气怎么样？
系统：使用 ark-realtime 实时处理语音并回复
```

**重要说明**：实时语音对话必须使用豆包的端到端模型，因为前端已经适配了豆包的实时语音接口。如果切换到其他模型，前端将无法正常工作。

---

## 故障切换机制

### 触发条件

当以下情况发生时，系统会切换到下一个模型：

1. **API调用失败**：HTTP状态码非200
2. **超时**：模型响应时间超过配置的timeout
3. **返回错误**：API返回错误信息
4. **网络问题**：网络连接中断或超时

### 黑名单机制

当一个模型调用失败时：

1. 记录失败次数和时间
2. 将模型加入黑名单（默认5分钟）
3. 黑名单期间不再尝试该模型
4. 5分钟后自动解除黑名单

### 切换流程

```
尝试模型1 (qwen-flash)
    ↓
    失败？
    ↓ 是
记录失败 + 黑名单5分钟
    ↓
尝试模型2 (qwen-plus)
    ↓
    失败？
    ↓ 是
记录失败 + 黑名单5分钟
    ↓
尝试模型3 (ark-chat)
    ↓
    失败？
    ↓ 是
记录失败 + 黑名单5分钟
    ↓
抛出异常：所有模型都失败
```

### 恢复机制

当一个模型调用成功时：

1. 清除失败计数
2. 解除黑名单
3. 恢复优先级

---

## 配置说明

### 环境变量

在 `.env` 文件中配置API密钥：

```env
# 豆包ARK配置
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
ARK_REALTIME_BASE_URL=wss://ark.cn-beijing.volces.com/api/v3
ARK_API_KEY=your-ark-api-key-here

# 阿里云DashScope配置
DASHSCOPE_API_KEY=your-dashscope-api-key-here
```

**重要**：
- `ARK_API_KEY` 必须配置，用于豆包的所有模型（包括实时语音）
- `ARK_REALTIME_BASE_URL` 是WebSocket地址，用于实时语音对话
- `DASHSCOPE_API_KEY` 是可选的，用于阿里云千问模型

### 获取API密钥

#### 豆包ARK

1. 访问：https://console.volcengine.com/
2. 注册/登录火山引擎账号
3. 进入"机器学习平台PAI"
4. 创建API Key
5. 复制API Key到 `.env` 文件

#### 阿里云DashScope

1. 访问：https://dashscope.aliyun.com/
2. 注册/登录阿里云账号
3. 进入"API-KEY管理"
4. 创建API Key
5. 复制API Key到 `.env` 文件

**注意**：用户提供的密钥是：`sk-6383c0e375644b80bd563801ba0ff396`

### 模型配置

模型配置在 `model_manager.py` 中：

```python
ModelConfig(
    name='qwen-max',
    provider=ModelProvider.DASHSCOPE,
    api_key=dashscope_api_key,
    base_url='https://dashscope.aliyuncs.com/compatible-mode/v1',
    priority=1,          # 优先级
    temperature=0.7,     # 温度参数
    timeout=30,          # 超时时间（秒）
    enabled=True,        # 是否启用
    supports_stream=True # 是否支持流式输出
)
```

### 自定义配置

如果需要调整模型配置：

1. 打开 `server/model_manager.py`
2. 修改 `_initialize_models()` 方法
3. 调整模型优先级、参数等
4. 重启服务

---

## 监控接口

### 查看模型状态

**接口**：`GET /api/v1/admin/models/status`

**响应示例**：

```json
{
  "success": true,
  "models": {
    "qwen-max": {
      "enabled": true,
      "priority": 1,
      "is_blacklisted": false,
      "failure_count": 0,
      "last_failure": 0
    },
    "qwen-plus": {
      "enabled": true,
      "priority": 2,
      "is_blacklisted": true,
      "failure_count": 3,
      "last_failure": 1713847200
    },
    "qwen-flash": {
      "enabled": true,
      "priority": 3,
      "is_blacklisted": false,
      "failure_count": 0,
      "last_failure": 0
    },
    "ark-chat": {
      "enabled": true,
      "priority": 1,
      "is_blacklisted": false,
      "failure_count": 1,
      "last_failure": 1713847100
    }
  }
}
```

### 使用示例

```bash
# 查看模型状态
curl http://localhost:9091/api/v1/admin/models/status

# 只看黑名单中的模型
curl http://localhost:9091/api/v1/admin/models/status | jq '.models | to_entries[] | select(.value.is_blacklisted) | {model: .key, failure_count: .value.failure_count}'
```

---

## 最佳实践

### 1. API密钥安全

- ✅ 不要将API密钥提交到代码仓库
- ✅ 使用 `.env` 文件管理密钥
- ✅ 定期更换API密钥
- ✅ 为不同环境使用不同的密钥

### 2. 成本优化

- ✅ 对话任务优先使用快速模型（qwen-flash）
- ✅ 复杂任务使用强大模型（qwen-max）
- ✅ 监控各模型的失败率，优化配置

### 3. 性能优化

- ✅ 设置合理的超时时间（聊天：20秒，分析：30秒）
- ✅ 为低延迟任务配置低优先级模型
- ✅ 定期清理黑名单

### 4. 可靠性保障

- ✅ 为每个任务类型配置多个备用模型
- ✅ 关键任务（如情绪分析）使用固定高质量模型
- ✅ 监控模型状态，及时发现故障

### 5. 故障处理

**当所有模型都失败时**：

1. 检查网络连接
2. 检查API密钥是否有效
3. 查看模型状态接口
4. 检查账户余额
5. 联系技术支持

---

## 常见问题

### Q1: 如何禁用某个模型？

**A**: 修改 `model_manager.py` 中的配置：

```python
self.models['qwen-flash'] = ModelConfig(
    name='qwen-flash',
    # ...
    enabled=False  # 禁用模型
)
```

### Q2: 如何调整模型的优先级？

**A**: 修改 `priority` 参数（数字越小优先级越高）：

```python
self.models['qwen-plus'] = ModelConfig(
    name='qwen-plus',
    # ...
    priority=0  # 最高优先级
)
```

### Q3: 为什么某些任务使用固定模型？

**A**: 某些任务有特殊要求：
- **情绪分析**：需要极高的准确性，不能容忍错误，使用固定的高质量模型（qwen-max）
- **实时语音对话**：必须使用豆包的端到端模型（ark-realtime），因为前端已适配了豆包的实时语音接口。如果切换到其他模型，前端将无法正常工作

### Q4: 黑名单持续时间可以调整吗？

**A**: 可以，修改 `model_manager.py` 中的配置：

```python
self.blacklist_duration = 600  # 10分钟
```

### Q5: 如何添加新的模型？

**A**: 按照 `ModelConfig` 的格式添加新模型：

```python
self.models['new-model'] = ModelConfig(
    name='new-model',
    provider=ModelProvider.ARK,
    api_key='your-api-key',
    base_url='https://api.example.com/v1',
    priority=2,
)
```

### Q6: 如何监控模型调用情况？

**A**:

1. 使用 `/api/v1/admin/models/status` 接口查看状态
2. 查看服务器日志，了解模型调用详情
3. 使用监控工具（如Prometheus）收集指标

### Q7: 如何处理并发请求？

**A**: 模型管理器支持并发请求，每个请求独立选择模型。需要注意：

- 监控API调用次数限制
- 考虑实现请求队列
- 使用限流策略

### Q8: 成本如何计算？

**A**: 每个模型的成本不同，可以在配置中添加 `cost_factor` 参数：

```python
self.models['qwen-max'] = ModelConfig(
    # ...
    cost_factor=2.0  # 成本是其他模型的2倍
)
```

---

## 附录

### A. 任务类型映射表

| 任务类型 | 模型列表（优先级从高到低） | 是否可切换 |
|---------|-------------------------|----------|
| CHAT | qwen-flash → qwen-plus → ark-chat | ✅ 是 |
| DIARY_GENERATION | qwen-plus → qwen-max | ⚠️ 半固定 |
| MOOD_ANALYSIS | qwen-max | ❌ 否 |
| REALTIME_VOICE | ark-realtime | ❌ 否（端到端模型，前端已适配） |

### B. 模型特性对比

| 模型 | 响应速度 | 准确性 | 成本 | 流式支持 | 固定/可切换 |
|-----|---------|--------|------|---------|------------|
| qwen-max | 中 | 最高 | 高 | ✅ | ⚠️ 半固定 |
| qwen-plus | 快 | 高 | 中 | ✅ | ⚠️ 半固定 |
| qwen-flash | 最快 | 中 | 低 | ✅ | ✅ 可切换 |
| ark-max | 中 | 最高 | 高 | ✅ | ✅ 可切换 |
| ark-chat | 快 | 中 | 中 | ✅ | ✅ 可切换 |
| ark-realtime | 极快 | 高 | 中 | ✅ | ❌ 固定（端到端） |

### C. 相关文件

| 文件 | 说明 |
|-----|------|
| `model_manager.py` | 模型管理器核心代码 |
| `main.py` | 后端API实现 |
| `.env.example` | 环境变量配置示例 |

---

**文档版本**: 1.0.0
**最后更新**: 2026-04-23
**维护者**: AI情绪日记团队
