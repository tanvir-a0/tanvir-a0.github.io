"""Record which CAD files the CogniCare-Assembly-Documentation-2 repo has, so the guide can link to them.

Run (whenever files are added/renamed there and pushed):
    python index_cad.py "path/to/CogniCare-Assembly-Documentation-2"

Writes cad_index.json here: the STL / STEP / Fusion / DXF files that git tracks in that repo.
make_guide.py turns them into download links on GitHub (CAD_REPO below), so the website
itself carries no CAD files. The links only work once that repo is public.
"""
import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
EXTS = (".stl", ".step", ".f3d", ".dxf")


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    repo = Path(sys.argv[1])
    tracked = subprocess.run(["git", "-C", str(repo), "ls-files"], capture_output=True, text=True, check=True).stdout.splitlines()
    files = sorted(f for f in tracked if f.lower().endswith(EXTS) and "/" not in f)
    head = subprocess.run(["git", "-C", str(repo), "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip()
    (HERE / "cad_index.json").write_text(json.dumps({"commit": head, "files": files}, indent=1), encoding="utf-8")
    print(f"{len(files)} CAD files indexed from {repo.name} @ {head}")


if __name__ == "__main__":
    main()
