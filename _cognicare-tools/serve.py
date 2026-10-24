"""Local server for the assembly-guide builder.

Run:  python serve.py      (or double-click start-builder.bat)
Then: http://127.0.0.1:8765/            -> the guide page
      http://127.0.0.1:8765/builder.html -> the step builder

- Serves this tools folder (the builder) and, under /site/, the whole website repo,
  with HTTP Range support so the video can seek.
- PUT /guide.json -> writes guide.json in this folder (the builder autosaves here);
  /site/ shows that live guide.json, so edits appear on the page before you publish.
Only listens on 127.0.0.1 (your machine), never the network.
"""
import http.server
import json
import mimetypes
import os
import re
import shutil
import sys
import webbrowser
from pathlib import Path

HERE = Path(__file__).resolve().parent
SITE = HERE.parent                                  # the website repo this folder lives in
GUIDE_DIR_IN_SITE = "assets/guides/robot-assembly"   # keep in sync with publish.py
PORT = 8765

mimetypes.add_type("video/mp4", ".mp4")
mimetypes.add_type("application/json", ".json")
mimetypes.add_type("model/gltf-binary", ".glb")
mimetypes.add_type("model/gltf+json", ".gltf")
mimetypes.add_type("image/webp", ".webp")


def resolve(url_path):
    """Map a URL path to a file on disk (or None)."""
    p = url_path.split("?", 1)[0].split("#", 1)[0]
    p = re.sub(r"/+", "/", p)
    from urllib.parse import unquote
    p = unquote(p)
    if p.startswith("/site/"):
        rel = p[len("/site/"):]
        # live preview: the page reads the guide.json being edited here
        if rel == f"{GUIDE_DIR_IN_SITE}/guide.json":
            return HERE / "guide.json"
        base, rel_path = SITE, rel
    else:
        base, rel_path = HERE, p.lstrip("/")
    target = (base / rel_path).resolve()
    if base.resolve() not in target.parents and target != base.resolve():
        return None  # path traversal
    if target.is_dir():
        target = target / "index.html"
    return target if target.is_file() else None


class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        if "PUT" in fmt % args or " 4" in fmt % args or " 5" in fmt % args:
            sys.stderr.write("%s\n" % (fmt % args))

    def do_HEAD(self):
        self.do_GET(head_only=True)

    def do_GET(self, head_only=False):
        if self.path.split("?")[0] in ("/", "/site", "/site/"):
            # the CC folder has no homepage; send bare addresses to the guide
            self.send_response(302)
            self.send_header("Location", "/site/project-robot-assembly.html")
            self.end_headers()
            return
        f = resolve(self.path)
        if f is None:
            self.send_error(404)
            return
        size = f.stat().st_size
        ctype = mimetypes.guess_type(str(f))[0] or "application/octet-stream"
        start, end = 0, size - 1
        rng = self.headers.get("Range")
        if rng:
            m = re.match(r"bytes=(\d*)-(\d*)", rng)
            if m:
                if m.group(1):
                    start = int(m.group(1))
                    if m.group(2):
                        end = min(int(m.group(2)), size - 1)
                elif m.group(2):
                    start = max(0, size - int(m.group(2)))
            if start > end or start >= size:
                self.send_response(416)
                self.send_header("Content-Range", f"bytes */{size}")
                self.end_headers()
                return
            self.send_response(206)
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        else:
            self.send_response(200)
        length = end - start + 1
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(length))
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if head_only:
            return
        try:
            with open(f, "rb") as fh:
                fh.seek(start)
                remaining = length
                while remaining > 0:
                    chunk = fh.read(min(1 << 16, remaining))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    remaining -= len(chunk)
        except (ConnectionResetError, BrokenPipeError, ConnectionAbortedError):
            pass  # browser cancelled a video range request; normal

    def do_PUT(self):
        if self.path.split("?")[0] != "/guide.json":
            self.send_error(403)
            return
        length = int(self.headers.get("Content-Length", 0))
        if length > 5_000_000:
            self.send_error(413)
            return
        body = self.rfile.read(length)
        try:
            data = json.loads(body)
        except ValueError:
            self.send_error(400, "invalid JSON")
            return
        target = HERE / "guide.json"
        if target.exists():  # keep one previous copy, just in case
            shutil.copyfile(target, HERE / "guide.backup.json")
        tmp = HERE / "guide.json.tmp"
        tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        os.replace(tmp, target)
        self.send_response(204)
        self.end_headers()


class Server(http.server.ThreadingHTTPServer):
    allow_reuse_address = False   # on Windows, reuse lets two servers share a port and split requests


if __name__ == "__main__":
    port = int(sys.argv[sys.argv.index("--port") + 1]) if "--port" in sys.argv else PORT
    try:
        server = Server(("127.0.0.1", port), Handler)
    except OSError:
        sys.exit(f"Port {port} is already in use - is the builder already open? (or run: python serve.py --port 8766)")
    url = f"http://127.0.0.1:{port}/builder.html"
    print(f"Guide builder running at {url}")
    print(f"Site preview at        http://127.0.0.1:{port}/site/project-robot-assembly.html")
    print("Press Ctrl+C to stop.")
    if "--no-browser" not in sys.argv:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
