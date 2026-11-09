import { useEffect, useMemo, useRef } from 'react';
import { LabSlider } from '../../lab/LabControls';
import { canvasFont, drawTag } from '../../lab/drawWave';
import { useLabCanvas } from '../../lab/useLabCanvas';
import type { FilterSpec } from '../../mix/mixEngine';
import { STEMS, type StemId } from '../../mix/stems';
import type { StageProps } from '../../player/LessonPlayer';
import { Toggle } from '../stage/ChannelStrip';
import {
  BAND_COUNT,
  bandHz,
  bandsOf,
  fingerprint,
  hzToX,
  xToHz,
} from './fingerprint';
import { HP_OFF, type KitScene } from './script';

const LABELS: readonly [number, string][] = [
  [50, '50'],
  [100, '100'],
  [200, '200'],
  [500, '500'],
  [1000, '1k'],
  [2000, '2k'],
  [5000, '5k'],
  [10000, '10k'],
];

const TOP_DB = -8;
const FLOOR_DB = -78;
const AXIS = 22;
/** How fast the live line falls after a hit, in decibels a second. */
const FALL_DB = 45;
/** Where the phone's speaker gives out. */
const PHONE_HZ = 300;

const formatHz = (hz: number) =>
  hz >= 1000
    ? `${(hz / 1000).toFixed(hz >= 10000 ? 0 : 1)} kHz`
    : `${Math.round(hz)} Hz`;

const POSITIONS = 400;

/** Steep enough to hear as a window, rather than a tilt. */
const steep = (type: 'highpass' | 'lowpass', hz: number): FilterSpec[] => [
  { type, hz },
  { type, hz },
];

const monoOf = (buffer: AudioBuffer) => {
  const out = new Float32Array(buffer.length);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < out.length; i++) {
      out[i] += data[i] / buffer.numberOfChannels;
    }
  }
  return out;
};

const STEM_COLORS: Partial<Record<StemId, string>> = {
  kick: '#ffffff',
  bass: '#a78bfa',
};

