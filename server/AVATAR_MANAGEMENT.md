# 头像管理功能说明

## 功能概述

本系统提供了完整的头像管理功能，包括头像上传、更新和自动删除旧头像。

## API接口

### 1. 上传头像（推荐）

**接口**: `POST /api/v1/user/avatar`

**功能**: 上传头像并自动更新用户资料，如果用户已有头像则先删除旧头像

**请求参数**:
- `file`: 头像文件（multipart/form-data）
- `filename`: 文件名

**请求示例**:
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -F "file=@avatar.png" \
  -F "filename=avatar.png" \
  http://localhost:9091/api/v1/user/avatar
```

**响应示例**:
```json
{
  "success": true,
  "message": "头像上传成功",
  "avatar": {
    "key": "avatars/2026/04/23/5adf3bcd-cd68-4d9a-abc8-f9ef8840a456.png",
    "url": "https://kowm.oss-cn-beijing.aliyuncs.com/avatars/2026/04/23/5adf3bcd-cd68-4d9a-abc8-f9ef8840a456.png",
    "size": 667,
    "content_type": "image/png",
    "filename": "avatar1.png",
    "is_public": true
  }
}
```

**限制**:
- 文件大小：最大 5MB
- 支持格式：jpeg, jpg, png, gif, webp

### 2. 通用文件上传

**接口**: `POST /api/v1/files/upload`

**功能**: 上传任意文件到OSS

**请求参数**:
- `file`: 文件（multipart/form-data）
- `filename`: 文件名
- `folder`: 文件夹（可选，默认为 'uploads'）

**请求示例**:
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -F "file=@document.pdf" \
  -F "filename=document.pdf" \
  -F "folder=documents" \
  http://localhost:9091/api/v1/files/upload
```

### 3. 更新用户资料（支持头像URL）

**接口**: `POST /api/v1/auth/profile`

**功能**: 更新用户资料，包括头像URL

**请求示例**:
```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "nickname": "新昵称",
    "email": "new@example.com",
    "avatar": "https://kowm.oss-cn-beijing.aliyuncs.com/avatars/2026/04/23/xxx.png"
  }' \
  http://localhost:9091/api/v1/auth/profile
```

**注意**: 使用此接口更新头像时，系统会自动删除旧头像文件。

### 4. 删除文件

**接口**: `DELETE /api/v1/files/{file_key}`

**功能**: 删除OSS中的文件

**请求示例**:
```bash
curl -X DELETE \
  -H "Authorization: Bearer <token>" \
  http://localhost:9091/api/v1/files/avatars/2026/04/23/xxx.png
```

### 5. 获取文件URL

**接口**: `GET /api/v1/files/{file_key}/url`

**功能**: 获取文件的访问URL

**请求示例**:
```bash
curl -X GET \
  -H "Authorization: Bearer <token>" \
  http://localhost:9091/api/v1/files/avatars/2026/04/23/xxx.png/url
```

### 6. 获取文件信息

**接口**: `GET /api/v1/files/{file_key}/info`

**功能**: 获取文件的元数据信息

**请求示例**:
```bash
curl -X GET \
  -H "Authorization: Bearer <token>" \
  http://localhost:9091/api/v1/files/avatars/2026/04/23/xxx.png/info
```

## 特性

### 1. 自动删除旧头像

当用户更新头像时（无论是通过 `/api/v1/user/avatar` 还是 `/api/v1/auth/profile`），系统会：
1. 检查用户是否已有头像
2. 如果存在旧头像且与新头像URL不同，则从OSS中删除旧头像文件
3. 上传新头像并更新用户资料

### 2. 文件组织结构

- 头像文件存储在 `avatars/年/月/日/` 目录下
- 通用文件存储在 `uploads/年/月/日/` 目录下
- 文件名使用UUID，避免冲突

### 3. 公开访问

所有上传的文件默认为公开访问，可以直接通过URL访问。

### 4. 图片验证

上传头像时自动验证文件类型，只允许上传图片格式。

## 使用流程

### 前端上传头像流程

```javascript
// 1. 选择图片
const pickImage = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (!result.canceled) {
    uploadAvatar(result.assets[0]);
  }
};

// 2. 上传头像
const uploadAvatar = async (asset) => {
  const formData = new FormData();
  formData.append('file', {
    uri: asset.uri,
    type: 'image/png',
    name: 'avatar.png',
  });
  formData.append('filename', 'avatar.png');

  const response = await fetch(
    `${API_CONFIG.baseUrl}/api/v1/user/avatar`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    }
  );

  const data = await response.json();
  if (data.success) {
    console.log('头像上传成功:', data.avatar.url);
  }
};
```

## 技术实现

### OSS存储配置

```python
# oss_storage.py
from oss2 import Auth, Bucket

auth = Auth(OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET)
bucket = Bucket(auth, OSS_ENDPOINT, OSS_BUCKET_NAME)
```

### 删除旧头像逻辑

```python
# 获取当前用户信息
current_user = db_client.table('users').select('avatar').eq('id', user_id).single().execute()
old_avatar = current_user.data.get('avatar')

# 如果有旧头像，先删除
if old_avatar and old_avatar != new_avatar_url:
    # 从URL中提取OSS key
    url_parts = old_avatar.split('/', 3)
    if len(url_parts) >= 4:
        old_key = url_parts[3]
        oss_storage.delete_file(old_key)
```

## 注意事项

1. **权限验证**: 所有文件操作都需要有效的JWT Token
2. **文件大小限制**: 头像最大5MB，通用文件最大10MB
3. **文件类型限制**: 头像只允许图片格式
4. **OSS配置**: 确保 `.env` 文件中正确配置了OSS相关参数
5. **删除操作**: 删除文件后无法恢复，请谨慎操作

## 故障排查

### 1. 上传失败

- 检查OSS配置是否正确
- 确认文件大小和格式符合要求
- 检查网络连接

### 2. 旧头像未删除

- 检查旧头像URL是否正确
- 查看服务器日志中的删除记录
- 确认OSS权限配置正确

### 3. Token无效

- 确认Token未过期
- 检查Token格式是否正确
- 验证JWT_SECRET配置是否一致
