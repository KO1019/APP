"""
阿里云OSS对象存储模块
提供文件上传、下载、删除等操作
"""

import oss2
import os
import uuid
import mimetypes
from datetime import datetime, timedelta
from typing import Optional, BinaryIO, Tuple
from dotenv import load_dotenv

# 加载.env文件
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path)

# OSS配置
OSS_ENDPOINT = os.getenv('OSS_ENDPOINT', 'oss-cn-beijing.aliyuncs.com')
OSS_ACCESS_KEY_ID = os.getenv('OSS_ACCESS_KEY_ID', '')
OSS_ACCESS_KEY_SECRET = os.getenv('OSS_ACCESS_KEY_SECRET', '')
OSS_BUCKET_NAME = os.getenv('OSS_BUCKET_NAME', '')
OSS_PUBLIC_READ = os.getenv('OSS_PUBLIC_READ', 'true').lower() == 'true'

# 创建OSS客户端
auth = oss2.Auth(OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET)
bucket = oss2.Bucket(auth, OSS_ENDPOINT, OSS_BUCKET_NAME) if OSS_BUCKET_NAME else None


class OSSStorage:
    """OSS存储管理类"""

    def __init__(self):
        self.bucket = bucket
        self.bucket_name = OSS_BUCKET_NAME

    def _generate_key(self, filename: str, folder: str = 'uploads') -> str:
        """
        生成对象存储的key

        Args:
            filename: 原始文件名
            folder: 文件夹名称

        Returns:
            生成的key，如：uploads/2025/01/15/uuid.jpg
        """
        # 获取文件扩展名
        ext = os.path.splitext(filename)[1].lower()

        # 生成唯一ID
        unique_id = str(uuid.uuid4())

        # 生成日期路径
        date_path = datetime.now().strftime('%Y/%m/%d')

        # 拼接完整路径
        key = f"{folder}/{date_path}/{unique_id}{ext}"
        return key

    def _get_content_type(self, filename: str) -> str:
        """
        获取文件的Content-Type

        Args:
            filename: 文件名

        Returns:
            Content-Type字符串
        """
        content_type, _ = mimetypes.guess_type(filename)
        return content_type or 'application/octet-stream'

    def upload_file(
        self,
        file_data: bytes,
        filename: str,
        folder: str = 'uploads',
        is_public: Optional[bool] = None
    ) -> Tuple[bool, dict]:
        """
        上传文件到OSS

        Args:
            file_data: 文件二进制数据
            filename: 原始文件名
            folder: 存储文件夹
            is_public: 是否公开读取（None则使用默认配置）

        Returns:
            (success, result)
            - success: 是否成功
            - result: 成功时包含文件信息，失败时包含错误信息
        """
        if not self.bucket:
            return False, {'error': 'OSS bucket未配置'}

        try:
            # 生成key
            key = self._generate_key(filename, folder)

            # 获取Content-Type
            content_type = self._get_content_type(filename)

            # 设置访问权限
            public_read = is_public if is_public is not None else OSS_PUBLIC_READ

            # 上传文件
            headers = {
                'Content-Type': content_type,
            }

            # 上传文件
            result = self.bucket.put_object(key, file_data, headers=headers)

            # 如果是公开读取，设置权限
            if public_read:
                self.bucket.put_object_acl(key, oss2.OBJECT_ACL_PUBLIC_READ)

            # 生成访问URL
            if public_read:
                # 公开文件直接使用域名访问
                url = f"https://{self.bucket_name}.{OSS_ENDPOINT}/{key}"
            else:
                # 私有文件生成签名URL（有效期1小时）
                url = self.bucket.sign_url('GET', key, 3600)

            return True, {
                'key': key,
                'url': url,
                'size': len(file_data),
                'content_type': content_type,
                'filename': filename,
                'is_public': public_read
            }

        except Exception as e:
            print(f"[OSS] 上传文件失败: {e}")
            return False, {'error': str(e)}

    def upload_file_from_path(
        self,
        file_path: str,
        folder: str = 'uploads',
        is_public: Optional[bool] = None
    ) -> Tuple[bool, dict]:
        """
        从本地路径上传文件

        Args:
            file_path: 本地文件路径
            folder: 存储文件夹
            is_public: 是否公开读取

        Returns:
            (success, result)
        """
        if not os.path.exists(file_path):
            return False, {'error': '文件不存在'}

        with open(file_path, 'rb') as f:
            file_data = f.read()

        filename = os.path.basename(file_path)
        return self.upload_file(file_data, filename, folder, is_public)

    def delete_file(self, key: str) -> Tuple[bool, dict]:
        """
        删除文件

        Args:
            key: 文件key

        Returns:
            (success, result)
        """
        if not self.bucket:
            return False, {'error': 'OSS bucket未配置'}

        try:
            self.bucket.delete_object(key)
            return True, {'message': '删除成功'}
        except Exception as e:
            print(f"[OSS] 删除文件失败: {e}")
            return False, {'error': str(e)}

    def get_file_url(self, key: str, expires: int = 3600) -> str:
        """
        获取文件访问URL

        Args:
            key: 文件key
            expires: URL有效期（秒），仅对私有文件有效

        Returns:
            访问URL
        """
        if not self.bucket:
            return ''

        try:
            # 检查文件是否公开
            # 如果文件设置了公开读取权限，直接返回URL
            if OSS_PUBLIC_READ:
                return f"https://{self.bucket_name}.{OSS_ENDPOINT}/{key}"
            else:
                # 生成签名URL
                return self.bucket.sign_url('GET', key, expires)
        except Exception as e:
            print(f"[OSS] 获取文件URL失败: {e}")
            return ''

    def check_file_exists(self, key: str) -> bool:
        """
        检查文件是否存在

        Args:
            key: 文件key

        Returns:
            是否存在
        """
        if not self.bucket:
            return False

        try:
            return self.bucket.object_exists(key)
        except Exception:
            return False

    def get_file_info(self, key: str) -> Optional[dict]:
        """
        获取文件信息

        Args:
            key: 文件key

        Returns:
            文件信息字典，不存在或出错返回None
        """
        if not self.bucket:
            return None

        try:
            meta = self.bucket.get_object_meta(key)
            return {
                'key': key,
                'size': int(meta.headers.get('Content-Length', 0)),
                'content_type': meta.headers.get('Content-Type', ''),
                'last_modified': meta.headers.get('Last-Modified', ''),
                'etag': meta.headers.get('ETag', '')
            }
        except Exception as e:
            print(f"[OSS] 获取文件信息失败: {e}")
            return None

    def list_files(self, prefix: str = '', max_keys: int = 100) -> Tuple[bool, list]:
        """
        列出文件

        Args:
            prefix: 文件前缀（用于筛选）
            max_keys: 最大返回数量

        Returns:
            (success, files)
        """
        if not self.bucket:
            return False, []

        try:
            result = []
            for obj in oss2.ObjectIterator(self.bucket, prefix=prefix, max_keys=max_keys):
                result.append({
                    'key': obj.key,
                    'size': obj.size,
                    'last_modified': obj.last_modified,
                    'etag': obj.etag
                })
            return True, result
        except Exception as e:
            print(f"[OSS] 列出文件失败: {e}")
            return False, []

    def copy_file(self, src_key: str, dest_key: str) -> Tuple[bool, dict]:
        """
        复制文件

        Args:
            src_key: 源文件key
            dest_key: 目标文件key

        Returns:
            (success, result)
        """
        if not self.bucket:
            return False, {'error': 'OSS bucket未配置'}

        try:
            self.bucket.copy_object(self.bucket_name, src_key, dest_key)
            return True, {'message': '复制成功'}
        except Exception as e:
            print(f"[OSS] 复制文件失败: {e}")
            return False, {'error': str(e)}


# 创建全局实例
oss_storage = OSSStorage()


def check_oss_config() -> bool:
    """检查OSS配置是否有效"""
    return bool(OSS_ACCESS_KEY_ID and OSS_ACCESS_KEY_SECRET and OSS_BUCKET_NAME)


if __name__ == '__main__':
    # 测试代码
    print(f"OSS配置: {'✅ 有效' if check_oss_config() else '❌ 无效'}")
    print(f"Bucket: {OSS_BUCKET_NAME}")
    print(f"Endpoint: {OSS_ENDPOINT}")

    if check_oss_config():
        # 测试上传
        test_data = b"Hello OSS! This is a test file."
        success, result = oss_storage.upload_file(
            test_data,
            'test.txt',
            folder='tests'
        )

        if success:
            print(f"✅ 上传成功: {result}")
            print(f"📥 下载链接: {result['url']}")

            # 测试列出文件
            list_success, files = oss_storage.list_files(prefix='tests/')
            if list_success:
                print(f"📁 文件列表: {len(files)} 个文件")
        else:
            print(f"❌ 上传失败: {result}")