export function KitStage({
  scene,
  setScene,
  screen,
  accent,
  mix,
  locked,
}: StageProps<KitScene>) {
  useEffect(() => {
    const filters: FilterSpec[] = [];
    if (scene.bandHz != null) {
      filters.push(
        ...steep('highpass', scene.bandHz / 2),
        ...steep('lowpass', scene.bandHz * 2),
      );
    }
    if (scene.hpHz > HP_OFF) filters.push(...steep('highpass', scene.hpHz));
    const overlap = screen.view === 'overlap';
    mix.apply(
      Object.fromEntries(
        STEMS.map((stem) => [
          stem.id,
          {
            solo: overlap
              ? stem.id === 'kick' || stem.id === 'bass'
              : stem.id === scene.solo,
            filters: stem.id === scene.solo ? filters : [],
          },
        ]),
      ),
      {
        filters: scene.phone
          ? [...steep('highpass', PHONE_HZ), { type: 'lowpass', hz: 12000 }]
          : [],
      },
    );
  }, [mix.apply, scene, screen.view]);

  const prints = useMemo(() => {
    const out = new Map<StemId, Float32Array>();
    for (const [id, buffer] of mix.buffers ?? []) {
      out.set(id, fingerprint(monoOf(buffer), buffer.sampleRate));
    }
    return out;
  }, [mix.buffers]);

  const fresh = useRef(new Float32Array(BAND_COUNT).fill(-200));
  const live = useRef(new Float32Array(BAND_COUNT).fill(-200));
  const lastTime = useRef(0);
  const props = useRef({ scene, view: screen.view, spectrum: mix.spectrum });
  props.current = { scene, view: screen.view, spectrum: mix.spectrum };

  const { canvasRef } = useLabCanvas(
    ({ ctx, width, height, time }) => {
      const seconds = Math.max(0, time - lastTime.current);
      lastTime.current = time;
      const { scene: s, view, spectrum } = props.current;
      const plot = height - AXIS;
      const yOf = (db: number) =>
        plot * (1 - (Math.max(FLOOR_DB, db) - FLOOR_DB) / (TOP_DB - FLOOR_DB));
      const xOfBand = (band: number) => hzToX(bandHz(band)) * width;

      // The grid, and the frequencies along the foot.
      ctx.font = canvasFont(canvasRef.current as HTMLCanvasElement, 0.75);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const [hz, label] of LABELS) {
        const x = hzToX(hz) * width;
        ctx.fillStyle = 'rgb(255 255 255 / 0.07)';
        ctx.fillRect(Math.round(x), 0, 1, plot);
        ctx.fillStyle = 'rgb(255 255 255 / 0.55)';
        if (width > 400 || hz !== 2000) ctx.fillText(label, x, plot + AXIS / 2);
      }

      const area = (print: Float32Array, color: string, alpha: number) => {
        ctx.beginPath();
        ctx.moveTo(xOfBand(0), plot);
        for (let b = 0; b < BAND_COUNT; b++) {
          ctx.lineTo(xOfBand(b), yOf(print[b]));
        }
        ctx.lineTo(xOfBand(BAND_COUNT - 1), plot);
        ctx.closePath();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.fill();
        ctx.globalAlpha = 1;
      };

      if (view === 'overlap') {
        for (const id of ['bass', 'kick'] as const) {
          const print = prints.get(id);
          if (print) area(print, STEM_COLORS[id] ?? accent, 0.42);
        }
      } else if (s.solo) {
        const print = prints.get(s.solo);
        if (print) area(print, accent, 0.28);
      }

      // What's really coming out, right now.
      const reading = spectrum();
      if (reading) {
        bandsOf(reading.data, reading.sampleRate, fresh.current);
        for (let b = 0; b < BAND_COUNT; b++) {
          // Smoothed across its neighbours, then falling back rather than
          // vanishing between hits.
          const near =
            (fresh.current[Math.max(0, b - 1)] +
              fresh.current[b] * 2 +
              fresh.current[Math.min(BAND_COUNT - 1, b + 1)]) /
            4;
          live.current[b] = Math.max(near, live.current[b] - FALL_DB * seconds);
        }
        ctx.beginPath();
        for (let b = 0; b < BAND_COUNT; b++) {
          const y = yOf(live.current[b]);
          if (b === 0) ctx.moveTo(xOfBand(b), y);
          else ctx.lineTo(xOfBand(b), y);
        }
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.75;
        ctx.lineJoin = 'round';
        ctx.stroke();
      }

      // The listening window, or what the high-pass has taken.
      const shade = 'rgb(16 16 18 / 0.72)';
      if (s.bandHz != null) {
        const from = hzToX(s.bandHz / 2) * width;
        const to = hzToX(s.bandHz * 2) * width;
        ctx.fillStyle = shade;
        ctx.fillRect(0, 0, from, plot);
        ctx.fillRect(to, 0, width - to, plot);
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2;
        ctx.strokeRect(from, 1, to - from, plot - 2);
        drawTag(
          ctx,
          formatHz(s.bandHz),
          (from + to) / 2,
          15,
          canvasFont(canvasRef.current as HTMLCanvasElement, 0.8125),
          width,
        );
      }
      if (s.hpHz > HP_OFF) {
        const at = hzToX(s.hpHz) * width;
        ctx.fillStyle = shade;
        ctx.fillRect(0, 0, at, plot);
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(at, 0);
        ctx.lineTo(at, plot);
        ctx.stroke();
        drawTag(
          ctx,
          formatHz(s.hpHz),
          at,
          15,
          canvasFont(canvasRef.current as HTMLCanvasElement, 0.8125),
          width,
        );
      }
      if (s.phone) {
        const at = hzToX(PHONE_HZ) * width;
        ctx.fillStyle = shade;
        ctx.fillRect(0, 0, at, plot);
        drawTag(
          ctx,
          'A phone can’t play this',
          at / 2,
          15,
          canvasFont(canvasRef.current as HTMLCanvasElement, 0.8125),
          width,
        );
      }
    },
    { live: true },
  );

  const dragging = useRef(false);
  const place = (clientX: number) => {
    if (locked) return;
    const box = canvasRef.current?.getBoundingClientRect();
    if (!box) return;
    const x = Math.max(0, Math.min(1, (clientX - box.left) / box.width));
    if (screen.view === 'band') {
      setScene({ bandHz: Math.round(Math.max(30, Math.min(xToHz(x), 12000))) });
    } else if (screen.view === 'highpass') {
      setScene({
        hpHz: Math.round(Math.max(HP_OFF, Math.min(xToHz(x), 8000))),
      });
    }
  };
  const draggable = screen.view === 'band' || screen.view === 'highpass';

  // A slider for the keyboard, on the same spacing as the picture.
  const sliderOf = (hz: number) => Math.round(hzToX(hz) * POSITIONS);
  const hzOf = (position: number) => Math.round(xToHz(position / POSITIONS));

  return (
    <div className="flex flex-col gap-3" data-stage="kit">
      <div
        className="relative h-[clamp(10rem,30dvh,18rem)] overflow-hidden rounded-[1.25rem] border border-white/10 bg-white/[0.02]"
        style={draggable && !locked ? { cursor: 'ew-resize' } : undefined}
        onPointerDown={(event) => {
          if (!draggable) return;
          dragging.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          place(event.clientX);
        }}
        onPointerMove={(event) => {
          if (dragging.current) place(event.clientX);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 size-full touch-none"
          role="img"
          aria-label="The sound spread out from low frequencies on the left to high on the right."
        />
        {screen.view === 'overlap' && (
          <div className="absolute right-3 top-2.5 flex gap-3 rounded-full bg-[#101012]/80 px-3 py-1 text-[0.8125rem] text-white">
            {(['kick', 'bass'] as const).map((id) => (
              <span key={id} className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: STEM_COLORS[id] }}
                />
                {id === 'kick' ? 'Kick' : 'Bass'}
              </span>
            ))}
          </div>
        )}
      </div>

      {screen.view === 'pick' && (
        <div
          className="flex flex-wrap justify-center gap-2"
          role="group"
          aria-label="Solo a part"
        >
          {STEMS.map((stem) => (
            <Toggle
              key={stem.id}
              on={scene.solo === stem.id}
              disabled={locked}
              onChange={(on) => setScene({ solo: on ? stem.id : null })}
            >
              {stem.label}
            </Toggle>
          ))}
        </div>
      )}
      {screen.view === 'band' && scene.bandHz != null && (
        <LabSlider
          label="Slide the window"
          min={sliderOf(30)}
          max={sliderOf(12000)}
          step={1}
          value={sliderOf(scene.bandHz)}
          valueText={formatHz(scene.bandHz)}
          accent={accent}
          low="Low"
          high="High"
          onChange={(position) => {
            if (!locked) setScene({ bandHz: hzOf(position) });
          }}
        />
      )}
      {screen.view === 'highpass' && (
        <LabSlider
          label="High-pass frequency"
          min={sliderOf(HP_OFF)}
          max={sliderOf(8000)}
          step={1}
          value={sliderOf(scene.hpHz)}
          valueText={formatHz(scene.hpHz)}
          accent={accent}
          low="Off"
          high="8 kHz"
          onChange={(position) => {
            if (!locked) setScene({ hpHz: hzOf(position) });
          }}
        />
      )}
      {screen.view === 'phone' && (
        <div className="flex justify-center">
          <Toggle
            on={scene.phone}
            disabled={locked}
            onChange={(phone) => setScene({ phone })}
          >
            Phone speaker
          </Toggle>
        </div>
      )}
    </div>
  );
}
