#!/usr/bin/env python3
"""生成 PWA 图标（深墨底 + 金色剑形）：icon-192/512 + maskable-512 → public/icons/"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"
OUT.mkdir(parents=True, exist_ok=True)

BG = "#1b2a3a"
BG_RGB = (27, 42, 58)
GOLD = "#d9a441"
GOLD_HI = "#f0cd7e"
STEEL = "#8fa3b8"


def draw_sword(d, cx, cy, s):
    """在 (cx,cy) 画一把竖向剑，s=缩放比例。"""
    # 剑尖（三角）
    tip_h = s * 0.34
    blade_w = s * 0.20
    d.polygon([
        (cx - blade_w / 2, cy - s * 0.36),          # 左上（刃根）
        (cx, cy - s * 0.36 - tip_h),                # 剑尖
        (cx + blade_w / 2, cy - s * 0.36),          # 右上
    ], fill=GOLD_HI)
    # 剑身（矩形，略带收窄）
    d.rectangle([cx - blade_w / 2, cy - s * 0.36, cx + blade_w / 2, cy + s * 0.12], fill=GOLD)
    # 中脊高光
    d.rectangle([cx - blade_w / 6, cy - s * 0.36, cx + blade_w / 6, cy + s * 0.12], fill=GOLD_HI)
    # 护手（横）
    d.rectangle([cx - s * 0.34, cy + s * 0.12, cx + s * 0.34, cy + s * 0.20], fill=STEEL)
    # 剑柄
    d.rectangle([cx - s * 0.09, cy + s * 0.20, cx + s * 0.09, cy + s * 0.42], fill=GOLD)
    # 柄尾
    d.rectangle([cx - s * 0.13, cy + s * 0.42, cx + s * 0.13, cy + s * 0.46], fill=STEEL)


def make(size, maskable=False):
    img = Image.new("RGB", (size, size), BG)
    d = ImageDraw.Draw(img)
    # 轻微径向渐变：边缘压暗
    for i in range(6):
        r = size / 2 - i * (size / 14)
        shade = int(20 + i * 8)
        d.ellipse([size / 2 - r, size / 2 - r, size / 2 + r, size / 2 + r],
                  outline=(BG_RGB[0], BG_RGB[1], BG_RGB[2]))
    # 圆角矩形背景（非 maskable 时加圆角/留白）
    if not maskable:
        pad = size * 0.06
        d.rounded_rectangle([pad, pad, size - pad, size - pad], radius=size * 0.16, fill=BG)
    # 外环饰边
    ring = size * (0.20 if maskable else 0.30)
    d.ellipse([size / 2 - ring, size / 2 - ring, size / 2 + ring, size / 2 + ring],
              outline="#3a5570", width=max(2, size // 60))
    # 剑
    s = size * (0.42 if maskable else 0.50)
    draw_sword(d, size / 2, size / 2, s)
    return img


make(192).save(OUT / "icon-192.png")
make(512).save(OUT / "icon-512.png")
make(512, maskable=True).save(OUT / "maskable-512.png")
print(f"icons written: {OUT}")