"""Turn the wireframe screenshots into transparent background art for the guide page.

Run:  python wires.py
Reads  user-images/wireframes/*.png
Writes ../assets/guides/robot-assembly/bg/wire-NN.webp (black lines on transparent, edges faded) + wires.json
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
SRC = HERE / "user-images" / "wireframes"                                  # drop new screenshots here
OUT = HERE.parent / "assets" / "guides" / "robot-assembly" / "bg"
MAX = 900          # longest side, px
FADE = 0.16        # fraction of each edge that fades out (hides the screenshot's hard crop)
DENSITY = 0.11     # target average ink, so shaded renders don't look heavier than line drawings


def edge_fade(h, w):
    y = np.minimum(np.arange(h), np.arange(h)[::-1]) / (h * FADE)
    x = np.minimum(np.arange(w), np.arange(w)[::-1]) / (w * FADE)
    fy, fx = np.clip(y, 0, 1), np.clip(x, 0, 1)
    m = np.outer(fy, fx)
    return m * m * (3 - 2 * m)          # smoothstep


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("wire-*.webp"):
        old.unlink()
    meta = []
    for i, f in enumerate(sorted(SRC.glob("*.png"))):
        im = Image.open(f).convert("L")
        im.thumbnail((MAX, MAX), Image.LANCZOS)
        ink = 1 - np.asarray(im, dtype=np.float32) / 255          # line darkness
        ink = np.clip((ink - 0.04) / 0.96, 0, 1) ** 0.8            # drop paper noise, keep thin lines visible
        ink *= min(1.0, DENSITY / max(ink.mean(), 1e-6))             # even out dense shaded renders
        alpha = (ink * edge_fade(*ink.shape) * 255).astype(np.uint8)
        rgba = np.zeros((*ink.shape, 4), np.uint8)
        rgba[..., 3] = alpha                                         # black lines; CSS inverts them in dark mode
        name = f"wire-{i:02d}.webp"
        Image.fromarray(rgba).save(OUT / name, "WEBP", quality=80, method=4)
        meta.append({"src": f"bg/{name}", "w": im.width, "h": im.height})
        print(name, im.size)
    (OUT / "wires.json").write_text(json.dumps(meta, indent=1), encoding="utf-8")
    size = sum(p.stat().st_size for p in OUT.glob("*.webp")) / 1e3
    print(f"{len(meta)} wireframes, {size:.0f} KB")


if __name__ == "__main__":
    main()
