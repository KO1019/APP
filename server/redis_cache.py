"""
Redis 缓存模块
"""

import redis
from dotenv import load_dotenv
import os
import json

load_dotenv()

# Redis 配置
REDIS_CONFIG = {
    'host': os.getenv('REDIS_HOST', 'localhost'),
    'port': int(os.getenv('REDIS_PORT', 6379)),
    'db': int(os.getenv('REDIS_DB', 0)),
    'password': os.getenv('REDIS_PASSWORD', None),
    'decode_responses': True  # 自动解码为字符串
}

# 创建 Redis 连接池
redis_pool = redis.ConnectionPool(**REDIS_CONFIG)
redis_client = redis.Redis(connection_pool=redis_pool)


def get_redis_client():
    """获取 Redis 客户端"""
    return redis_client


def cache_get(key: str, default=None):
    """从缓存获取数据"""
    try:
        client = get_redis_client()
        value = client.get(key)
        if value is None:
            return default
        # 尝试解析 JSON
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value
    except Exception as e:
        print(f"❌ Redis GET failed: {e}")
        return default


def cache_set(key: str, value, expire: int = None):
    """设置缓存数据"""
    try:
        client = get_redis_client()
        # 如果是字典或列表，转换为 JSON
        if isinstance(value, (dict, list)):
            value = json.dumps(value)
        if expire:
            client.setex(key, expire, value)
        else:
            client.set(key, value)
        return True
    except Exception as e:
        print(f"❌ Redis SET failed: {e}")
        return False


def cache_delete(key: str):
    """删除缓存"""
    try:
        client = get_redis_client()
        return client.delete(key)
    except Exception as e:
        print(f"❌ Redis DELETE failed: {e}")
        return False


def cache_delete_pattern(pattern: str):
    """删除匹配模式的所有缓存"""
    try:
        client = get_redis_client()
        keys = client.keys(pattern)
        if keys:
            return client.delete(*keys)
        return 0
    except Exception as e:
        print(f"❌ Redis DELETE PATTERN failed: {e}")
        return 0


def cache_exists(key: str):
    """检查缓存是否存在"""
    try:
        client = get_redis_client()
        return client.exists(key) > 0
    except Exception as e:
        print(f"❌ Redis EXISTS failed: {e}")
        return False


def cache_clear():
    """清空所有缓存"""
    try:
        client = get_redis_client()
        return client.flushdb()
    except Exception as e:
        print(f"❌ Redis FLUSHDB failed: {e}")
        return False


if __name__ == '__main__':
    # 测试 Redis 连接
    try:
        client = get_redis_client()
        # 测试设置和获取
        client.set('test_key', 'test_value')
        value = client.get('test_key')
        print(f"✅ Redis connection successful")
        print(f"✅ Test value: {value}")
        # 清理
        client.delete('test_key')
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
