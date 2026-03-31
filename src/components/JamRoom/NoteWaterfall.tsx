// ── Note Waterfall ────────────────────────────────────────────────────────
// Canvas-based falling-note visualization for the Jam Room.
// Colored bars grow upward from each key while held, then scroll away.

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

// ── Public API ───────────────────────────────────────────────────────────

export interface WaterfallHandle {
  noteOn(midi: number, color: string): void;
  noteOff(midi: number): void;
  /** Spawn white particles across the waterfall (hi-hat effect). */
  spawnParticles(): void;
  /** Spawn shatter shards that explode outward (snare effect). */
  spawnShatter(): void;
  /** Set white glow intensity (0–1) for drum flash on note outlines. */
  setDrumFlash(intensity: number): void;
  /** Sync gradient animation speed to sequencer BPM. */
  setBpm(bpm: number): void;
}

// ── Internal types ───────────────────────────────────────────────────────

interface FallingNote {
  midi: number;
  color: string;
  startTime: number;
  endTime: number | null; // null = still held
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

interface Shard {
  cx: number; cy: number;       // origin (spawn point)
  x: number;  y: number;        // offset from origin
  vx: number; vy: number;       // velocity px/ms
  rotation: number;              // radians
  rotationSpeed: number;         // radians/ms
  size: number;
  life: number; maxLife: number;
  // 4 polygon vertices as [x0,y0, x1,y1, x2,y2, x3,y3] normalized 0–1
  poly: number[];
}

interface KeyLayout {
  x: number; // fractional multiplier (multiply by whiteKeyWidth at draw time)
  barWidth: number; // fractional multiplier
  isBlack: boolean;
}

interface NoteWaterfallProps {
  startMidi: number;
  endMidi: number;
}

// ── Constants ────────────────────────────────────────────────────────────

const SCROLL_SPEED = 0.12; // px per ms (~120 px/sec)
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const BLACK_SET = new Set([1, 3, 6, 8, 10]); // semitone indices that are black keys
const RAINBOW = [
  '#D2404A', '#FF7348', '#FEA92A', '#FFCB30', '#AED580', '#7FC783',
  '#28A69A', '#62B4F7', '#7885CB', '#9D7FCE', '#C785D3', '#F8A8C5',
];
const GRADIENT_REBUILD_INTERVAL = 50; // ms — rebuild gradient at 20fps, not 60

// ── Helpers ──────────────────────────────────────────────────────────────

function isBlack(midi: number) {
  return BLACK_SET.has(midi % 12);
}

function countWhiteKeys(start: number, end: number) {
  let count = 0;
  for (let m = start; m <= end; m++) {
    if (!isBlack(m)) count++;
  }
  return count;
}

/** Pre-compute layout for each MIDI note in range. Values are in whiteKeyWidth units. */
function buildKeyLayout(start: number, end: number): Map<number, KeyLayout> {
  const layout = new Map<number, KeyLayout>();
  let whiteIdx = 0;
  for (let m = start; m <= end; m++) {
    const black = isBlack(m);
    if (!black) {
      layout.set(m, { x: whiteIdx + 1 / whiteIdx, barWidth: 1, isBlack: false });
      // Will normalize below
      whiteIdx++;
    }
  }
  // Second pass: set proper x values and handle black keys
  whiteIdx = 0;
  for (let m = start; m <= end; m++) {
    const black = isBlack(m);
    if (!black) {
      // x = whiteIdx (in white-key units), barWidth = 1 white key minus 2px gap (handled at draw time)
      layout.set(m, { x: whiteIdx, barWidth: 1, isBlack: false });
      whiteIdx++;
    } else {
      // Black key sits at whiteIdx-1 + 0.65, width = 0.6
      layout.set(m, { x: whiteIdx - 1 + 0.65, barWidth: 0.6, isBlack: true });
    }
  }
  return layout;
}

// ── Component ────────────────────────────────────────────────────────────

export const NoteWaterfall = forwardRef<WaterfallHandle, NoteWaterfallProps>(
  function NoteWaterfall({ startMidi, endMidi }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const notesRef = useRef<FallingNote[]>([]);
    const particlesRef = useRef<Particle[]>([]);
    const shardsRef = useRef<Shard[]>([]);
    const lastShatterRef = useRef<{ x: number; y: number } | null>(null);
    const animRef = useRef(0);
    const drumFlashRef = useRef(0);
    const bpmRef = useRef(100);
    const lastFrameRef = useRef(0);

    // Imperative API — called by JamRoom for both local and remote notes
    useImperativeHandle(ref, () => ({
      noteOn(midi: number, color: string) {
        notesRef.current.push({
          midi,
          color,
          startTime: performance.now(),
          endTime: null,
        });
      },
      noteOff(midi: number) {
        const now = performance.now();
        for (let i = notesRef.current.length - 1; i >= 0; i--) {
          const n = notesRef.current[i];
          if (n.midi === midi && n.endTime === null) {
            n.endTime = now;
            break;
          }
        }
      },
      spawnParticles() {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        for (let i = 0; i < 25; i++) {
          const maxLife = 400 + Math.random() * 400;
          particlesRef.current.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 0.08,
            vy: -(0.04 + Math.random() * 0.08),
            life: maxLife,
            maxLife,
            size: 0.8 + Math.random() * 1.2,
          });
        }
      },
      spawnShatter() {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        // Pick a random position that's far from the last shatter
        let cx: number, cy: number;
        const minDist = Math.min(w, h) * 0.3;
        let attempts = 0;
        do {
          cx = Math.random() * w;
          cy = Math.random() * h;
          attempts++;
          if (!lastShatterRef.current || attempts > 10) break;
          const dx = cx - lastShatterRef.current.x;
          const dy = cy - lastShatterRef.current.y;
          if (Math.sqrt(dx * dx + dy * dy) >= minDist) break;
        // eslint-disable-next-line no-constant-condition
        } while (true);
        lastShatterRef.current = { x: cx, y: cy };
        const count = 35;
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
          const speed = 0.2 + Math.random() * 0.3; // px/ms
          const maxLife = 900 + Math.random() * 300;
          shardsRef.current.push({
            cx, cy,
            x: 0, y: 0,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            rotation: 0,
            rotationSpeed: (Math.random() - 0.5) * 0.02, // radians/ms
            size: 2 + Math.random() * 6,
            life: maxLife,
            maxLife,
            poly: [
              Math.random() * 0.5, 0,
              1, Math.random() * 0.5,
              0.5 + Math.random() * 0.5, 1,
              0, 0.5 + Math.random() * 0.5,
            ],
          });
        }
        // Shockwave: push existing hi-hat particles away from shatter origin
        const maxRadius = 250;
        for (const p of particlesRef.current) {
          const dx = p.x - cx;
          const dy = p.y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxRadius && dist > 1) {
            const force = (1 - dist / maxRadius) * 0.3;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
            p.life = Math.min(p.life + 200, p.maxLife);
          }
        }
      },
      setDrumFlash(intensity: number) {
        drumFlashRef.current = intensity;
      },
      setBpm(bpm: number) {
        bpmRef.current = bpm;
      },
    }));

    // ── Render loop ────────────────────────────────────────────────────

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const numWhite = countWhiteKeys(startMidi, endMidi);
      const keyLayout = buildKeyLayout(startMidi, endMidi);

      // Cached gradient state
      let cachedGrad: CanvasGradient | null = null;
      let cachedGradH = 0;
      let cachedGradTime = 0;

      const render = () => {
        const now = performance.now();
        const dt = lastFrameRef.current ? now - lastFrameRef.current : 16;
        lastFrameRef.current = now;

        const w = canvas.clientWidth;
        const h = canvas.clientHeight;

        // HiDPI
        const dpr = window.devicePixelRatio || 1;
        if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
          canvas.width = w * dpr;
          canvas.height = h * dpr;
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          cachedGrad = null; // invalidate on resize
        }

        ctx.clearRect(0, 0, w, h);

        const whiteKeyWidth = w / numWhite;

        // Prune notes that have scrolled off the top
        notesRef.current = notesRef.current.filter((note) => {
          if (note.endTime === null) return true;
          const bottomY = h - (now - note.endTime) * SCROLL_SPEED;
          return bottomY > -h;
        });

        // Rebuild rainbow gradient at reduced frequency
        if (!cachedGrad || cachedGradH !== h || now - cachedGradTime > GRADIENT_REBUILD_INTERVAL) {
          const cycleMs = (60 / bpmRef.current) * 8 * 1000; // two bars = one full rainbow cycle
          const t = (now % cycleMs) / cycleMs;
          const grad = ctx.createLinearGradient(0, 0, 0, h);
          // Build sorted stops
          const stops: { pos: number; color: string }[] = [];
          for (let i = 0; i < RAINBOW.length; i++) {
            stops.push({ pos: ((i / RAINBOW.length) + t) % 1, color: RAINBOW[i] });
          }
          stops.sort((a, b) => a.pos - b.pos);
          grad.addColorStop(0, stops[0].color);
          for (let i = 0; i < stops.length; i++) grad.addColorStop(stops[i].pos, stops[i].color);
          grad.addColorStop(1, stops[stops.length - 1].color);
          cachedGrad = grad;
          cachedGradH = h;
          cachedGradTime = now;
        }

        const flash = drumFlashRef.current;

        // Draw notes
        for (const note of notesRef.current) {
          if (note.midi < startMidi || note.midi > endMidi) continue;

          const layout = keyLayout.get(note.midi);
          if (!layout) continue;

          // X position & width from pre-computed layout
          let x: number;
          let barWidth: number;
          if (!layout.isBlack) {
            x = layout.x * whiteKeyWidth + 1;
            barWidth = whiteKeyWidth - 2;
          } else {
            x = layout.x * whiteKeyWidth;
            barWidth = layout.barWidth * whiteKeyWidth;
          }

          // Y position
          const duration = ((note.endTime ?? now) - note.startTime) * SCROLL_SPEED;
          let bottomY: number;
          let topY: number;

          if (note.endTime === null) {
            bottomY = h;
            topY = h - duration;
          } else {
            const sinceRelease = (now - note.endTime) * SCROLL_SPEED;
            bottomY = h - sinceRelease;
            topY = bottomY - duration;
          }

          const drawTop = Math.max(0, topY);
          const drawBottom = Math.min(h, bottomY);
          if (drawBottom <= drawTop) continue;

          const barH = drawBottom - drawTop;
          const radius = Math.min(barWidth / 2, 4);

          // Fill bar — shared animated rainbow
          ctx.globalAlpha = 0.8;
          ctx.fillStyle = cachedGrad;
          ctx.beginPath();
          ctx.roundRect(x, drawTop, barWidth, barH, radius);
          ctx.fill();

          // Subtle inner glow at the bottom edge — simplified (no per-note gradient)
          if (barH > 6) {
            const glowH = Math.min(12, barH);
            ctx.globalAlpha = 0.25;
            ctx.fillStyle = 'rgba(255,255,255,1)';
            ctx.fillRect(x, drawBottom - glowH, barWidth, glowH);
          }

          // Note name label above the bar
          if (barH > 10 && drawTop > 12) {
            const noteName = NOTE_NAMES[note.midi % 12];
            const octave = Math.floor(note.midi / 12) - 1;
            ctx.globalAlpha = 0.9;
            ctx.fillStyle = note.color;
            ctx.font = '9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`${noteName}${octave}`, x + barWidth / 2, drawTop - 3);
          }

          // Drum flash — white stroke outline on note bars (no shadowBlur)
          if (flash > 0) {
            ctx.globalAlpha = flash;
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(x, drawTop, barWidth, barH, radius);
            ctx.stroke();
          }

          ctx.globalAlpha = 1;
        }

        // ── Particles (hi-hat effect) ───────────────────────────────
        if (particlesRef.current.length > 0) {
          particlesRef.current = particlesRef.current.filter((p) => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            return p.life > 0;
          });

          ctx.fillStyle = 'white';
          for (const p of particlesRef.current) {
            ctx.globalAlpha = (p.life / p.maxLife) * 0.8;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }

        // ── Shards (snare shatter effect) ────────────────────────────
        if (shardsRef.current.length > 0) {
          shardsRef.current = shardsRef.current.filter((s) => {
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            s.rotation += s.rotationSpeed * dt;
            s.life -= dt;
            return s.life > 0;
          });

          ctx.fillStyle = 'white';
          for (const s of shardsRef.current) {
            const progress = s.life / s.maxLife;
            ctx.globalAlpha = progress;
            ctx.save();
            ctx.translate(s.cx + s.x, s.cy + s.y);
            ctx.rotate(s.rotation);
            ctx.scale(0.5 + progress * 0.5, 0.5 + progress * 0.5); // shrink as it fades
            const sz = s.size;
            ctx.beginPath();
            ctx.moveTo(s.poly[0] * sz - sz / 2, s.poly[1] * sz - sz / 2);
            ctx.lineTo(s.poly[2] * sz - sz / 2, s.poly[3] * sz - sz / 2);
            ctx.lineTo(s.poly[4] * sz - sz / 2, s.poly[5] * sz - sz / 2);
            ctx.lineTo(s.poly[6] * sz - sz / 2, s.poly[7] * sz - sz / 2);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
          ctx.globalAlpha = 1;
        }

        animRef.current = requestAnimationFrame(render);
      };

      animRef.current = requestAnimationFrame(render);
      return () => cancelAnimationFrame(animRef.current);
    }, [startMidi, endMidi]);

    return (
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
    );
  },
);
