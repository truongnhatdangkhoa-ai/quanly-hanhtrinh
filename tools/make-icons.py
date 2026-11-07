"""Tạo icon, logo, splash cho app Hành Trình.
Chạy: python3 tools/make-icons.py   (cần Pillow)
Kết quả: android-res/ (chép vào android/app/src/main/res khi build), assets/
"""
import os
from PIL import Image, ImageDraw

INK = (18, 48, 59, 255)       # #12303b
SUN = (242, 179, 61, 255)     # #f2b33d
SOFT = (217, 236, 239, 255)   # #d9ecef
SS = 16                       # siêu lấy mẫu để mép mịn
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def bez(p0, p1, p2, t):
    x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0]
    y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]
    return x, y


def mark(px):
    """Biểu tượng (ghim địa điểm + đường đi chấm) trên lưới 108 đơn vị, nền trong suốt."""
    s = px * SS / 108.0
    img = Image.new("RGBA", (px * SS, px * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = lambda x, y, r, col: d.ellipse([(x - r) * s, (y - r) * s, (x + r) * s, (y + r) * s], fill=col)
    # thân ghim: tròn + mũi nhọn
    c(54, 44, 18, SUN)
    d.polygon([((54 - 15.8) * s, 52.5 * s), ((54 + 15.8) * s, 52.5 * s), (54 * s, 75 * s)], fill=SUN)
    # lỗ tròn (xuyên thấu để lộ nền)
    hole = Image.new("L", img.size, 255)
    hd = ImageDraw.Draw(hole)
    hd.ellipse([(54 - 7.5) * s, (44 - 7.5) * s, (54 + 7.5) * s, (44 + 7.5) * s], fill=0)
    alpha = img.getchannel("A")
    img.putalpha(Image.composite(alpha, Image.new("L", img.size, 0), hole))
    d = ImageDraw.Draw(img)
    # đường đi chấm dẫn tới mũi ghim
    p0, p1, p2 = (30, 68), (40, 86), (53, 77)
    for i in range(6):
        x, y = bez(p0, p1, p2, i / 6.0)
        r = 1.6 + 0.35 * i / 5
        d.ellipse([(x - r) * s, (y - r) * s, (x + r) * s, (y + r) * s], fill=SOFT)
    return img


def down(img, px):
    return img.resize((px, px), Image.LANCZOS)


def compose(px):
    """Nền + biểu tượng, canvas 108 đơn vị."""
    bg = Image.new("RGBA", (px * SS, px * SS), INK)
    bg.alpha_composite(mark(px))
    return bg


def legacy(px_icon, shape):
    full = compose(432)  # đã siêu lấy mẫu
    # cắt vùng giữa 72/108 (bỏ phần đệm của adaptive icon)
    w = full.size[0]
    m = int(w * 18 / 108)
    crop = full.crop((m, m, w - m, w - m)).resize((px_icon * 4, px_icon * 4), Image.LANCZOS)
    mask = Image.new("L", crop.size, 0)
    md = ImageDraw.Draw(mask)
    if shape == "round":
        md.ellipse([0, 0, crop.size[0] - 1, crop.size[1] - 1], fill=255)
    else:
        md.rounded_rectangle([0, 0, crop.size[0] - 1, crop.size[1] - 1], radius=int(crop.size[0] * 0.22), fill=255)
    crop.putalpha(mask)
    return down(crop, px_icon)


def save(img, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path)


res = os.path.join(ROOT, "android-res")
dens = {"mdpi": (48, 108), "hdpi": (72, 162), "xhdpi": (96, 216), "xxhdpi": (144, 324), "xxxhdpi": (192, 432)}
for name, (icon_px, fg_px) in dens.items():
    d = os.path.join(res, "mipmap-" + name)
    save(legacy(icon_px, "square"), os.path.join(d, "ic_launcher.png"))
    save(legacy(icon_px, "round"), os.path.join(d, "ic_launcher_round.png"))
    save(down(mark(fg_px), fg_px), os.path.join(d, "ic_launcher_foreground.png"))

os.makedirs(os.path.join(res, "values"), exist_ok=True)
with open(os.path.join(res, "values", "ic_launcher_background.xml"), "w", encoding="utf-8") as f:
    f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#12303B</color>\n</resources>\n')

# icon 512 (xem trước / dùng khi cần)
save(legacy(512, "square"), os.path.join(ROOT, "assets", "icon-512.png"))

# splash: nền xanh đậm, biểu tượng ở giữa
sp = 1920
splash = Image.new("RGBA", (sp, sp), INK)
m = down(mark(640), 640)
splash.alpha_composite(m, ((sp - 640) // 2, (sp - 640) // 2))
save(splash.convert("RGB"), os.path.join(ROOT, "assets", "splash.png"))
print("ok")
