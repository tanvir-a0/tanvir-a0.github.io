"""Turn the CAD files in the CogniCare-Assembly-Documentation-2 repo into web assets.

Run:  python parts.py --cad "path/to/CogniCare-Assembly-Documentation-2"          (only changed parts)
      python parts.py --cad "path/to/CogniCare-Assembly-Documentation-2" --force  (rebuild everything)
(--cad can be left out when that repo sits next to this website repo.)

For every printed part listed in PRINTED below:
  parts/<slug>.glb   Draco-compressed, decimated 3D model for <model-viewer>
  parts/<slug>.webp  rendered thumbnail (transparent background)
For every laser-cut board in CUTS:
  cuts/<slug>.svg    outline drawing from the DXF
(all inside assets/guides/robot-assembly/) and parts.json here with sizes (mm) and triangle counts.
Also run index_cad.py with the same path so the download links match that repo.
"""
import json
import re
import struct
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "assets" / "guides" / "robot-assembly"   # the site's guide folder
# the CAD repo: --cad PATH, or a sibling of this website repo
SRC = Path(sys.argv[sys.argv.index("--cad") + 1]) if "--cad" in sys.argv else HERE.parent.parent / "CogniCare-Assembly-Documentation-2"
TARGET_FACES = 16000

# file name in the repo (without extension) -> friendly display name
PRINTED = {
    "Lower Board Support 1": "Lower Board Support 1",
    "Lower Board Support 2": "Lower Board Support 2",
    "Feet": "Feet",
    "Aluminium Profile Spacing Measurement Helper 1": "Spacing Helper 1",
    "Aluminium Profile Spacing Measurement Helper 2": "Spacing Helper 2",
    "Power Supply Holder That Connects with Aluminium Profile": "PSU Holder",
    "PSU Exhust Air Guide": "PSU Exhaust Air Guide",
    "PSU Shield": "PSU Shield",
    "Mesh Protecting Part": "Mesh Protecting Part",
    "Motherboard Base": "Motherboard Base",
    "Motherboard Support Left": "Motherboard Support Left",
    "Motherboard Support Right": "Motherboard Support Right",
    "120mm Cooling Fan Gurd Mainly for CPU Cooler Fans": "CPU Fan Guard (120 mm)",
    "GPU Holder Main": "GPU Holder Main",
    "GPU Holder Mounting Parts": "GPU Holder Mounting Parts",
    "GPU Holder Additional Support": "GPU Holder Additional Support",
    "Fan Mount With Aluminium Profile": "Fan Mount",
    "120mm Fan Inlet Air Guide": "Fan Inlet Air Guide (120 mm)",
    "Power Menu Connector Top Part": "Power Menu Connector Top",
    "Power Menu Connector Lower Part": "Power Menu Connector Lower",
    "Motherboard Backplate": "Motherboard Backplate",
    "GX 16 Holder": "GX16 Holder",
    "Screw Support for Board Small": "Board Screw Support (Small)",
    "Screw Support for Board Large": "Board Screw Support (Large)",
    "Updated GPU Backplate v1": "GPU Backplate",
    "AC Power Enter Hole": "AC Power Inlet Grommet",
    "Protector for PC Components": "PC Components Protector",
    "Top Board Screw Support": "Top Board Screw Support",
    "Emergency Switch Holder": "Emergency Switch Holder",
    "Updated Main Body Lifter Support": "Main Body Lifter",
    "Lazy Susan Bearing Holder with Servo Motor": "Bearing Holder (with Servo)",
    "Lazy Susan Bearing Holder Without Motor": "Bearing Holder (without Servo)",
    "Hip Driver Gear": "Hip Driver Gear",
    "Inner Driven Gear of Hip": "Inner Hip Gear",
    "Core Support": "Core Support",
    "Robot Temporary Base During Transportation": "Transport Base",
    "12V SMPS Holder Lower Part": "SMPS Holder Lower",
    "12V SMPS Holder Upper Part": "SMPS Holder Upper",
    "Left Lower Generated Connector": "Left Lower Connector",
    "Right Lower Generated Connector": "Right Lower Connector",
    "Left Upper Generated Connector": "Left Upper Connector",
    "Right Upper Generated Connector": "Right Upper Connector",
    "Display Connector with Core Profiles - Lower": "Display Connector Lower",
    "Display Connector with Core Profiles - Upper": "Display Connector Upper",
    "ViewSonic TD1655 Display Holder": "TD1655 Display Holder",
    "Monitor Magnetic Mount For Microphone And Additional Small Camera": "Magnetic Mic Mount",
    "Wire Guide - Small Version": "Wire Guide",
    "Entire Head Support and Neck Pan Motor Holder": "Neck Base & Pan Motor Holder",
    "Neck Pan Gear Driver": "Neck Pan Gear Driver",
    "Neck Pan Gear Driven": "Neck Pan Gear Driven",
    "Support for Neck Pan Gear Driven": "Pan Gear Bearing Support",
    "Neck Pan and Tilt Part Connection": "Pan–Tilt Connector",
    "Neck Tilt Gear Driver": "Neck Tilt Gear Driver",
    "Neck Tilt Gear Driven": "Neck Tilt Gear Driven",
    "Neck Tilt Left Head Joint": "Left Head Joint",
    "Neck Tilt Right Head Joint": "Right Head Joint",
    "Left Right Head Joint Connector": "Head Joint Bridge",
    "Head Front Connector": "Head Front Pivot",
    "Head Back Connector": "Head Back Pivot",
    "Head Front with Ribs": "Head Front",
    "Eye Glass or Visor": "Visor Mould",
    "Visor Holder": "Visor Holder",
    "Left Speaker Holder": "Left Speaker Holder",
    "Right Speaker Holder": "Right Speaker Holder",
    "Left Display Holder": "Left Eye Display Holder",
    "Right Display Holder": "Right Eye Display Holder",
    "Head Back": "Head Back",
    "Head Top Camera Holder": "Head Top Camera Cover",
    "Lower Midsection": "Lower Abdomen Panel",
    "Midsection": "Abdomen Panel",
    "Upper Midsection": "Chest Panel",
    "Rear Section with Umbilical Cord Hole": "Back Panel",
    "Upper Rear Section": "Back Top Panel",
    "Left Sholder Back": "Left Shoulder Back",
    "Left Sholder Front": "Left Shoulder Front",
    "Right Sholder Back": "Right Shoulder Back",
    "Right Sholder Front": "Right Shoulder Front",
    "Left Hole Filler With LEDs": "Left Hole Filler (LEDs)",
    "Right Umbilical Cord Hole": "Umbilical Cord Port",
    "Astra Camera Holder": "Chest Camera Holder",
}

