"""Make the Library's project covers from the owner's GIF folder.

  python3 -I tools/project-covers/convert_covers.py ~/Pictures/gifs \
    public/covers/projects /tmp/manifest.json

Needs ffmpeg and libwebp's tools (brew install ffmpeg webp). The manifest's
ids, credits and colours go into src/features/library/projectCovers.ts.

Each source becomes, in OUT:
  <id>.webp   animated, lossy, 320px on its short side (shown cropped square)
  <id>.jpg    its first frame, for reduced motion and light lists
and a manifest (MANIFEST) with each one's id, credit and average colour.
The sources are only read.
"""

import json
import os
import re
import subprocess
import sys
import tempfile

SRC, OUT, MANIFEST = sys.argv[1], sys.argv[2], sys.argv[3]
SIZE = 320
os.makedirs(OUT, exist_ok=True)


def run(*args):
    subprocess.run(args, check=True, capture_output=True)


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def parse(name):
    """'Art Love GIF by dualvoidanima.gif' -> ('dualvoidanima-art-love', 'dualvoidanima')."""
    stem = os.path.splitext(name)[0]
    m = re.match(r"^(.*?)\s*GIF(?: by (.+?))?\s*(\(\d+\)|\d+|copy)?$", stem)
    if m:
        title, credit, n = m.group(1).strip(), m.group(2), m.group(3)
    else:
        title, credit, n = stem, None, None
    if credit:
        credit = re.sub(r"\s+(\(\d+\)|copy|\d+)$", "", credit.strip())
        tail = re.search(r"(\(\d+\)|copy|\s\d+)$", stem)
        n = n or (tail.group(1) if tail else None)
    parts = [credit or "", title or "untitled"]
    base = slug(" ".join(p for p in parts if p)) or "untitled"
    return base, credit, n


def avg_colour(path):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-frames:v", "1", "-vf",
         "scale=1:1:flags=area", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        check=True, capture_output=True,
    ).stdout
    return "#%02x%02x%02x" % tuple(raw[:3])


scale = (
    f"scale='if(lt(iw,ih),{SIZE},-2)':'if(lt(iw,ih),-2,{SIZE})':flags=lanczos"
)
covers, used = [], {}
for name in sorted(os.listdir(SRC)):
    path = os.path.join(SRC, name)
    ext = os.path.splitext(name)[1].lower()
    if ext not in (".gif", ".webp"):
        continue
    base, credit, _ = parse(name)
    if base == "gif":
        base = "untitled"
    used[base] = used.get(base, 0) + 1
    cid = base if used[base] == 1 else f"{base}-{used[base]}"
    webp, jpg = os.path.join(OUT, cid + ".webp"), os.path.join(OUT, cid + ".jpg")
    with tempfile.TemporaryDirectory() as tmp:
        if ext == ".gif":
            small = os.path.join(tmp, "small.gif")
            run("ffmpeg", "-v", "error", "-y", "-i", path, "-filter_complex",
                f"[0:v]{scale},split[a][b];[a]palettegen=stats_mode=diff[p];"
                "[b][p]paletteuse=dither=bayer:bayer_scale=4", small)
            run("gif2webp", "-lossy", "-q", "70", "-m", "6", "-mt", small, "-o", webp)
            # Still heavy: a smaller, softer pass (a cover shows at ~210px).
            if os.path.getsize(webp) > 900 * 1024:
                smaller = scale.replace(str(SIZE), "280")
                run("ffmpeg", "-v", "error", "-y", "-i", path, "-filter_complex",
                    f"[0:v]{smaller},split[a][b];[a]palettegen=stats_mode=diff[p];"
                    "[b][p]paletteuse=dither=bayer:bayer_scale=4", small)
                run("gif2webp", "-lossy", "-q", "50", "-m", "6", "-mt", small, "-o", webp)
            first = path
        else:
            # An animated WebP: no tool here resizes one; it ships as it is.
            run("cp", path, webp)
            frame = os.path.join(tmp, "f1.webp")
            png = os.path.join(tmp, "f1.png")
            run("webpmux", "-get", "frame", "1", path, "-o", frame)
            run("dwebp", frame, "-o", png)
            first = png
        run("ffmpeg", "-v", "error", "-y", "-i", first, "-frames:v", "1",
            "-vf", scale, "-q:v", "4", jpg)
        colour = avg_colour(first)
    covers.append({
        "id": cid,
        "source": name,
        "credit": credit,
        "colour": colour,
        "kb": round(os.path.getsize(webp) / 1024),
    })
    print(f"{cid:45} {covers[-1]['kb']:5} KB  {credit or '-'}")

with open(MANIFEST, "w") as f:
    json.dump(covers, f, indent=2)
print("total", sum(c["kb"] for c in covers), "KB")
