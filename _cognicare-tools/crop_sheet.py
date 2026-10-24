"""Cut the separate drawings out of an image sheet (white background) into the site's img/ folder.

Run:  python crop_sheet.py user-images/sheet-1.webp name1 name2 ...
Items are found automatically and named in reading order (top-left to bottom-right).
Run once with no names to print what was found; it also saves a preview next to the sheet.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "assets" / "guides" / "robot-assembly" / "img"


def find_items(im):
    a = np.asarray(im.convert("RGB")).astype(int)
    ink = np.abs(a - 255).sum(2) > 60
    grown = np.asarray(Image.fromarray((ink * 255).astype("uint8")).filter(ImageFilter.MaxFilter(9))) > 0
    lab, _ = ndimage.label(grown)
    items = []
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if h * w >= 6000:
            items.append((i, sl))
    # a blob inside another item's box (e.g. text on a label) belongs to that item
    inside = lambda a, b: a[0].start >= b[0].start and a[0].stop <= b[0].stop and a[1].start >= b[1].start and a[1].stop <= b[1].stop
    items = [it for it in items if not any(o is not it and inside(it[1], o[1]) for o in items)]
    rows = max(1, im.height // 4)
    items.sort(key=lambda it: (it[1][0].start // rows, it[1][1].start))
    return lab, items


def main():
    sheet = HERE / sys.argv[1]
    names = sys.argv[2:]
    im = Image.open(sheet).convert("RGB")
    lab, items = find_items(im)
    if not names:
        prev = im.copy()
        d = ImageDraw.Draw(prev)
        for k, (_, sl) in enumerate(items):
            d.rectangle((sl[1].start, sl[0].start, sl[1].stop, sl[0].stop), outline="red", width=3)
            d.text((sl[1].start + 4, sl[0].start + 4), str(k), fill="red")
        prev.save(sheet.with_suffix(".boxes.jpg"))
        print(f"{len(items)} items found; preview saved as {sheet.with_suffix('.boxes.jpg').name}")
        return
    if len(names) != len(items):
        sys.exit(f"found {len(items)} items but got {len(names)} names")
    OUT.mkdir(parents=True, exist_ok=True)
    src = np.asarray(im)
    others = {label for label, _ in items}
    for name, (label, sl) in zip(names, items):
        # everything inked in this box except a neighbouring item poking in from the side
        region = lab[sl]
        keep = (region != 0) & ~np.isin(region, list(others - {label}))
        crop = np.where(keep[..., None], src[sl], 255).astype("uint8")
        tile = Image.fromarray(crop)
        side = int(max(tile.size) * 1.1)
        canvas = Image.new("RGB", (side, side), "white")
        canvas.paste(tile, ((side - tile.width) // 2, (side - tile.height) // 2))
        canvas.thumbnail((600, 600), Image.LANCZOS)
        canvas.save(OUT / f"{name}.jpg", quality=86, optimize=True)
        print("saved", name)


if __name__ == "__main__":
    main()