CUTS = {
    "Lower Board": "Lower Board",
    "Right Board (Motherboard IO Side)": "Right Board (I/O side)",
    "Back Board": "Back Board",
    "Front Board": "Front Board",
    "Left Board": "Left Board",
    "Top Board": "Top Board",
    "Top Plate Extra": "Top Plate Extra",
}


def slug(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


# ---------------------------------------------------------------- GLB writer
def write_draco_glb(path, verts, faces, normals):
    """Minimal glTF 2.0 binary with one Draco-compressed primitive."""
    import DracoPy
    draco = DracoPy.encode(verts.astype(np.float32), faces.astype(np.uint32), quantization_bits=14,
                           compression_level=7, normals=np.asarray(normals, dtype=np.float64), normal_quantization_bits=10)
    # Draco picks its own attribute ids; read them back (attribute_type 0 = position, 1 = normal)
    ids = {a["attribute_type"]: a["unique_id"] for a in DracoPy.decode(draco).attributes}
    vmin, vmax = verts.min(0).tolist(), verts.max(0).tolist()
    bin_chunk = draco + b"\0" * ((4 - len(draco) % 4) % 4)
    gltf = {
        "asset": {"version": "2.0", "generator": "CogniCare parts.py"},
        "extensionsUsed": ["KHR_draco_mesh_compression"],
        "extensionsRequired": ["KHR_draco_mesh_compression"],
        "scene": 0, "scenes": [{"nodes": [0]}], "nodes": [{"mesh": 0}],
        "meshes": [{"primitives": [{
            "attributes": {"POSITION": 1, "NORMAL": 2}, "indices": 0, "material": 0,
            "extensions": {"KHR_draco_mesh_compression": {"bufferView": 0, "attributes": {"POSITION": ids[0], "NORMAL": ids[1]}}},
        }]}],
        "materials": [{"name": "PLA", "pbrMetallicRoughness": {
            "baseColorFactor": [0.86, 0.84, 0.80, 1], "metallicFactor": 0.0, "roughnessFactor": 0.55}}],
        "accessors": [
            {"componentType": 5125, "count": int(faces.size), "type": "SCALAR"},
            {"componentType": 5126, "count": int(len(verts)), "type": "VEC3", "min": vmin, "max": vmax},
            {"componentType": 5126, "count": int(len(verts)), "type": "VEC3"},
        ],
        "bufferViews": [{"buffer": 0, "byteOffset": 0, "byteLength": len(draco)}],
        "buffers": [{"byteLength": len(bin_chunk)}],
    }
    js = json.dumps(gltf, separators=(",", ":")).encode()
    js += b" " * ((4 - len(js) % 4) % 4)
    total = 12 + 8 + len(js) + 8 + len(bin_chunk)
    with open(path, "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, total))
        f.write(struct.pack("<II", len(js), 0x4E4F534A)); f.write(js)
        f.write(struct.pack("<II", len(bin_chunk), 0x004E4942)); f.write(bin_chunk)


# ---------------------------------------------------------------- thumbnail
def render_thumb(path, verts, faces, normals, size=520):
    """Z-buffered isometric render with smooth shading and outline edges."""
    from PIL import Image
    S = size * 2
    a, b = np.radians(-35), np.radians(28)
    ry = np.array([[np.cos(a), 0, np.sin(a)], [0, 1, 0], [-np.sin(a), 0, np.cos(a)]])
    rx = np.array([[1, 0, 0], [0, np.cos(b), -np.sin(b)], [0, np.sin(b), np.cos(b)]])
    R = rx @ ry
    p = (verts - verts.mean(0)) @ R.T
    nrm = normals @ R.T
    lo, hi = p[:, :2].min(0), p[:, :2].max(0)
    scale = 0.86 * S / max(hi - lo)
    off = (S - (hi - lo) * scale) / 2
    sx = (p[:, 0] - lo[0]) * scale + off[0]
    sy = S - ((p[:, 1] - lo[1]) * scale + off[1])
    z = p[:, 2]
    zbuf = np.full((S, S), -np.inf)
    nbuf = np.zeros((S, S, 3))
    for f in faces:
        x0, x1, x2 = sx[f]; y0, y1, y2 = sy[f]
        xmin, xmax = int(max(0, np.floor(min(x0, x1, x2)))), int(min(S - 1, np.ceil(max(x0, x1, x2))))
        ymin, ymax = int(max(0, np.floor(min(y0, y1, y2)))), int(min(S - 1, np.ceil(max(y0, y1, y2))))
        if xmax < xmin or ymax < ymin:
            continue
        den = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2)
        if abs(den) < 1e-9:
            continue
        gx, gy = np.meshgrid(np.arange(xmin, xmax + 1) + 0.5, np.arange(ymin, ymax + 1) + 0.5)
        w0 = ((y1 - y2) * (gx - x2) + (x2 - x1) * (gy - y2)) / den
        w1 = ((y2 - y0) * (gx - x2) + (x0 - x2) * (gy - y2)) / den
        w2 = 1 - w0 - w1
        inside = (w0 >= -1e-4) & (w1 >= -1e-4) & (w2 >= -1e-4)
        if not inside.any():
            continue
        zz = w0 * z[f[0]] + w1 * z[f[1]] + w2 * z[f[2]]
        sub = zbuf[ymin:ymax + 1, xmin:xmax + 1]
        upd = inside & (zz > sub)
        if not upd.any():
            continue
        sub[upd] = zz[upd]
        nn = w0[..., None] * nrm[f[0]] + w1[..., None] * nrm[f[1]] + w2[..., None] * nrm[f[2]]
        nbuf[ymin:ymax + 1, xmin:xmax + 1][upd] = nn[upd]
    mask = np.isfinite(zbuf)
    n = nbuf / (np.linalg.norm(nbuf, axis=2, keepdims=True) + 1e-12)
    n[n[..., 2] < 0] *= -1                                  # two-sided lighting
    L = np.array([-0.4, 0.62, 0.68]); L /= np.linalg.norm(L)
    H = L + np.array([0, 0, 1.0]); H /= np.linalg.norm(H)
    diff = np.clip(n @ L, 0, 1)
    spec = np.clip(n @ H, 0, 1) ** 40
    shade = 0.38 + 0.55 * diff + 0.10 * n[..., 1].clip(0, 1)
    base = np.array([228, 222, 212]) / 255
    rgb = np.clip(base[None, None] * shade[..., None] + 0.18 * spec[..., None], 0, 1)
    # outlines where depth jumps or normals bend sharply
    zf = np.where(mask, zbuf, z.min() - (z.max() - z.min()))
    dz = np.maximum(np.abs(np.diff(zf, axis=0, prepend=zf[:1])), np.abs(np.diff(zf, axis=1, prepend=zf[:, :1])))
    edge = dz > (z.max() - z.min()) * 0.015
    dn = 1 - np.minimum((n * np.roll(n, 1, 0)).sum(2), (n * np.roll(n, 1, 1)).sum(2))
    edge |= (dn > 0.35) & mask
    rgb[edge] *= 0.45
    alpha = mask | edge
    img = np.dstack([rgb * 255, alpha * 255]).astype(np.uint8)
    Image.fromarray(img, "RGBA").resize((size, size), Image.LANCZOS).save(path, "WEBP", quality=84, method=6)


def decimate(m):
    """Reduce triangles, but only accept a result that still matches the original shape."""
    import trimesh, fast_simplification
    target = int(min(40000, max(TARGET_FACES, len(m.faces) * 0.25)))
    while target < len(m.faces) * 0.8:
        v, f = fast_simplification.simplify(m.vertices, m.faces, target_reduction=1 - target / len(m.faces), agg=4)
        d = trimesh.Trimesh(v, f, process=True)
        ok = (abs(d.area - m.area) / m.area < 0.02
              and np.allclose(d.extents, m.extents, rtol=0.01, atol=0.2)
              and (d.is_watertight or not m.is_watertight)
              and len(d.faces) < len(m.faces) * 0.85)
        if ok:
            return d
        target *= 2
    return m.copy()


def fix_draco_ids(path):
    """Rewrite the Draco attribute map of an existing GLB to match the encoded ids."""
    import DracoPy
    b = bytearray(path.read_bytes())
    n = struct.unpack("<I", b[12:16])[0]
    gltf = json.loads(b[20:20 + n])
    bv = gltf["bufferViews"][0]
    start = 20 + n + 8 + bv.get("byteOffset", 0)
    ids = {a["attribute_type"]: a["unique_id"] for a in DracoPy.decode(bytes(b[start:start + bv["byteLength"]])).attributes}
    ext = gltf["meshes"][0]["primitives"][0]["extensions"]["KHR_draco_mesh_compression"]
    ext["attributes"] = {"POSITION": ids[0], "NORMAL": ids[1]}
    js = json.dumps(gltf, separators=(",", ":")).encode()
    js += b" " * ((4 - len(js) % 4) % 4)
    rest = b[20 + n:]
    out = struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(js) + len(rest)) + struct.pack("<II", len(js), 0x4E4F534A) + js + rest
    path.write_bytes(out)


