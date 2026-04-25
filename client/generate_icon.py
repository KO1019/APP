#!/usr/bin/env python3
"""
生成AI情绪日记App图标
使用暖橙色主题 (#EA580C)
"""

from PIL import Image, ImageDraw, ImageFont
import os

# 创建图标
size = 1024
img = Image.new('RGBA', (size, size), '#EA580C')
draw = ImageDraw.Draw(img)

# 创建渐变效果
for y in range(size):
    # 从上到下渐变
    ratio = y / size
    if ratio < 0.6:
        # 顶部渐变到亮橙色
        r = int(249 + (234 - 249) * (ratio / 0.6))
        g = int(115 + (88 - 115) * (ratio / 0.6))
        b = int(22 + (140 - 22) * (ratio / 0.6))
    else:
        # 底部渐变到深橙色
        ratio2 = (ratio - 0.6) / 0.4
        r = int(234 + (124 - 234) * ratio2)
        g = int(88 + (45 - 88) * ratio2)
        b = int(140 + (18 - 140) * ratio2)

    draw.rectangle([(0, y), (size, y+1)], fill=(r, g, b, 255))

# 绘制卡片背景
card_size = 700
card_margin = (size - card_size) // 2
card_radius = 100

# 绘制圆角矩形
draw.rounded_rectangle(
    [(card_margin, card_margin), (card_margin + card_size, card_margin + card_size)],
    radius=card_radius,
    fill=(255, 255, 255, 40),  # rgba(255, 255, 255, 0.15)
    outline=(255, 255, 255, 77),  # rgba(255, 255, 255, 0.3)
    width=4
)

# 绘制内层卡片
inner_margin = 100
inner_size = card_size - 2 * inner_margin
draw.rounded_rectangle(
    [(card_margin + inner_margin, card_margin + inner_margin),
     (card_margin + inner_margin + inner_size, card_margin + inner_margin + inner_size)],
    radius=60,
    fill=(255, 255, 255, 51),  # rgba(255, 255, 255, 0.2)
)

# 绘制书本图标
book_top = card_margin + 150
book_left = card_margin + 200
book_width = 300
book_height = 400

# 书本左侧（暗色）
draw.rounded_rectangle(
    [(book_left, book_top), (book_left + book_width, book_top + book_height)],
    radius=20,
    fill='#C2410C'
)

# 书本右侧（亮色）
draw.rounded_rectangle(
    [(book_left + book_width, book_top), (book_left + book_width * 2, book_top + book_height)],
    radius=20,
    fill='#F97316'
)

# 书脊
draw.rectangle(
    [(book_left + book_width - 4, book_top), (book_left + book_width + 4, book_top + book_height)],
    fill=(0, 0, 0, 77)  # rgba(0, 0, 0, 0.3)
)

# 书本线条
for i in range(3):
    line_y = book_top + 120 + i * 80
    draw.line(
        [(book_left + 50, line_y), (book_left + book_width - 20, line_y)],
        fill=(255, 255, 255, 102),  # rgba(255, 255, 255, 0.4)
        width=6
    )
    draw.line(
        [(book_left + book_width + 20, line_y), (book_left + book_width * 2 - 50, line_y)],
        fill=(255, 255, 255, 102),  # rgba(255, 255, 255, 0.4)
        width=6
    )

# 绘制爱心
heart_size = 120
heart_center_x = size // 2
heart_center_y = book_top + book_height - 100

# 爱心形状
heart_path = [
    (heart_center_x, heart_center_y + 40),
    (heart_center_x - 60, heart_center_y - 20),
    (heart_center_x - 80, heart_center_y + 10),
    (heart_center_x, heart_center_y + 100),
    (heart_center_x + 80, heart_center_y + 10),
    (heart_center_x + 60, heart_center_y - 20),
]
draw.polygon(heart_path, fill='#FFFFFF')

# 保存图标
output_dir = '/workspace/projects/client/assets/images'
os.makedirs(output_dir, exist_ok=True)

# 保存为多个尺寸
sizes = [1024, 512, 256, 128, 64]
for s in sizes:
    resized = img.resize((s, s), Image.Resampling.LANCZOS)
    filename = os.path.join(output_dir, f'icon_{s}x{s}.png')
    resized.save(filename, 'PNG', optimize=True)
    print(f"✅ 生成图标: {filename} ({s}x{s})")

# 保存主图标
icon_path = os.path.join(output_dir, 'icon.png')
img.save(icon_path, 'PNG', optimize=True)
print(f"✅ 生成主图标: {icon_path}")

# 保存自适应图标前景
adaptive_path = os.path.join(output_dir, 'adaptive-icon.png')
# 移除背景，只保留前景
transparent_bg = Image.new('RGBA', (size, size), (0, 0, 0, 0))
for y in range(size):
    for x in range(size):
        pixel = img.getpixel((x, y))
        # 保留非白色像素
        if pixel[3] > 0:
            if not (pixel[0] > 240 and pixel[1] > 240 and pixel[2] > 240):
                transparent_bg.putpixel((x, y), pixel)

# 缩小自适应图标前景
adaptive_size = 512
adaptive_img = transparent_bg.resize((adaptive_size, adaptive_size), Image.Resampling.LANCZOS)
adaptive_img.save(adaptive_path, 'PNG', optimize=True)
print(f"✅ 生成自适应图标: {adaptive_path}")

print("\n🎉 图标生成完成！")
