#!/usr/bin/env bash
# ── The Individual Project's place clips: encoding ─────────────────────────
# Turns record.mjs's recordings into the cards' loops: each subject cropped,
# graded alike (a touch darker and softer, a faint vignette) so the five read
# as one set, and looped without a seam:
#   - a recording whose motion repeats (the Studio's 4-bar loop) is cut to
#     exactly one period;
#   - any other recording keeps 8 s, its last second crossfading into its
#     first, so the loop never jumps;
#   - a still (the portrait) breathes: in and back out over 9 s.
# Writes <out>/<id>.mp4 (H.264, 720 tall, faststart) and <out>/<id>.jpg.
#
#   bash tools/place-clips/encode.sh /tmp/place-clips public/videos/places
#
# Needs ffmpeg and node (for the JSON).

set -euo pipefail
IN=${1:?recordings folder}
OUT=${2:?output folder}
mkdir -p "$OUT"

GRADE="eq=brightness=-0.03:saturation=0.9,vignette=PI/5"
X264=(-an -c:v libx264 -preset slow -crf 25 -pix_fmt yuv420p -movflags +faststart)

field() { node -e "const j=require(process.argv[1]); const v=$2; process.stdout.write(v==null?'':String(v))" "$IN/$1.json"; }

for json in "$IN"/*.json; do
  id=$(basename "$json" .json)
  if [ "$(field "$id" 'j.still')" = "true" ]; then
    # The breath: zoom 1 → 1.06 → 1 on a cosine, centred a little up and
    # right of the middle (a portrait's face). Upscaled first so zoompan's
    # whole-pixel steps don't judder.
    frames=270
    ffmpeg -y -loglevel error -loop 1 -i "$IN/$id.png" -vf \
      "scale=4000:-1,zoompan=z='1+0.06*(1-cos(2*PI*on/$frames))/2':x='(iw-iw/zoom)*0.55':y='(ih-ih/zoom)*0.35':d=1:s=960x960:fps=30,$GRADE" \
      -frames:v $frames "${X264[@]}" "$OUT/$id.mp4"
  else
    start=$(field "$id" 'j.start + 0.6')
    scale=$(field "$id" 'j.scale')
    crop=$(field "$id" '[j.crop.w,j.crop.h,j.crop.x,j.crop.y].map(n=>Math.round(n*j.scale)).join(":")')
    period=$(field "$id" 'j.period')
    base="crop=$crop,scale=-2:720:flags=lanczos,fps=30,$GRADE,setsar=1"
    if [ -n "$period" ]; then
      ffmpeg -y -loglevel error -ss "$start" -t "$period" -i "$IN/$id.webm" \
        -vf "$base" "${X264[@]}" "$OUT/$id.mp4"
    else
      # 9 s in: [1, 9) plays, and its last second dissolves into [0, 1),
      # which ends exactly where the next pass begins.
      ffmpeg -y -loglevel error -ss "$start" -t 9 -i "$IN/$id.webm" -filter_complex \
        "[0:v]$base,split[a][b];[a]trim=1:9,setpts=PTS-STARTPTS[body];[b]trim=0:1,setpts=PTS-STARTPTS[head];[body][head]xfade=transition=fade:duration=1:offset=7,format=yuv420p[v]" \
        -map "[v]" "${X264[@]}" "$OUT/$id.mp4"
    fi
  fi
  ffmpeg -y -loglevel error -ss 0.5 -i "$OUT/$id.mp4" -frames:v 1 -q:v 3 "$OUT/$id.jpg"
  echo "$id $(du -h "$OUT/$id.mp4" | cut -f1)"
done
