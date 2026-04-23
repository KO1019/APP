"""
大语言模型管理器
支持多个模型和自动故障切换
"""

import os
import asyncio
import httpx
from typing import List, Dict, Optional, Any, AsyncGenerator
from enum import Enum
from dataclasses import dataclass
import time

class TaskType(Enum):
    """任务类型"""
    CHAT = "chat"                  # 对话聊天
    DIARY_GENERATION = "diary_generation"  # 日记生成
    MOOD_ANALYSIS = "mood_analysis"      # 情绪分析
    REALTIME_VOICE = "realtime_voice"    # 实时语音对话


class ModelProvider(Enum):
    """模型提供商"""
    ARK = "ark"                    # 豆包ARK
    DASHSCOPE = "dashscope"        # 阿里云DashScope


@dataclass
class ModelConfig:
    """模型配置"""
    name: str                       # 模型名称
    provider: ModelProvider         # 提供商
    api_key: str                    # API密钥
    base_url: str                   # API基础URL
    max_tokens: int = 4096          # 最大tokens
    temperature: float = 0.7        # 温度参数
    timeout: int = 30               # 超时时间（秒）
    enabled: bool = True            # 是否启用
    priority: int = 0               # 优先级（0最高）
    supports_stream: bool = True    # 是否支持流式输出
    cost_factor: float = 1.0        # 成本因子（用于成本计算）
    cannot_switch: bool = False     # 是否禁止切换（固定模型）


