"""
大语言模型配置
支持多个大模型提供商
"""

from typing import Dict, List, Optional
from enum import Enum


class ModelProvider(str, Enum):
    """模型提供商"""
    DOUBAO = "doubao"  # 豆包
    QWEN = "qwen"  # 通义千问（阿里云）
    DEEPSEEK = "deepseek"  # DeepSeek
    KIMI = "kimi"  # Kimi
    GLM = "glm"  # 智谱GLM
    MINIMAX = "minimax"  # MiniMax


class ModelConfig:
    """模型配置"""

    def __init__(
        self,
        model_id: str,
        model_name: str,
        provider: ModelProvider,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        description: str = "",
        max_tokens: int = 8192,
        supports_streaming: bool = True,
        supports_thinking: bool = True,
        supports_multimodal: bool = False,
        recommended_temperature: float = 0.7,
    ):
        self.model_id = model_id
        self.model_name = model_name
        self.provider = provider
        self.api_key = api_key
        self.base_url = base_url
        self.description = description
        self.max_tokens = max_tokens
        self.supports_streaming = supports_streaming
        self.supports_thinking = supports_thinking
        self.supports_multimodal = supports_multimodal
        self.recommended_temperature = recommended_temperature


# ========== 模型配置列表 ==========
# 注意：这里只定义模型配置，实际的API Key在环境变量中设置

MODEL_CONFIGS: Dict[str, ModelConfig] = {
    # ===== 豆包系列 =====
    "doubao-pro": ModelConfig(
        model_id="doubao-seed-2-0-pro-260215",
        model_name="豆包Pro",
        provider=ModelProvider.DOUBAO,
        description="旗舰级全能通用模型，面向复杂推理与长链路任务执行场景",
        max_tokens=32768,
        recommended_temperature=0.7,
    ),
    "doubao-lite": ModelConfig(
        model_id="doubao-seed-2-0-lite-260215",
        model_name="豆包Lite",
        provider=ModelProvider.DOUBAO,
        description="均衡型模型，综合能力超越上一代，性价比高",
        max_tokens=32768,
        recommended_temperature=0.7,
    ),
    "doubao-mini": ModelConfig(
        model_id="doubao-seed-2-0-mini-260215",
        model_name="豆包Mini",
        provider=ModelProvider.DOUBAO,
        description="轻量级模型，适合低时延、高并发场景",
        max_tokens=32768,
        recommended_temperature=0.7,
    ),
    "doubao-vision": ModelConfig(
        model_id="doubao-seed-1-6-vision-250815",
        model_name="豆包Vision",
        provider=ModelProvider.DOUBAO,
        description="视觉理解模型，支持图像和视频分析",
        max_tokens=4096,
        supports_multimodal=True,
        recommended_temperature=0.7,
    ),

    # ===== 通义千问系列（阿里云）=====
    "qwen-plus": ModelConfig(
        model_id="qwen-3-5-plus-260215",
        model_name="通义千问3.5 Plus",
        provider=ModelProvider.QWEN,
        description="原生视觉语言系列Plus模型，基于混合架构设计，推理效率高",
        max_tokens=32768,
        recommended_temperature=0.7,
    ),

    # ===== DeepSeek系列 =====
    "deepseek-v3": ModelConfig(
        model_id="deepseek-v3-2-251201",
        model_name="DeepSeek V3.2",
        provider=ModelProvider.DEEPSEEK,
        description="平衡推理能力与输出长度，适合日常使用",
        max_tokens=8192,
        recommended_temperature=0.7,
    ),
    "deepseek-r1": ModelConfig(
        model_id="deepseek-r1-250528",
        model_name="DeepSeek R1",
        provider=ModelProvider.DEEPSEEK,
        description="671B满血最新版R1，深度推理能力",
        max_tokens=8192,
        recommended_temperature=0.7,
    ),

    # ===== Kimi系列 =====
    "kimi-k25": ModelConfig(
        model_id="kimi-k2-5-260127",
        model_name="Kimi K2.5",
        provider=ModelProvider.KIMI,
        description="Kimi迄今最智能的模型，Agent、代码、视觉理解SoTA表现",
        max_tokens=32768,
        recommended_temperature=0.7,
    ),

    # ===== 智谱GLM系列 =====
    "glm-5": ModelConfig(
        model_id="glm-5-0-260211",
        model_name="GLM-5",
        provider=ModelProvider.GLM,
        description="新一代旗舰基座模型，面向Agentic Engineering打造",
        max_tokens=32768,
        recommended_temperature=0.7,
    ),
    "glm-5-turbo": ModelConfig(
        model_id="glm-5-turbo-260316",
        model_name="GLM-5 Turbo",
        provider=ModelProvider.GLM,
        description="面向OpenClaw龙虾场景深度优化的基座模型",
        max_tokens=32768,
        recommended_temperature=0.7,
    ),
    "glm-4-7": ModelConfig(
        model_id="glm-4-7-251222",
        model_name="GLM-4.7",
        provider=ModelProvider.GLM,
        description="最新旗舰模型，更强的编程能力和多步骤推理",
        max_tokens=32768,
        recommended_temperature=0.7,
    ),

    # ===== MiniMax系列 =====
    "minimax-m25": ModelConfig(
        model_id="minimax-m2-5-260212",
        model_name="MiniMax M2.5",
        provider=ModelProvider.MINIMAX,
        description="编码与智能体领域SOTA，专为Agent Universe设计",
        max_tokens=32768,
        recommended_temperature=0.7,
    ),
}


# 默认模型配置
DEFAULT_MODEL = "doubao-lite"  # 默认使用豆包Lite，性价比高


def get_model_config(model_key: str) -> Optional[ModelConfig]:
    """获取模型配置"""
    return MODEL_CONFIGS.get(model_key)


def get_available_models() -> List[Dict[str, str]]:
    """获取所有可用模型列表"""
    return [
        {
            "key": key,
            "model_id": config.model_id,
            "model_name": config.model_name,
            "provider": config.provider.value,
            "description": config.description,
            "supports_streaming": config.supports_streaming,
            "supports_multimodal": config.supports_multimodal,
        }
        for key, config in MODEL_CONFIGS.items()
    ]


def get_models_by_provider(provider: ModelProvider) -> List[Dict[str, str]]:
    """根据提供商获取模型列表"""
    return [
        {
            "key": key,
            "model_id": config.model_id,
            "model_name": config.model_name,
            "description": config.description,
        }
        for key, config in MODEL_CONFIGS.items()
        if config.provider == provider
    ]


# 任务推荐模型
TASK_RECOMMENDED_MODELS = {
    "chat": "doubao-lite",  # 聊天对话
    "diary_analysis": "doubao-lite",  # 日记分析
    "diary_generation": "doubao-lite",  # 日记生成
    "emotion_analysis": "doubao-pro",  # 情绪分析（使用更强的模型）
    "vision": "doubao-vision",  # 视觉分析
    "code": "kimi-k25",  # 代码生成
    "reasoning": "deepseek-r1",  # 深度推理
}


def get_recommended_model_for_task(task: str) -> str:
    """根据任务获取推荐模型"""
    return TASK_RECOMMENDED_MODELS.get(task, DEFAULT_MODEL)