def process_part(key, force):
    import trimesh, fast_simplification
    stl = SRC / f"{key}.stl"
    s = slug(key)
    glb, thumb = OUT / "parts" / f"{s}.glb", OUT / "parts" / f"{s}.webp"
    if not stl.exists():
        print(f"  ! missing {stl.name}")
        return None
    if not force and glb.exists() and thumb.exists() and glb.stat().st_mtime > stl.stat().st_mtime:
        return "cached"
    m = trimesh.load_mesh(stl, process=True)
    orig_faces = len(m.faces)
    dims = (m.bounds[1] - m.bounds[0]).tolist()          # mm, Z-up as exported from Fusion
    v, f = m.vertices, m.faces
    m2 = decimate(m)
    m2.apply_translation(-m2.bounds.mean(0))
    m2.apply_transform(trimesh.transformations.rotation_matrix(-np.pi / 2, [1, 0, 0]))   # Z-up -> Y-up
    m2.apply_scale(0.001)                                                                   # mm -> m
    sm = trimesh.graph.smooth_shade(m2, angle=np.radians(32))
    write_draco_glb(glb, sm.vertices, sm.faces, sm.vertex_normals)
    render_thumb(thumb, sm.vertices, sm.faces, sm.vertex_normals)
    return {"dims": [round(x, 1) for x in dims], "faces": orig_faces}


