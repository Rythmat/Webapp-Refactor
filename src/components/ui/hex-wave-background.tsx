import { useEffect, useRef } from 'react';

// ── Interactive hex canvas ─────────────────────────────────────────────
// Parses the real hexagons out of an SVG (default public/login-bg.svg) once,
// then renders them on a canvas in their original colours. The cursor
// "paints": as it passes over a colourful-band hex, that hex eases into a
// different colour from the artwork's own palette and *keeps* it. Grey hexes
// never change. With `ambient`, idle hexes also drift to new palette colours
// on their own. Nothing moves for reduced-motion users — the static artwork
// simply shows. The render loop pauses when settled and while the canvas is
// scrolled offscreen (IntersectionObserver).
//
// The auth page additionally calls triggerHexDrain() when the user picks a
// sign-in option, fading every colourful hex out to cream. That behaviour is
// opt-in via the `drain` prop (default true, so auth is unchanged).

// Universal interaction timings (not tied to any particular artwork).
const EASE_MS = 500; // time for a hex to ease into its new colour
const SETTLE_MS = 400; // idle time before the loop pauses to save CPU
const MAX_DT = 64; // clamp per-frame delta so a resumed loop can't jump
const DRAIN_EASE_MS = 180; // quick per-hex fade to cream on sign-in
const DRAIN_STAGGER_MS = 700; // spread over which the hexes flip, one at a time

// Fired by triggerHexDrain() to fade the colourful hexes out to cream
// (e.g. once the user selects a sign-in option).
export const HEX_DRAIN_EVENT = 'auth:hex-drain';
export function triggerHexDrain(): void {
  window.dispatchEvent(new Event(HEX_DRAIN_EVENT));
}

