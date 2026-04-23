"""
数据库操作适配器 - 将 Supabase 风格的 API 转换为 MySQL 操作
"""

from database import execute_query, execute_update, execute_insert, get_db_cursor
from typing import Any, Dict, List, Optional
import json
from datetime import datetime


class Table:
    """表操作类（模拟 Supabase Table）"""

    def __init__(self, table_name: str):
        self.table_name = table_name

    def select(self, columns: str = '*'):
        """选择字段"""
        self._select_columns = columns
        return self

    def insert(self, data: Dict[str, Any]):
        """插入数据"""
        self._insert_data = data
        return self

    def update(self, data: Dict[str, Any]):
        """更新数据"""
        self._update_data = data
        return self

    def delete(self):
        """删除数据"""
        self._delete = True
        return self

    def eq(self, column: str, value: Any):
        """等于条件"""
        if not hasattr(self, '_where'):
            self._where = []
        self._where.append(f"{column} = %s")
        if not hasattr(self, '_params'):
            self._params = []
        self._params.append(value)
        return self

    def gte(self, column: str, value: Any):
        """大于等于条件"""
        if not hasattr(self, '_where'):
            self._where = []
        self._where.append(f"{column} >= %s")
        if not hasattr(self, '_params'):
            self._params = []
        self._params.append(value)
        return self

    def lte(self, column: str, value: Any):
        """小于等于条件"""
        if not hasattr(self, '_where'):
            self._where = []
        self._where.append(f"{column} <= %s")
        if not hasattr(self, '_params'):
            self._params = []
        self._params.append(value)
        return self

    def order(self, column: str, desc: bool = True):
        """排序"""
        self._order_column = column
        self._order_desc = desc
        return self

    def range(self, start: int, end: int):
        """分页"""
        self._offset = start
        self._limit = end - start + 1
        return self

    def single(self):
        """只返回一条记录"""
        self._single = True
        self._limit = 1
        return self

    def execute(self):
        """执行查询"""
        select_columns = getattr(self, '_select_columns', '*')

        # 构建 SELECT 查询
        query = f"SELECT {select_columns} FROM {self.table_name}"

        # WHERE 条件
        if hasattr(self, '_where') and self._where:
            query += " WHERE " + " AND ".join(self._where)
            params = tuple(getattr(self, '_params', []))
        else:
            params = ()

        # ORDER BY
        if hasattr(self, '_order_column'):
            order = 'DESC' if getattr(self, '_order_desc', False) else 'ASC'
            query += f" ORDER BY {self._order_column} {order}"

        # LIMIT
        if hasattr(self, '_limit'):
            query += " LIMIT %s"
            if hasattr(self, '_offset'):
                query += " OFFSET %s"
                params = params + (self._limit, self._offset)
            else:
                params = params + (self._limit,)

        # 执行查询
        if hasattr(self, '_insert_data'):
            # INSERT 查询
            columns = ', '.join(self._insert_data.keys())
            placeholders = ', '.join(['%s'] * len(self._insert_data))
            values = tuple(self._insert_data.values())

            insert_query = f"INSERT INTO {self.table_name} ({columns}) VALUES ({placeholders})"
            execute_insert(insert_query, values)

            # 返回插入的数据
            return type('Result', (), {'data': [self._insert_data]})()
        elif hasattr(self, '_delete'):
            # DELETE 查询
            delete_query = query.replace(f"SELECT {select_columns} FROM", "DELETE FROM")
            delete_query = delete_query.split(" ORDER BY")[0]  # 删除不需要 ORDER BY
            rowcount = execute_update(delete_query, params)
            return type('Result', (), {'data': []})()
        elif hasattr(self, '_update_data'):
            # UPDATE 查询
            update_query = query.replace(f"SELECT {select_columns} FROM", "UPDATE")
            update_query = update_query.split(" ORDER BY")[0]  # 更新不需要 ORDER BY
            set_clause = ', '.join([f"{k} = %s" for k in self._update_data.keys()])
            update_query = update_query.replace(" WHERE", f" SET {set_clause} WHERE")
            update_params = tuple(self._update_data.values()) + params
            rowcount = execute_update(update_query, update_params)
            # 返回更新后的数据
            return type('Result', (), {'data': execute_query(query, params)})()
        else:
            # SELECT 查询
            data = execute_query(query, params)
            if hasattr(self, '_single') and self._single:
                # 只返回第一条记录
                if data:
                    return type('Result', (), {'data': data[0] if isinstance(data, list) else data})()
                else:
                    return type('Result', (), {'data': None})()
            else:
                return type('Result', (), {'data': data, 'count': len(data)})()


class DatabaseClient:
    """数据库客户端（模拟 Supabase Client）"""

    def table(self, table_name: str):
        """获取表操作对象"""
        return Table(table_name)

    def auth(self):
        """认证模块"""
        return self

    def sign_up(self, email, password):
        """注册"""
        from database import execute_insert
        import uuid
        import hashlib

        user_id = str(uuid.uuid4())
        password_hash = hashlib.sha256(password.encode()).hexdigest()

        execute_insert(
            "INSERT INTO users (id, username, password_hash, email) VALUES (%s, %s, %s, %s)",
            (user_id, email, password_hash, email)
        )

        return type('AuthResponse', (), {
            'data': {'user': {'id': user_id, 'email': email}},
            'user': {'id': user_id, 'email': email}
        })()

    def sign_in_with_password(self, email, password):
        """登录"""
        from database import execute_query
        import hashlib

        password_hash = hashlib.sha256(password.encode()).hexdigest()
        user = execute_query(
            "SELECT * FROM users WHERE email = %s AND password_hash = %s",
            (email, password_hash),
            fetch_one=True
        )

        if not user:
            raise Exception("Invalid credentials")

        return type('AuthResponse', (), {
            'data': {'user': user},
            'user': user
        })()


# 创建全局数据库客户端
db_client = DatabaseClient()

# 为了兼容现有代码，创建一个别名
admin_supabase = db_client
