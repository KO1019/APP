import uuid
import os

# WebSocket连接配置
ws_connect_config = {
    "base_url": "wss://openspeech.bytedance.com/api/v3/realtime/dialogue",
    "headers": {
        "X-Api-App-ID": os.getenv("VOLCENGINE_SPEECH_APP_ID", ""),
        "X-Api-Access-Key": os.getenv("VOLCENGINE_ACCESS_TOKEN", ""),
        "X-Api-Resource-Id": "volc.speech.dialog",  # 固定值
        "X-Api-App-Key": "PlgvMymc7f3tQnJ6",  # 固定值
        "X-Api-Connect-Id": str(uuid.uuid4()),
    }
}

# StartSession请求配置
start_session_req = {
    "asr": {
        "extra": {
            "end_smooth_window_ms": 1500,  # 1.5秒后豆包判断用户停止说话
            "enable_custom_vad": False,  # 使用豆包内置VAD
        },
    },
    "tts": {
        "speaker": "zh_female_vv_jupiter_bigtts",  # 活泼灵动的女声（O2.0版本）
        "audio_config": {
            "channel": 1,
            "format": "pcm",
            "sample_rate": 24000
        },
    },
    "dialog": {
        "model": "1.2.1.1",  # O2.0版本
        "bot_name": "豆包",
        "system_role": "你是一个温暖、友好的心理陪伴助手。如果用户长时间不说话（超过10秒），你会主动问候或询问，保持对话的流畅性。",
        "speaking_style": "温柔、耐心",
        "extra": {
            "strict_audit": False,
            "audit_response": "",
            "recv_timeout": 120,  # 参数范围[10,120]，麦克风模式使用最大值
            "input_mod": "keep_alive",  # 实时通话模式，持续发送音频
            "enable_user_query_exit": True,  # 开启用户退出意图识别
        }
    }
}