// HSL saturation of a #rgb / #rrggbb colour (0 = grey, 1 = vivid).
function saturation(hex: string): number {
  let x = hex.replace('#', '');
  if (x.length === 3) x = x[0] + x[0] + x[1] + x[1] + x[2] + x[2];
  const r = parseInt(x.slice(0, 2), 16) / 255;
  const g = parseInt(x.slice(2, 4), 16) / 255;
  const b = parseInt(x.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const l = (max + min) / 2;
  return (max - min) / (1 - Math.abs(2 * l - 1));
}

// #rgb / #rrggbb → [r, g, b] in 0..255.
function toRgb(hex: string): [number, number, number] {
  let x = hex.replace('#', '');
  if (x.length === 3) x = x[0] + x[0] + x[1] + x[1] + x[2] + x[2];
  return [
    parseInt(x.slice(0, 2), 16),
    parseInt(x.slice(2, 4), 16),
    parseInt(x.slice(4, 6), 16),
  ];
}

// Pick a random palette colour, avoiding `avoid` so the change is visible.
function pickColour(
  palette: [number, number, number][],
  avoid: [number, number, number],
): [number, number, number] {
  let idx = (Math.random() * palette.length) | 0;
  let c = palette[idx];
  if (
    palette.length > 1 &&
    c[0] === avoid[0] &&
    c[1] === avoid[1] &&
    c[2] === avoid[2]
  ) {
    idx = (idx + 1) % palette.length;
    c = palette[idx];
  }
  return c;
}

// Fixed geometry of one hexagon slot.
type Geo = {
  pts: [number, number][];
  cx: number;
  cy: number;
};

// Parsed, ready-to-render artwork.
type Scene = {
  geos: Geo[];
  animated: boolean[]; // true for the colourful-band hexes that can be painted
  baseStr: string[]; // original fill per hex (grey hexes + untouched state)
  palette: [number, number, number][]; // colours a painted hex can take
  fromRGB: [number, number, number][]; // colour at the start of the current ease
  toRGB: [number, number, number][]; // committed target colour (stays)
  prog: number[]; // 0..1 ease progress; 1 = settled on the target
  inside: boolean[]; // was the cursor within the brush last frame?
  delay: number[]; // ms left before this hex starts its drain-to-cream ease
  viewW: number; // artwork viewBox width (for cover-fit + drain sweep)
  viewH: number; // artwork viewBox height
};

// Read the SVG's own viewBox so any artwork scales correctly. Falls back to
// the width/height attributes, then to the login-bg 3840×2160 default.
function readViewBox(doc: Document): { viewW: number; viewH: number } {
  const root = doc.documentElement;
  const vb = root.getAttribute('viewBox');
  if (vb) {
    const p = vb
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    if (p.length === 4 && p[2] > 0 && p[3] > 0) {
      return { viewW: p[2], viewH: p[3] };
    }
  }
  const wa = parseFloat(root.getAttribute('width') || '');
  const ha = parseFloat(root.getAttribute('height') || '');
  if (wa > 0 && ha > 0) return { viewW: wa, viewH: ha };
  return { viewW: 3840, viewH: 2160 };
}

function parseSvg(
  svgText: string,
  colorThreshold: number,
  paintColors?: string[],
): Scene {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const { viewW, viewH } = readViewBox(doc);
  // When an explicit paint list is given, a hex is paintable iff its fill is in
  // it (overriding the saturation cutoff) — lets low-saturation "pastel" colours
  // be interactive while a more-saturated colour stays a calm background.
  const paintSet =
    paintColors && paintColors.length
      ? new Set(paintColors.map((c) => c.toLowerCase()))
      : null;
  const polys = Array.from(doc.querySelectorAll('polygon'));
  const geos: Geo[] = [];
  const animated: boolean[] = [];
  const baseStr: string[] = [];
  const baseRGB: [number, number, number][] = [];
  const palette: [number, number, number][] = []; // the colourful fills
  for (const poly of polys) {
    const raw = poly.getAttribute('points');
    const fill = poly.getAttribute('fill');
    if (!raw || !fill) continue;
    const pts: [number, number][] = [];
    let sx = 0;
    let sy = 0;
    for (const pair of raw.trim().split(/\s+/)) {
      const [px, py] = pair.split(',').map(Number);
      if (Number.isNaN(px) || Number.isNaN(py)) continue;
      pts.push([px, py]);
      sx += px;
      sy += py;
    }
    if (pts.length < 3) continue;
    const rgb = toRgb(fill);
    const isColour = paintSet
      ? paintSet.has(fill.toLowerCase())
      : saturation(fill) >= colorThreshold;
    geos.push({ pts, cx: sx / pts.length, cy: sy / pts.length });
    animated.push(isColour);
    baseStr.push(fill);
    baseRGB.push(rgb);
    if (isColour) palette.push(rgb);
  }
  // Every hex starts settled on its original colour; the cursor commits new
  // targets as it paints (grey hexes are never painted).
  const fromRGB = baseRGB.map(
    (c) => [c[0], c[1], c[2]] as [number, number, number],
  );
  const toRGB = baseRGB.map(
    (c) => [c[0], c[1], c[2]] as [number, number, number],
  );
  const prog = new Array(geos.length).fill(1);
  const inside = new Array(geos.length).fill(false);
  const delay = new Array(geos.length).fill(0);
  return {
    geos,
    animated,
    baseStr,
    palette,
    fromRGB,
    toRGB,
    prog,
    inside,
    delay,
    viewW,
    viewH,
  };
}

export interface HexWaveBackgroundProps {
  /** SVG artwork to parse. Default keeps auth behaviour. */
  src?: string;
  /** Register the sign-in drain listener. Auth = true; Home = false. */
  drain?: boolean;
  /** Canvas element classes (position + z-index). */
  className?: string;
  /** Solid fill drawn behind the hexes each frame. */
  backgroundColor?: string;
  /** Saturation cutoff for a hex to be paintable (higher = fewer hexes). */
  colorThreshold?: number;
  /** Explicit list of paintable fill colours. When provided, overrides
   *  colorThreshold — a hex paints iff its fill is in this list (case-insensitive).
   *  Lets low-saturation pastels be interactive. Use a stable reference. */
  paintColors?: string[];
  /** Cursor brush radius, in screen px. */
  brushRadius?: number;
  /** Drift random hexes to new palette colours while idle. */
  ambient?: boolean;
  /** ms between ambient recolours. */
  ambientIntervalMs?: number;
}

export function HexWaveBackground({
  src = '/login-bg.svg',
  drain = true,
  className = 'pointer-events-none absolute inset-0 -z-10',
  backgroundColor = '#b8b6b6',
  colorThreshold = 0.1,
  paintColors,
  brushRadius = 140,
  ambient = false,
  ambientIntervalMs = 450,
}: HexWaveBackgroundProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    let mounted = true;
    let animId = 0;
    let scene: Scene | null = null;
    let w = 0;
    let h = 0;
    let rect = canvas.getBoundingClientRect();

    // Pointer state (canvas-relative CSS px) + loop bookkeeping.
    let ptrX = 0;
    let ptrY = 0;
    let hasPtr = false; // has the pointer ever moved over the page?
    let moved = false; // did the pointer move since the last frame?
    let paused = true; // no RAF running until something needs to animate
    let prev = -1; // previous frame timestamp (-1 = first frame)
    let lastMove = -1; // frame timestamp when the pointer last moved
    let drained = false; // has the sign-in drain-to-cream been triggered?
    let drainPending = false; // drain requested before the artwork finished loading
    let visible = true; // is the canvas within the viewport?
    let ambientAcc = 0; // accumulated ms toward the next ambient recolour

    const controller = new AbortController();

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const parent = canvas!.parentElement;
      w = parent ? parent.clientWidth : window.innerWidth;
      h = parent ? parent.clientHeight : window.innerHeight;
      canvas!.width = Math.max(1, Math.round(w * dpr));
      canvas!.height = Math.max(1, Math.round(h * dpr));
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      rect = canvas!.getBoundingClientRect();
      // Repaint the current (committed) frame when we're not animating.
      if (scene && paused) renderFrame(0, false);
    }

    // Trace one hexagon's path, enlarged ~2% about its centroid to overlap
    // the hairline seams between neighbouring hexes.
    function tracePath(geo: Geo, scale: number, offX: number, offY: number) {
      ctx!.beginPath();
      for (let k = 0; k < geo.pts.length; k++) {
        const ex = geo.cx + (geo.pts[k][0] - geo.cx) * 1.02;
        const ey = geo.cy + (geo.pts[k][1] - geo.cy) * 1.02;
        const px = ex * scale + offX;
        const py = ey * scale + offY;
        if (k === 0) ctx!.moveTo(px, py);
        else ctx!.lineTo(px, py);
      }
      ctx!.closePath();
    }

    // Cover-fit the artwork's viewBox into the current canvas size.
    function fit(): { scale: number; offX: number; offY: number } {
      const vw = scene ? scene.viewW : 3840;
      const vh = scene ? scene.viewH : 2160;
      const scale = Math.max(w / vw, h / vh);
      return {
        scale,
        offX: (w - vw * scale) / 2,
        offY: (h - vh * scale) / 2,
      };
    }

    // Commit a fresh palette colour on hex i, easing from whatever is shown now.
    function recolour(i: number) {
      const { fromRGB, toRGB, prog, palette } = scene!;
      const from = fromRGB[i];
      const to = toRGB[i];
      const p = prog[i];
      const shown: [number, number, number] = [
        (from[0] + (to[0] - from[0]) * p) | 0,
        (from[1] + (to[1] - from[1]) * p) | 0,
        (from[2] + (to[2] - from[2]) * p) | 0,
      ];
      fromRGB[i] = shown;
      toRGB[i] = pickColour(palette, shown);
      prog[i] = 0;
    }

    // Ambient drift: every ambientIntervalMs, nudge a random paintable hex.
    function ambientStep(dt: number) {
      if (!scene || scene.palette.length === 0) return;
      const { animated } = scene;
      ambientAcc += dt;
      while (ambientAcc >= ambientIntervalMs) {
        ambientAcc -= ambientIntervalMs;
        for (let tries = 0; tries < 8; tries++) {
          const i = (Math.random() * animated.length) | 0;
          if (animated[i]) {
            recolour(i);
            break;
          }
        }
      }
    }

    // Render one frame. When the cursor crosses into a colourful hex it
    // commits a fresh palette colour; each hex then eases toward its
    // committed colour and *stays* there. Returns true while any hex is
    // still easing (so the loop keeps running until everything settles).
    function renderFrame(dt: number, boost: boolean): boolean {
      if (!scene) return false;
      const {
        geos,
        animated,
        baseStr,
        palette,
        fromRGB,
        toRGB,
        prog,
        inside,
        delay,
      } = scene;
      const { scale, offX, offY } = fit();
      const dur = drained ? DRAIN_EASE_MS : EASE_MS;
      const step = dur > 0 ? dt / dur : 1;
      const R2 = brushRadius * brushRadius;

      ctx!.fillStyle = backgroundColor;
      ctx!.fillRect(0, 0, w, h);

      let any = false;
      for (let i = 0; i < geos.length; i++) {
        const geo = geos[i];
        if (!animated[i]) {
          ctx!.fillStyle = baseStr[i]; // grey hexes never change
          tracePath(geo, scale, offX, offY);
          ctx!.fill();
          continue;
        }

        let p = prog[i];
        // Cursor painting is disabled once the sign-in drain has begun.
        if (boost && hasPtr && !drained && palette.length > 0) {
          const dx = geo.cx * scale + offX - ptrX;
          const dy = geo.cy * scale + offY - ptrY;
          const nowInside = dx * dx + dy * dy < R2;
          // Commit a new colour only as the brush *enters* the hex, so it
          // changes once per pass instead of flickering every frame.
          if (nowInside && !inside[i]) {
            recolour(i);
            p = 0;
          }
          inside[i] = nowInside;
        }
        if (drained && delay[i] > 0) {
          // Not this hex's turn yet — hold its colour until the stagger elapses.
          delay[i] -= dt;
          any = true;
        } else if (p < 1) {
          p = p + step;
          if (p > 1) p = 1;
          any = true;
        }
        prog[i] = p;

        const [r0, g0, b0] = fromRGB[i];
        const [r1, g1, b1] = toRGB[i];
        const r = (r0 + (r1 - r0) * p) | 0;
        const g = (g0 + (g1 - g0) * p) | 0;
        const b = (b0 + (b1 - b0) * p) | 0;
        ctx!.fillStyle = `rgb(${r},${g},${b})`;
        tracePath(geo, scale, offX, offY);
        ctx!.fill();
      }
      return any;
    }

    // Freeze every colourful hex, then fade it to cream (#efebe6), one at a time.
    function drainToCream() {
      if (!scene) {
        drainPending = true; // apply once the artwork has loaded
        return;
      }
      if (drained) return;
      drained = true;
      const { geos, animated, fromRGB, toRGB, prog, delay, viewW } = scene;
      for (let i = 0; i < geos.length; i++) {
        if (!animated[i]) continue;
        // Freeze the colour on screen now as the ease start…
        const from = fromRGB[i];
        const to = toRGB[i];
        const p = prog[i];
        fromRGB[i] = [
          (from[0] + (to[0] - from[0]) * p) | 0,
          (from[1] + (to[1] - from[1]) * p) | 0,
          (from[2] + (to[2] - from[2]) * p) | 0,
        ];
        toRGB[i] = [0xef, 0xeb, 0xe6]; // …then fade to #efebe6
        // Left-to-right sweep (+ jitter) so the hexes flip one at a time.
        delay[i] = reduceMotion
          ? 0
          : (geos[i].cx / viewW) * DRAIN_STAGGER_MS + Math.random() * 80;
        prog[i] = reduceMotion ? 1 : 0;
      }
      // Painting is over — grey artwork with the drained hexes turned cream.
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', onScroll);
      if (reduceMotion) {
        renderFrame(0, false); // snap to cream with no animation
      } else if (paused) {
        paused = false;
        prev = -1;
        animId = requestAnimationFrame(loop);
      }
    }

    // True while the canvas should keep animating on its own (ambient drift).
    function ambientActive(): boolean {
      return ambient && !drained && !reduceMotion && visible;
    }

    const loop = (t: number) => {
      if (!visible) {
        paused = true;
        prev = -1;
        return;
      }
      if (moved) {
        lastMove = t;
        moved = false;
      }
      const dt = prev < 0 ? 0 : Math.min(MAX_DT, t - prev);
      prev = t;
      if (ambientActive()) ambientStep(dt);
      const any = renderFrame(dt, true);
      // Settle only when nothing is easing, no ambient drift is due, and the
      // pointer has been idle (or the drain has finished).
      const idle =
        !any &&
        !ambientActive() &&
        (drained || lastMove < 0 || t - lastMove > SETTLE_MS);
      if (idle) {
        paused = true;
        prev = -1;
        return;
      }
      animId = requestAnimationFrame(loop);
    };

    function wake() {
      if (paused) {
        paused = false;
        prev = -1;
        animId = requestAnimationFrame(loop);
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!visible) return;
      // Recompute the rect each move so the cursor→hex mapping survives the
      // dashboard's nested scroll container (a window 'scroll' won't fire).
      rect = canvas!.getBoundingClientRect();
      ptrX = e.clientX - rect.left;
      ptrY = e.clientY - rect.top;
      hasPtr = true;
      moved = true;
      wake();
    };

    const onScroll = () => {
      rect = canvas!.getBoundingClientRect();
    };

    // Pause the loop entirely while the canvas is scrolled offscreen; resume
    // (for ambient drift) when it returns.
    const io =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            (entries) => {
              visible = entries[0]?.isIntersecting ?? true;
              if (visible) {
                if (scene && ambientActive()) wake();
              } else {
                paused = true;
                cancelAnimationFrame(animId);
                prev = -1;
              }
            },
            { threshold: 0 },
          )
        : null;
    io?.observe(canvas);

    resize();
    window.addEventListener('resize', resize);
    if (drain) window.addEventListener(HEX_DRAIN_EVENT, drainToCream);

    const onSvgText = (text: string) => {
      if (!mounted) return;
      scene = parseSvg(text, colorThreshold, paintColors);
      renderFrame(0, false); // draw the artwork in its original colours
      if (drainPending) {
        drainToCream(); // sign-in happened before the artwork loaded
        return;
      }
      if (reduceMotion) return; // static, no cursor interaction
      window.addEventListener('pointermove', onPointerMove, {
        passive: true,
      });
      window.addEventListener('scroll', onScroll, { passive: true });
      if (ambientActive()) wake(); // start drifting on its own
    };

    if (src.trimStart().startsWith('<svg')) {
      // Inline SVG markup (e.g. a generated Studio-project tile) — parse it
      // directly; `fetch` can't load a raw string / data URI.
      onSvgText(src);
    } else {
      fetch(src, { signal: controller.signal })
        .then((r) => r.text())
        .then(onSvgText)
        .catch((err) => {
          if (err?.name !== 'AbortError') {
            console.error(`HexWaveBackground: failed to load ${src}`, err);
          }
        });
    }

    return () => {
      mounted = false;
      controller.abort();
      cancelAnimationFrame(animId);
      io?.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener(HEX_DRAIN_EVENT, drainToCream);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', onScroll);
    };
  }, [
    src,
    drain,
    backgroundColor,
    colorThreshold,
    paintColors,
    brushRadius,
    ambient,
    ambientIntervalMs,
  ]);

  return <canvas ref={canvasRef} className={className} />;
}