# ---------------------------------------------------------------- DXF -> SVG
def dxf_to_svg(key, force):
    import ezdxf
    from ezdxf import path as ezpath
    src = SRC / f"{key}.dxf"
    out = OUT / "cuts" / f"{slug(key)}.svg"
    if not src.exists():
        print(f"  ! missing {src.name}")
        return None
    if not force and out.exists() and out.stat().st_mtime > src.stat().st_mtime:
        return "cached"
    doc = ezdxf.readfile(src)
    paths = []
    for e in doc.modelspace():
        try:
            p = ezpath.make_path(e)
        except (TypeError, ValueError):
            continue
        if len(p):
            paths.append(p)
    pts = np.array([(v.x, v.y) for p in paths for v in p.flattening(0.2)])
    lo, hi = pts.min(0), pts.max(0)
    w, h = hi - lo
    ds = []
    for p in paths:
        for sub in p.sub_paths():
            fl = np.array([(v.x, v.y) for v in sub.flattening(0.15)])
            if len(fl) < 2:
                continue
            fl = fl - lo
            fl[:, 1] = h - fl[:, 1]
            d = "M" + " L".join(f"{x:.2f} {y:.2f}" for x, y in fl)
            if sub.is_closed:
                d += " Z"
            ds.append(d)
    pad = max(w, h) * 0.02
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-pad:.1f} {-pad:.1f} {w + 2 * pad:.1f} {h + 2 * pad:.1f}" '
           f'data-w="{w:.1f}" data-h="{h:.1f}" fill="none" stroke="currentColor" stroke-width="{max(w, h) / 320:.2f}" '
           f'stroke-linejoin="round" stroke-linecap="round">' + "".join(f'<path d="{d}"/>' for d in ds) + "</svg>")
    out.write_text(svg, encoding="utf-8")
    return {"dims": [round(w, 1), round(h, 1)], "paths": len(ds)}