class ModelManager:
    """模型管理器 - 支持多模型和自动故障切换"""

    def __init__(self):
        self.models: Dict[str, ModelConfig] = {}
        self.task_models: Dict[TaskType, List[str]] = {}
        self.failure_count: Dict[str, int] = {}
        self.last_failure_time: Dict[str, float] = {}
        self.blacklist_duration = 300  # 黑名单持续时间（秒）
        self._initialize_models()

    def _initialize_models(self):
        """初始化所有模型配置"""

        # ========== 豆包ARK模型 ==========
        ark_api_key = os.getenv('ARK_API_KEY', '')

        self.models['ark-chat'] = ModelConfig(
            name='ark-chat',
            provider=ModelProvider.ARK,
            api_key=ark_api_key,
            base_url=os.getenv('ARK_BASE_URL', 'https://ark.cn-beijing.volces.com/api/v3'),
            priority=1,
        )

        self.models['ark-max'] = ModelConfig(
            name='ark-max',
            provider=ModelProvider.ARK,
            api_key=ark_api_key,
            base_url=os.getenv('ARK_BASE_URL', 'https://ark.cn-beijing.volces.com/api/v3'),
            priority=0,  # 最高优先级
        )

        # 豆包实时语音模型（端到端，必须固定使用）
        self.models['ark-realtime'] = ModelConfig(
            name='ark-realtime',
            provider=ModelProvider.ARK,
            api_key=ark_api_key,
            base_url=os.getenv('ARK_REALTIME_BASE_URL', 'wss://ark.cn-beijing.volces.com/api/v3'),
            priority=0,  # 最高优先级
            cannot_switch=True,  # 禁止切换，因为前端已适配
        )

        # ========== 阿里云DashScope模型 ==========
        dashscope_api_key = os.getenv('DASHSCOPE_API_KEY', 'sk-6383c0e375644b80bd563801ba0ff396')
        dashscope_base_url = 'https://dashscope.aliyuncs.com/compatible-mode/v1'

        # qwen-max - 最强大的模型
        self.models['qwen-max'] = ModelConfig(
            name='qwen-max',
            provider=ModelProvider.DASHSCOPE,
            api_key=dashscope_api_key,
            base_url=dashscope_base_url,
            priority=1,
            temperature=0.7,
        )

        # qwen-plus - 平衡性能和成本
        self.models['qwen-plus'] = ModelConfig(
            name='qwen-plus',
            provider=ModelProvider.DASHSCOPE,
            api_key=dashscope_api_key,
            base_url=dashscope_base_url,
            priority=2,
            temperature=0.7,
        )

        # qwen-flash - 快速响应模型
        self.models['qwen-flash'] = ModelConfig(
            name='qwen-flash',
            provider=ModelProvider.DASHSCOPE,
            api_key=dashscope_api_key,
            base_url=dashscope_base_url,
            priority=3,
            temperature=0.7,
            timeout=20,
        )

        # qwen-vl-plus - 多模态模型（支持图片）
        self.models['qwen-vl-plus'] = ModelConfig(
            name='qwen-vl-plus',
            provider=ModelProvider.DASHSCOPE,
            api_key=dashscope_api_key,
            base_url=dashscope_base_url,
            priority=1,
            temperature=0.6,
            supports_stream=False,  # 多模态模型可能不支持流式
        )

        # ========== 任务类型与模型绑定 ==========
        # 对话聊天：使用快速模型，优先qwen-flash，然后qwen-plus
        self.task_models[TaskType.CHAT] = ['qwen-flash', 'qwen-plus', 'ark-chat']

        # 日记生成：需要高质量输出，使用强大模型，固定qwen-plus（高质量）
        self.task_models[TaskType.DIARY_GENERATION] = ['qwen-plus', 'qwen-max']

        # 情绪分析：需要准确判断，使用强大模型，固定qwen-max
        self.task_models[TaskType.MOOD_ANALYSIS] = ['qwen-max']

        # 实时语音对话：必须使用豆包的端到端模型（前端已适配），固定不可切换
        self.task_models[TaskType.REALTIME_VOICE] = ['ark-realtime']

    def get_available_models(self, task_type: TaskType) -> List[ModelConfig]:
        """
        获取指定任务类型的可用模型列表

        Args:
            task_type: 任务类型

        Returns:
            可用模型列表（按优先级排序）
        """
        model_names = self.task_models.get(task_type, [])
        available_models = []

        for name in model_names:
            if name not in self.models:
                continue

            model = self.models[name]

            # 检查是否启用
            if not model.enabled:
                continue

            # 检查是否在黑名单中
            if name in self.failure_count:
                last_failure = self.last_failure_time.get(name, 0)
                if time.time() - last_failure < self.blacklist_duration:
                    continue  # 仍在黑名单中

            available_models.append(model)

        # 按优先级排序（数字越小优先级越高）
        available_models.sort(key=lambda m: m.priority)

        return available_models

    def is_model_blacklisted(self, model_name: str) -> bool:
        """检查模型是否在黑名单中"""
        if model_name not in self.failure_count:
            return False

        last_failure = self.last_failure_time.get(model_name, 0)
        return time.time() - last_failure < self.blacklist_duration

    def record_failure(self, model_name: str):
        """记录模型失败"""
        self.failure_count[model_name] = self.failure_count.get(model_name, 0) + 1
        self.last_failure_time[model_name] = time.time()
        print(f"[ModelManager] 模型 {model_name} 失败，已记录（失败次数：{self.failure_count[model_name]}）")

    def record_success(self, model_name: str):
        """记录模型成功（清除失败计数）"""
        if model_name in self.failure_count:
            del self.failure_count[model_name]
            print(f"[ModelManager] 模型 {model_name} 恢复正常，已清除失败记录")

    async def call_model(
        self,
        task_type: TaskType,
        messages: List[Dict],
        stream: bool = True
    ) -> AsyncGenerator[str, None]:
        """
        调用模型（自动故障切换）

        Args:
            task_type: 任务类型
            messages: 消息列表
            stream: 是否使用流式输出

        Yields:
            模型响应的文本块
        """
        available_models = self.get_available_models(task_type)

        if not available_models:
            raise Exception("没有可用的模型")

        # 检查是否是固定模型（不能切换）
        if len(available_models) == 1 and available_models[0].cannot_switch:
            model = available_models[0]
            try:
                print(f"[ModelManager] 使用固定模型: {model.name} (任务: {task_type.value})")
                async for chunk in self._call_single_model(model, messages, stream):
                    if chunk:
                        self.record_success(model.name)
                    yield chunk
                return
            except Exception as e:
                print(f"[ModelManager] 固定模型 {model.name} 调用失败: {str(e)}")
                self.record_failure(model.name)
                raise Exception(f"固定模型 {model.name} 调用失败，无法切换")

        # 依次尝试每个模型（支持切换）
        for model in available_models:
            try:
                print(f"[ModelManager] 尝试使用模型: {model.name} (任务: {task_type.value})")

                async for chunk in self._call_single_model(model, messages, stream):
                    # 如果是第一个chunk，记录成功
                    if chunk:
                        self.record_success(model.name)

                    yield chunk

                return  # 成功完成，不再尝试其他模型

            except Exception as e:
                print(f"[ModelManager] 模型 {model.name} 调用失败: {str(e)}")
                self.record_failure(model.name)
                continue  # 尝试下一个模型

        raise Exception("所有模型都调用失败")

    async def _call_single_model(
        self,
        model: ModelConfig,
        messages: List[Dict],
        stream: bool
    ) -> AsyncGenerator[str, None]:
        """调用单个模型"""

        if not model.api_key:
            raise Exception(f"模型 {model.name} 没有配置API密钥")

        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {model.api_key}'
        }

        payload = {
            'model': model.name,
            'messages': messages,
            'temperature': model.temperature,
            'stream': stream,
        }

        if model.max_tokens:
            payload['max_tokens'] = model.max_tokens

        async with httpx.AsyncClient(timeout=model.timeout) as client:
            if stream and model.supports_stream:
                # 流式调用
                async with client.stream(
                    'POST',
                    f'{model.base_url}/chat/completions',
                    headers=headers,
                    json=payload
                ) as response:
                    if response.status_code != 200:
                        error_text = await response.aread()
                        raise Exception(f"API错误 {response.status_code}: {error_text.decode()}")

                    async for line in response.aiter_lines():
                        if line.startswith('data: '):
                            data = line[6:]
                            if data == '[DONE]':
                                break

                            try:
                                import json
                                chunk = json.loads(data)
                                if 'choices' in chunk and len(chunk['choices']) > 0:
                                    delta = chunk['choices'][0].get('delta', {})
                                    content = delta.get('content', '')
                                    if content:
                                        yield content
                            except json.JSONDecodeError:
                                continue

            else:
                # 非流式调用
                response = await client.post(
                    f'{model.base_url}/chat/completions',
                    headers=headers,
                    json=payload
                )

                if response.status_code != 200:
                    error_text = await response.aread()
                    raise Exception(f"API错误 {response.status_code}: {error_text.decode()}")

                result = response.json()
                if 'choices' in result and len(result['choices']) > 0:
                    content = result['choices'][0]['message']['content']
                    yield content

    def get_model_status(self) -> Dict[str, Dict]:
        """获取所有模型的状态"""
        status = {}

        for name, model in self.models.items():
            status[name] = {
                'enabled': model.enabled,
                'priority': model.priority,
                'is_blacklisted': self.is_model_blacklisted(name),
                'failure_count': self.failure_count.get(name, 0),
                'last_failure': self.last_failure_time.get(name, 0),
            }

        return status


# 全局模型管理器实例
model_manager = ModelManager()
