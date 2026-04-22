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
            "end_smooth_window_ms": 1500,
        },
    },
    "tts": {
        "speaker": "zh_female_vv_jupiter_bigtts",  # 活泼灵动的女声（O2.0版本）
        # "speaker": "zh_female_xiaohe_jupiter_bigtts",  # 甜美活泼的女声
        # "speaker": "zh_male_yunzhou_jupiter_bigtts",  # 清爽沉稳的男声
        # "speaker": "zh_male_xiaotian_jupiter_bigtts",  # 清爽磁性的男声
        # "speaker": "S_XXXXXX",  # 指定自定义的复刻音色
        # "speaker": "ICL_zh_female_aojiaonvyou_tob"  # 指定官方复刻音色
        "audio_config": {
            "channel": 1,
            "format": "pcm",
            "sample_rate": 24000
        },
    },
    "dialog": {
        "model": "1.2.1.1",  # O2.0版本
        "bot_name": "豆包",
        "system_role": "你是一个温暖、友好的心理陪伴助手",
        "speaking_style": "温柔、耐心",
        "extra": {
            "strict_audit": False,
            "audit_response": "",
            "recv_timeout": 120,  # 参数范围[10,120]，麦克风模式使用最大值
            "input_mod": "keep_alive"  # 支持text/audio/keep_alive/push_to_talk/audio_file
        }
    }
}
