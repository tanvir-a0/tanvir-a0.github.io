"""Update the guide on the website from this tools folder.

Run:  python publish.py            (or double-click publish.bat)

1. assembly.mp4 (the raw Fusion export, kept here but not in git) -> the site's assembly.mp4,
   re-encoded only when the raw file is present and newer.
2. one thumbnail per step + the poster, grabbed from the site's video
3. guide.json -> the site

Everything else the page uses (3D parts, board drawings, photos, wireframes, CAD downloads)
is written straight into the site by parts.py / wires.py / crop_sheet.py / import_cad.py.
It never commits or pushes; you review the site and push yourself.
"""
import json
import shutil
import subprocess
import sys
from pathlib import Path

import imageio_ffmpeg

HERE = Path(__file__).resolve().parent
SITE = HERE.parent                                     # the website repo
GUIDE = SITE / "assets" / "guides" / "robot-assembly"  # keep in sync with serve.py
RAW_VIDEO = HERE / "assembly.mp4"
WEB_VIDEO = GUIDE / "assembly.mp4"
FF = imageio_ffmpeg.get_ffmpeg_exe()

# 1600 px wide, CRF 33: visually identical for CAD renders, ~26 MB for 10 min.
# Keyframe every 2 s (-g 48 @ 24 fps) so jumping to a step is instant.
ENCODE = ["-an", "-vf", "scale=1600:-2,format=yuv420p", "-c:v", "libx264", "-preset", "slow",
          "-crf", "33", "-tune", "animation", "-g", "48", "-movflags", "+faststart"]
STAMP = HERE / ".web_video_settings"


def run(args):
    subprocess.run([FF, "-hide_banner", "-v", "error", "-y", *args], check=True)


def encode_video():
    if not RAW_VIDEO.exists():
        print("no raw assembly.mp4 here: keeping the site's video as it is")
        return
    settings = " ".join(ENCODE)
    fresh = (WEB_VIDEO.exists() and STAMP.exists() and STAMP.read_text() == settings
             and WEB_VIDEO.stat().st_mtime > RAW_VIDEO.stat().st_mtime)
    if fresh:
        print("web video up to date")
        return
    print("encoding web video (takes ~2 minutes)…")
    tmp = GUIDE / "assembly.tmp.mp4"
    run(["-i", str(RAW_VIDEO), *ENCODE, str(tmp)])
    tmp.replace(WEB_VIDEO)
    STAMP.write_text(settings)


def grab(t, out, width):
    run(["-ss", f"{max(0, t):.3f}", "-i", str(WEB_VIDEO), "-frames:v", "1",
         "-vf", f"scale={width}:-2", "-q:v", "4", str(out)])


def main():
    guide_file = HERE / "guide.json"
    if not guide_file.exists():
        sys.exit("guide.json not found — open the builder (start-builder.bat) and add some steps first")
    guide = json.loads(guide_file.read_text(encoding="utf-8"))
    steps = guide.get("steps", [])
    GUIDE.mkdir(parents=True, exist_ok=True)

    encode_video()
    if not WEB_VIDEO.exists():
        sys.exit("no video: put the raw Fusion export here as assembly.mp4 and run again")

    thumbs = GUIDE / "thumbs"   # regenerated every time from the step timings
    if thumbs.exists():
        shutil.rmtree(thumbs)
    thumbs.mkdir()
    for i, s in enumerate(steps, 1):
        # a frame just before the step ends shows the finished result of that step
        t = s.get("thumb", max(s["start"], s["end"] - 0.4))
        grab(t, thumbs / f"{s['id']}.jpg", 480)
        print(f"  thumb {i}/{len(steps)}", end="\r")
    print()
    last = max([s["end"] for s in steps] + [guide.get("duration") or 0])
    grab(last - 0.5, GUIDE / "poster.jpg", 1600)
    shutil.copyfile(guide_file, GUIDE / "guide.json")

    size = sum(f.stat().st_size for f in GUIDE.rglob("*") if f.is_file()) / 1e6
    print(f"published {len(steps)} steps to {GUIDE}  ({size:.1f} MB total)")
    print("Nothing was committed. Check the page, then commit & push when happy.")


if __name__ == "__main__":
    main()
