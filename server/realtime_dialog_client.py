import gzip
import json
from typing import Dict, Any

import websockets

import config
import protocol


class RealtimeDialogClient:
    def __init__(self, config: Dict[str, Any], session_id: str, output_audio_format: str = "pcm",
                 mod: str = "audio", recv_timeout: int = 10) -> None:
        self.config = config
        self.logid = ""
        self.session_id = session_id
        self.output_audio_format = output_audio_format
        self.mod = mod
        self.recv_timeout = recv_timeout
        self.ws = None

    async def connect(self) -> None:
        """建立WebSocket连接"""
        print(f"url: {self.config['base_url']}, headers: {self.config['headers']}")
        self.ws = await websockets.connect(
            self.config['base_url'],
            additional_headers=self.config['headers'],
            ping_interval=None
        )
        # websockets 15.x 不再支持 response_headers 属性
        try:
            self.logid = self.ws.response_headers.get("X-Tt-Logid") if hasattr(self.ws, 'response_headers') else ""
        except:
            self.logid = ""
        print(f"dialog server response logid: {self.logid}")

        # StartConnection request
        start_connection_request = bytearray(protocol.generate_header())
        start_connection_request.extend(int(1).to_bytes(4, 'big'))
        payload_bytes = str.encode("{}")
        payload_bytes = gzip.compress(payload_bytes)
        start_connection_request.extend((len(payload_bytes)).to_bytes(4, 'big'))
        start_connection_request.extend(payload_bytes)
        await self.ws.send(start_connection_request)
        response = await self.ws.recv()
        print(f"StartConnection response: {protocol.parse_response(response)}")

        # 使用配置文件中的默认配置
        request_params = config.start_session_req

        # 如果传入了mod参数，则覆盖配置文件中的input_mod
        if self.mod is not None:
            request_params = {
                "asr": config.start_session_req["asr"],
                "tts": config.start_session_req["tts"],
                "dialog": {
                    **config.start_session_req["dialog"],
                    "extra": {
                        **config.start_session_req["dialog"]["extra"],
                        "input_mod": self.mod,
                        "recv_timeout": self.recv_timeout
                    }
                }
            }

        # StartSession request
        if self.output_audio_format == "pcm_s16le":
            request_params["tts"]["audio_config"]["format"] = "pcm_s16le"

        payload_bytes = str.encode(json.dumps(request_params))
        payload_bytes = gzip.compress(payload_bytes)
        start_session_request = bytearray(protocol.generate_header())
        start_session_request.extend(int(100).to_bytes(4, 'big'))
        start_session_request.extend((len(self.session_id)).to_bytes(4, 'big'))
        start_session_request.extend(str.encode(self.session_id))
        start_session_request.extend((len(payload_bytes)).to_bytes(4, 'big'))
        start_session_request.extend(payload_bytes)
        await self.ws.send(start_session_request)
        response = await self.ws.recv()
        print(f"StartSession response: {protocol.parse_response(response)}")

    async def say_hello(self) -> None:
        """发送Hello消息"""
        payload = {
            "content": "你好，我是豆包，有什么可以帮助你的？",
        }
        hello_request = bytearray(protocol.generate_header())
        hello_request.extend(int(300).to_bytes(4, 'big'))
        payload_bytes = str.encode(json.dumps(payload))
        payload_bytes = gzip.compress(payload_bytes)
        hello_request.extend((len(self.session_id)).to_bytes(4, 'big'))
        hello_request.extend(str.encode(self.session_id))
        hello_request.extend((len(payload_bytes)).to_bytes(4, 'big'))
        hello_request.extend(payload_bytes)
        await self.ws.send(hello_request)

    async def chat_text_query(self, content: str) -> None:
        """发送Chat Text Query消息"""
        payload = {
            "content": content,
        }
        chat_text_query_request = bytearray(protocol.generate_header())
        chat_text_query_request.extend(int(501).to_bytes(4, 'big'))
        payload_bytes = str.encode(json.dumps(payload))
        payload_bytes = gzip.compress(payload_bytes)
        chat_text_query_request.extend((len(self.session_id)).to_bytes(4, 'big'))
        chat_text_query_request.extend(str.encode(self.session_id))
        chat_text_query_request.extend((len(payload_bytes)).to_bytes(4, 'big'))
        chat_text_query_request.extend(payload_bytes)
        await self.ws.send(chat_text_query_request)

    async def task_request(self, audio: bytes) -> None:
        task_request = bytearray(
            protocol.generate_header(message_type=protocol.CLIENT_AUDIO_ONLY_REQUEST,
                                    message_flags=protocol.MESSAGE_FLAG_APPEND_AUDIO))
        task_request.extend(int(200).to_bytes(4, 'big'))
        task_request.extend((len(self.session_id)).to_bytes(4, 'big'))
        task_request.extend(str.encode(self.session_id))
        task_request.extend((len(audio)).to_bytes(4, 'big'))
        task_request.extend(audio)
        await self.ws.send(task_request)

    async def end_asr(self) -> None:
        """发送EndASR消息"""
        payload = {}
        end_asr_request = bytearray(protocol.generate_header())
        end_asr_request.extend(int(400).to_bytes(4, 'big'))
        payload_bytes = str.encode(json.dumps(payload))
        payload_bytes = gzip.compress(payload_bytes)
        end_asr_request.extend((len(self.session_id)).to_bytes(4, 'big'))
        end_asr_request.extend(str.encode(self.session_id))
        end_asr_request.extend((len(payload_bytes)).to_bytes(4, 'big'))
        end_asr_request.extend(payload_bytes)
        await self.ws.send(end_asr_request)

    async def client_interrupt(self) -> None:
        """发送ClientInterrupt消息"""
        payload = {}
        client_interrupt_request = bytearray(protocol.generate_header())
        client_interrupt_request.extend(int(515).to_bytes(4, 'big'))
        payload_bytes = str.encode(json.dumps(payload))
        payload_bytes = gzip.compress(payload_bytes)
        client_interrupt_request.extend((len(self.session_id)).to_bytes(4, 'big'))
        client_interrupt_request.extend(str.encode(self.session_id))
        client_interrupt_request.extend((len(payload_bytes)).to_bytes(4, 'big'))
        client_interrupt_request.extend(payload_bytes)
        await self.ws.send(client_interrupt_request)

    async def receive_server_response(self) -> Dict[str, Any]:
        """接收服务器响应"""
        response = await self.ws.recv()
        return protocol.parse_response(response)

    async def finish_session(self) -> None:
        """发送FinishSession消息"""
        payload = {}
        finish_session_request = bytearray(protocol.generate_header())
        finish_session_request.extend(int(101).to_bytes(4, 'big'))
        payload_bytes = str.encode(json.dumps(payload))
        payload_bytes = gzip.compress(payload_bytes)
        finish_session_request.extend((len(self.session_id)).to_bytes(4, 'big'))
        finish_session_request.extend(str.encode(self.session_id))
        finish_session_request.extend((len(payload_bytes)).to_bytes(4, 'big'))
        finish_session_request.extend(payload_bytes)
        await self.ws.send(finish_session_request)
        response = await self.ws.recv()
        print(f"FinishSession response: {protocol.parse_response(response)}")

    async def close(self) -> None:
        """关闭WebSocket连接"""
        if self.ws:
            await self.ws.close()
