#!/usr/bin/env python3
import asyncio
import websockets
import json

async def test_ws():
    uri = "ws://localhost:9091/api/v1/voice/realtime"
    print(f"Connecting to {uri}...")
    try:
        async with websockets.connect(uri) as ws:
            print("✅ Connected!")
            msg = await asyncio.wait_for(ws.recv(), timeout=5)
            print(f"📨 Message: {msg}")
            print("✅ Test passed!")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == '__main__':
    asyncio.run(test_ws())