def main():
    force = "--force" in sys.argv
    if not SRC.is_dir():
        sys.exit(f'CAD repo not found at {SRC}. Run:  python parts.py --cad "path/to/CogniCare-Assembly-Documentation-2"')
    (OUT / "parts").mkdir(parents=True, exist_ok=True)
    (OUT / "cuts").mkdir(parents=True, exist_ok=True)
    meta_file = HERE / "parts.json"
    meta = json.loads(meta_file.read_text(encoding="utf-8")) if meta_file.exists() else {"printed": {}, "cuts": {}}
    for i, (key, name) in enumerate(PRINTED.items(), 1):
        print(f"[{i}/{len(PRINTED)}] {key}", end="", flush=True)
        r = process_part(key, force or key not in meta["printed"])
        print("" if r != "cached" else "  (cached)")
        if isinstance(r, dict):
            meta["printed"][key] = {"name": name, "slug": slug(key), **r}
        elif r == "cached" and key in meta["printed"]:
            meta["printed"][key]["name"] = name
    for key, name in CUTS.items():
        r = dxf_to_svg(key, force or key not in meta["cuts"])
        if isinstance(r, dict):
            meta["cuts"][key] = {"name": name, "slug": slug(key), **r}
        elif r == "cached" and key in meta["cuts"]:
            meta["cuts"][key]["name"] = name
    meta_file.write_text(json.dumps(meta, indent=1, ensure_ascii=False), encoding="utf-8")
    size = sum(f.stat().st_size for f in (OUT / "parts").glob("*")) / 1e6
    print(f"done: {len(meta['printed'])} parts, {len(meta['cuts'])} boards, {size:.1f} MB in parts/")


if __name__ == "__main__":
    main()
