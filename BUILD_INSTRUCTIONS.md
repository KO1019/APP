# 构建说明

## 环境变量配置

当前配置的后端地址：`https://anjia.work`

## 后端服务状态

**当前问题**：anjia.work 无法访问

### 检查后端服务

1. 检查后端服务是否运行：
```bash
curl https://anjia.work/api/v1/health
```

2. 如果服务未运行，启动后端服务：
```bash
cd /workspace/projects/server
pnpm run dev
```

3. 确保防火墙允许9091端口访问：
```bash
# 检查端口
netstat -tlnp | grep 9091
```

### 临时解决方案

如果anjia.work暂时无法使用，可以：

1. 使用本地局域网IP（仅在同一网络下可用）：
   - 查看本机IP：`ip addr show` 或 `ifconfig`
   - 修改`eas.json`中的环境变量为本机IP

2. 使用云服务器地址：
   - 确保云服务器防火墙开放9091端口
   - 修改`eas.json`中的环境变量为云服务器地址

## 重新构建

修改环境变量后，需要重新构建APK：

```bash
cd /workspace/projects/client
eas build --platform android --profile preview
```
