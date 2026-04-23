"""
MySQL 数据库连接模块（使用连接池优化性能）
"""

import pymysql
from pymysql.cursors import DictCursor
from contextlib import contextmanager
from dotenv import load_dotenv
import os

load_dotenv()

# 数据库配置
MYSQL_CONFIG = {
    'host': os.getenv('MYSQL_HOST', 'localhost'),
    'port': int(os.getenv('MYSQL_PORT', 3306)),
    'user': os.getenv('MYSQL_USER', 'root'),
    'password': os.getenv('MYSQL_PASSWORD', ''),
    'database': os.getenv('MYSQL_DATABASE', 'ai_emotion_diary'),
    'charset': os.getenv('MYSQL_CHARSET', 'utf8mb4'),
    'cursorclass': DictCursor,
    'autocommit': True
}

# 连接池配置
class MySQLPool:
    def __init__(self, max_connections=10):
        self.max_connections = max_connections
        self.pool = []

    def get_connection(self):
        """从连接池获取连接"""
        if self.pool:
            return self.pool.pop()
        else:
            return pymysql.connect(**MYSQL_CONFIG)

    def release_connection(self, conn):
        """释放连接回连接池"""
        if len(self.pool) < self.max_connections:
            self.pool.append(conn)
        else:
            conn.close()

# 全局连接池
_pool = MySQLPool(max_connections=10)

@contextmanager
def get_db_cursor():
    """获取数据库游标（上下文管理器）"""
    conn = _pool.get_connection()
    cursor = conn.cursor(DictCursor)
    try:
        yield cursor
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        _pool.release_connection(conn)


def execute_query(query: str, params: tuple = None, fetch_one: bool = False):
    """执行查询语句"""
    with get_db_cursor() as cursor:
        cursor.execute(query, params or ())
        if fetch_one:
            return cursor.fetchone()
        return cursor.fetchall()


def execute_update(query: str, params: tuple = None):
    """执行更新/插入/删除语句"""
    with get_db_cursor() as cursor:
        cursor.execute(query, params or ())
        return cursor.rowcount


def execute_insert(query: str, params: tuple = None):
    """执行插入语句，返回最后插入的 ID"""
    with get_db_cursor() as cursor:
        cursor.execute(query, params or ())
        return cursor.lastrowid


def init_database():
    """初始化数据库（创建数据库）"""
    try:
        # 连接到 MySQL 服务器（不指定数据库）
        config = MYSQL_CONFIG.copy()
        config.pop('database', None)
        conn = pymysql.connect(**config)
        cursor = conn.cursor()

        # 创建数据库
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {MYSQL_CONFIG['database']} CHARACTER SET {MYSQL_CONFIG['charset']}")
        print(f"✅ Database {MYSQL_CONFIG['database']} created or already exists")

        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"❌ Failed to initialize database: {e}")
        return False


if __name__ == '__main__':
    # 测试数据库连接
    try:
        init_database()
        with get_db_cursor() as cursor:
            cursor.execute("SELECT VERSION()")
            version = cursor.fetchone()
            print(f"✅ MySQL version: {version}")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
