"""
执行 MySQL SQL 脚本
"""

from database import execute_query, execute_update, execute_insert, get_db_cursor
import re

def execute_sql_script(sql_file: str):
    """执行 SQL 脚本文件"""
    with open(sql_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()

    # 分割 SQL 语句（按分号分割）
    statements = re.split(r';\s*\n', sql_content)

    for stmt in statements:
        stmt = stmt.strip()
        if not stmt or stmt.startswith('--') or stmt.startswith('/*'):
            continue

        try:
            with get_db_cursor() as cursor:
                cursor.execute(stmt)
                print(f"✅ 执行成功: {stmt[:50]}...")
        except Exception as e:
            if "already exists" in str(e) or "Duplicate entry" in str(e):
                print(f"⏭️  跳过（已存在）: {stmt[:50]}...")
            else:
                print(f"❌ 执行失败: {e}")
                print(f"   SQL: {stmt[:100]}...")

if __name__ == '__main__':
    execute_sql_script('create_mysql_tables.sql')
    print("\n✅ 数据库表创建完成！")
