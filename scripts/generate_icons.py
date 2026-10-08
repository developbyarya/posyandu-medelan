#!/usr/bin/env python3
"""Generate PWA icons for POSYANDU MEDELAN (royal-blue tile + white medical cross).

Usage: python3 scripts/generate_icons.py
Outputs to public/icons/. The maskable icon keeps all artwork inside the 80% safe zone.
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "icons"
BLUE = (29, 78, 216)       # #1D4ED8
BLUE_DARK = (30, 58, 138)  # #1E3A8A
WHITE = (255, 255, 255)
GREEN = (21, 128, 61)      # #15803D
SS = 4                     # supersampling factor


def draw_icon(size: int, *, maskable: bool) -> Image.Image:
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    if maskable:
        d.rectangle([0, 0, s, s], fill=BLUE)  # full bleed; OS applies the mask
        scale = 0.62                           # artwork well inside the 80% safe zone
    else:
        d.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * 0.22), fill=BLUE)
        scale = 0.72

    cx = cy = s / 2
    r = s * scale / 2

    # White disc with a blue cross inside (kesehatan), and a green dot (tumbuh kembang)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=WHITE)
    arm = r * 0.34   # half-thickness of the cross arm
    ext = r * 0.62   # half-length of the cross arm
    d.rounded_rectangle([cx - ext, cy - arm, cx + ext, cy + arm], radius=arm * 0.4, fill=BLUE_DARK)
    d.rounded_rectangle([cx - arm, cy - ext, cx + arm, cy + ext], radius=arm * 0.4, fill=BLUE_DARK)
    dot = r * 0.20
    gx, gy = cx + r * 0.62, cy - r * 0.62
    d.ellipse([gx - dot, gy - dot, gx + dot, gy + dot], fill=GREEN, outline=WHITE, width=int(s * 0.012))

    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    draw_icon(192, maskable=False).save(OUT / "icon-192.png")
    draw_icon(512, maskable=False).save(OUT / "icon-512.png")
    draw_icon(512, maskable=True).save(OUT / "icon-maskable-512.png")
    # iOS: opaque square, no transparency
    ios = Image.new("RGB", (180, 180), BLUE)
    ios.paste(draw_icon(180, maskable=True), (0, 0))
    ios.save(OUT / "apple-touch-icon.png")
    print("Saved icons to", OUT)


if __name__ == "__main__":
    main()
