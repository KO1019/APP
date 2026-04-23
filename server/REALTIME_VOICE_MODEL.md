# 实时语音对话模型说明

## 📋 重要说明

实时语音对话功能**必须使用豆包ARK的端到端模型（ark-realtime）**，**不能切换到其他模型**。

## 🔒 为什么不能切换？

### 1. 前端适配问题

前端已经完整适配了豆包的实时语音接口，包括：
- 音频流处理
- WebSocket通信协议
- 音频编解码
- 实时语音识别（ASR）
- 实时语音合成（TTS）

如果切换到其他模型（如阿里云千问），前端需要重新实现所有音频处理逻辑。

### 2. 协议不兼容

不同服务商的实时语音协议差异很大：
- 豆包：WebSocket + 自定义协议
- 阿里云：不同的协议格式
- OpenAI：不同的API结构

### 3. 技术架构

豆包提供端到端的实时语音解决方案：
```
用户语音 → 豆包ASR → 豆包LLM → 豆包TTS → 用户语音
```

如果切换到其他模型，需要：
1. 使用豆包的ASR识别语音
2. 调用其他模型的LLM
3. 使用豆包的TTS合成语音

这样会增加复杂度和延迟。

## ✅ 配置说明

### 模型配置

在 `model_manager.py` 中，实时语音任务配置为：

```python
# 实时语音对话：必须使用豆包的端到端模型（前端已适配），固定不可切换
self.task_models[TaskType.REALTIME_VOICE] = ['ark-realtime']
```

模型配置：

```python
# 豆包实时语音模型（端到端，必须固定使用）
self.models['ark-realtime'] = ModelConfig(
    name='ark-realtime',
    provider=ModelProvider.ARK,
    api_key=ark_api_key,
    base_url=os.getenv('ARK_REALTIME_BASE_URL', 'wss://ark.cn-beijing.volces.com/api/v3'),
    priority=0,
    cannot_switch=True,  # 禁止切换，因为前端已适配
)
```

### 环境变量

在 `.env` 文件中配置：

```env
# 豆包ARK API配置
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
ARK_REALTIME_BASE_URL=wss://ark.cn-beijing.volces.com/api/v3
ARK_API_KEY=your-ark-api-key-here
```

## 🚫 不支持的操作

以下操作**不支持**（会导致实时语音功能失效）：

1. ❌ 修改实时语音任务的模型列表
2. ❌ 将实时语音模型设置为可切换
3. ❌ 删除 ark-realtime 模型配置
4. ❌ 修改 cannot_switch 属性

## ✅ 支持的操作

以下操作**支持**：

1. ✅ 调整模型的优先级（仅在有多个模型时）
2. ✅ 修改模型的temperature参数
3. ✅ 调整超时时间
4. ✅ 监控模型的运行状态

## 🔧 故障处理

如果实时语音模型调用失败：

1. **检查API密钥**：确保 `ARK_API_KEY` 配置正确
2. **检查网络**：确保能够访问豆包API
3. **检查余额**：确保豆包账户有足够余额
4. **查看日志**：检查服务器的错误日志

**注意**：实时语音模型失败时，**不会自动切换到其他模型**，必须手动解决问题。

## 📊 模型状态监控

可以通过以下接口查看实时语音模型的状态：

```bash
curl http://localhost:9091/api/v1/admin/models/status
```

响应中会显示 `ark-realtime` 的状态：

```json
{
  "ark-realtime": {
    "enabled": true,
    "priority": 0,
    "is_blacklisted": false,
    "failure_count": 0,
    "last_failure": 0
  }
}
```

## 💡 其他任务的模型配置

其他任务支持模型切换：

| 任务类型 | 模型列表 | 是否可切换 |
|---------|---------|----------|
| CHAT | qwen-flash → qwen-plus → ark-chat | ✅ 是 |
| DIARY_GENERATION | qwen-plus → qwen-max | ⚠️ 半固定 |
| MOOD_ANALYSIS | qwen-max | ❌ 否 |
| **REALTIME_VOICE** | **ark-realtime** | **❌ 否** |

## 📚 相关文档

- [模型管理系统使用指南](MODEL_MANAGER_GUIDE.md)
- [模型管理器源码](model_manager.py)

---

**总结**：实时语音对话必须使用豆包的端到端模型，不能切换。这是因为前端已经完整适配了豆包的实时语音接口，切换到其他模型会导致功能失效。
