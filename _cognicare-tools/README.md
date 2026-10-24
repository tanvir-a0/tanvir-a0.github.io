# CogniCare assembly guide: tools

Everything that builds `project-robot-assembly.html` lives here, inside the website repo.
GitHub Pages skips folders that start with `_`, so this folder is versioned but never published.

The page itself reads everything from `assets/guides/robot-assembly/`. The CAD files (STEP, STL, Fusion, DXF)
are **not** in this repo: the guide links to them in
https://github.com/tanvir-a0/CogniCare-Assembly-Documentation-2 (the links work once that repo is public).

| In `assets/guides/robot-assembly/` | Made by |
|---|---|
| `guide.json` | `make_guide.py` / the builder, copied by `publish.py` |
| `assembly.mp4`, `poster.jpg`, `thumbs/` | `publish.py` (from the raw video here) |
| `parts/` 3D previews + thumbnails, `cuts/` board drawings | `parts.py` (reads the CAD repo) |
| `img/` photos and drawn kit images, `img/dims/` dimension drawings | `crop_sheet.py` / extracted from the old PDF |
| `bg/` background wireframes | `wires.py` (reads `user-images/wireframes/`) |

## Look at it locally
Double-click **`start-builder.bat`**, then open http://127.0.0.1:8765/ (the guide)
or http://127.0.0.1:8765/builder.html (the step builder).

## Change something
- **Small text edits:** use the builder, then run `publish.bat`.
- **Bigger changes** (prints, hardware, images, chapters, kit lists): edit `make_guide.py`,
  run `python make_guide.py --force` (overwrites builder edits), then `publish.bat`.
- **CAD changed:** push it to the CogniCare-Assembly-Documentation-2 repo, then here run
  `python index_cad.py "path/to/CogniCare-Assembly-Documentation-2"` (updates the download links) and
  `python parts.py --cad "path/to/CogniCare-Assembly-Documentation-2"` (updates the 3D previews),
  then `python make_guide.py --force` and `publish.bat`.
- **New drawn images:** `python crop_sheet.py user-images/<sheet>.png name1 name2 ...`
- **New wireframes:** put them in `user-images/wireframes/`, run `python wires.py`.
- **New video:** replace `assembly.mp4` here (not in git: 79 MB), run `publish.bat`.

## Here
| File | What it is |
|---|---|
| `guide.json` | the guide being edited (the builder autosaves here) |
| `guide.user-original.json` | your original hand-written step notes (backup) |
| `make_guide.py` | the cleaned-up content that builds `guide.json` |
| `parts.json` | sizes/triangle counts from `parts.py` |
| `cad_index.json` | which CAD files the CAD repo has (from `index_cad.py`) |
| `user-images/` | source images: drawn kit sheets, dimension screenshots, wireframes |
| `source/` | the old PDF guide and the Creality slicer project files |
| `assembly.mp4` | raw Fusion export (local only, ignored by git) |

Requirements: Python with `imageio-ffmpeg trimesh fast-simplification DracoPy ezdxf pillow numpy scipy pymupdf`.
