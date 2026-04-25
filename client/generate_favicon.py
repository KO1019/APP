#!/usr/bin/env python3
"""
生成 Web 端 Favicon
"""

from PIL import Image, ImageDraw
import os

# 读取主图标
icon_path = '/workspace/projects/client/assets/images/icon_1024x1024.png'
img = Image.open(icon_path)

# 创建 favicon 尺寸
favicon_size = 32
favicon = img.resize((favicon_size, favicon_size), Image.Resampling.LANCZOS)

# 保存 favicon
output_path = '/workspace/projects/client/assets/images/favicon.png'
favicon.save(output_path, 'PNG', optimize=True)
print(f"✅ 生成 favicon: {output_path} ({favicon_size}x{favicon_size})")

# 创建更高分辨率的 favicon (Apple Touch Icon)
apple_size = 180
apple_icon = img.resize((apple_size, apple_size), Image.Resampling.LANCZOS)
apple_path = '/workspace/projects/client/assets/images/apple-touch-icon.png'
apple_icon.save(apple_path, 'PNG', optimize=True)
print(f"✅ 生成 Apple Touch Icon: {apple_path} ({apple_size}x{apple_size})")

print("\n🎉 Web 图标生成完成！")
