import { useEffect, useMemo, useRef } from 'react';
import { AnatomyStage } from '@/curriculum/anatomy/AnatomyStage';
import { compile } from '@/curriculum/anatomy/compileCore';
import { MICROPHONE_MODEL } from '@/curriculum/anatomy/microphoneModel';
import { LabSlider } from '../../lab/LabControls';
import { canvasFont } from '../../lab/drawWave';
import { useLabCanvas } from '../../lab/useLabCanvas';
import type { MeterPoint } from '../../mix/mixEngine';
import { renderedRmsDb } from '../../mix/mixMath';
import { stemNamed } from '../../mix/stems';
import type { Mix } from '../../mix/useMixEngine';
import type { StageProps } from '../../player/LessonPlayer';
import { formatDb, useHeldPeak } from '../stage/ChannelStrip';
import { MixWave } from '../stage/MixWave';
import {
  MODEL_PEAK,
  peakOf,
  TARGET_HIGH,
  TARGET_LOW,
  type GainScene,
} from './script';

const MIC = compile(MICROPHONE_MODEL, false);

const FLOOR = -60;
const TOP = 6;
const MARKS = [-48, -36, -24, -18, -10, 0];
/** Where matched playback sits. */
const MATCH_RMS_DB = -30;

const inputOf = (scene: GainScene) =>
  peakOf(scene) - stemNamed(scene.stem).peakDb;

/** A wide meter with the target marked on it. */
function TargetMeter({
  mix,
  point,
  trackDb,
  resetKey,
  showTarget,
  accent,
}: {
  mix: Mix;
  point: MeterPoint;
  trackDb?: number;
  resetKey?: string;
  showTarget: boolean;
  accent: string;
}) {
  const read = useHeldPeak({ mix, point, trackDb, resetKey });
  const last = useRef(0);
  const target = useRef({ showTarget, accent });
  target.current = { showTarget, accent };

  const { canvasRef } = useLabCanvas(
    ({ ctx, width, height, time }) => {
      const seconds = Math.max(0, time - last.current);
      last.current = time;
      const { levelDb, heldDb, held, over, playing } = read(seconds);
      const canvas = canvasRef.current as HTMLCanvasElement;
      const axis = 20;
      const bar = height - axis;
      const xOf = (db: number) =>
        Math.max(0, Math.min(1, (db - FLOOR) / (TOP - FLOOR))) * width;

      ctx.fillStyle = 'rgb(255 255 255 / 0.07)';
      ctx.fillRect(0, 0, width, bar);
      if (target.current.showTarget) {
        ctx.fillStyle = `${target.current.accent}55`;
        ctx.fillRect(
          xOf(TARGET_LOW),
          0,
          xOf(TARGET_HIGH) - xOf(TARGET_LOW),
          bar,
        );
      }
      ctx.fillStyle = 'rgb(239 68 68 / 0.28)';
      ctx.fillRect(xOf(0), 0, width - xOf(0), bar);

      if (levelDb > FLOOR) {
        const end = xOf(levelDb);
        ctx.fillStyle = '#34d399';
        ctx.fillRect(0, bar * 0.28, Math.min(end, xOf(-3)), bar * 0.44);
        if (levelDb > -3) {
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(
            xOf(-3),
            bar * 0.28,
            Math.min(end, xOf(0)) - xOf(-3),
            bar * 0.44,
          );
        }
        if (levelDb > 0) {
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(xOf(0), bar * 0.28, end - xOf(0), bar * 0.44);
        }
      }
      if (heldDb > FLOOR) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(xOf(heldDb)), 0, 2, bar);
      }
      ctx.fillStyle = over ? '#ef4444' : 'rgb(255 255 255 / 0.12)';
      ctx.fillRect(width - 8, 0, 8, bar);

      ctx.font = canvasFont(canvas, 0.75);
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      for (const mark of MARKS) {
        ctx.fillStyle = 'rgb(255 255 255 / 0.55)';
        ctx.fillText(mark === 0 ? '0' : `−${-mark}`, xOf(mark), bar + axis / 2);
      }

      canvas.dataset.meterDb = Number.isFinite(heldDb)
        ? heldDb.toFixed(2)
        : '-inf';
      canvas.dataset.over = String(over);
      const label =
        canvas.parentElement?.querySelector<HTMLElement>('[data-meter-value]');
      if (label) {
        label.textContent =
          playing && held > 1e-4 ? `${formatDb(heldDb)} dBFS` : '—';
      }
    },
    { live: true },
  );

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3 text-[0.8125rem] text-white/55">
        <span>{showTarget ? 'At the converter' : 'Playback'}</span>
        <span
          data-meter-value
          aria-hidden
          className="text-[0.9375rem] font-bold tabular-nums text-white"
        >
          —
        </span>
      </div>
      <canvas ref={canvasRef} className="h-14 w-full rounded-lg" aria-hidden />
    </div>
  );
}

function ChainStep({
  title,
  value,
  lit,
}: {
  title: string;
  value: string;
  lit?: boolean;
}) {
  return (
    <div
      className="min-w-0 flex-1 rounded-xl border px-3 py-2"
      style={{
        borderColor: lit
          ? 'rgb(255 255 255 / 0.45)'
          : 'rgb(255 255 255 / 0.12)',
      }}
    >
      <p className="truncate text-[0.8125rem] text-white/55">{title}</p>
      <p className="truncate text-[0.9375rem] font-bold tabular-nums text-white">
        {value}
      </p>
    </div>
  );
}

export function GainStage({
  scene,
  setScene,
  screen,
  accent,
  mix,
  locked,
  onIdentify,
}: StageProps<GainScene>) {
  const channel = useMemo(
    () => mix.buffers?.get(scene.stem)?.getChannelData(0) ?? null,
    [mix.buffers, scene.stem],
  );
  const inputDb = inputOf(scene);
  const faderDb = useMemo(() => {
    if (!scene.matched || !channel) return scene.fader;
    return MATCH_RMS_DB - renderedRmsDb(channel, inputDb, true);
  }, [channel, inputDb, scene.fader, scene.matched]);

  useEffect(() => {
    // Past the target, it's the student's own ears getting the extra.
    const monitorDb = scene.matched
      ? 0
      : -Math.max(0, peakOf(scene) + faderDb - TARGET_HIGH) * 0.7;
    mix.apply(
      {
        snare: {
          solo: scene.stem === 'snare',
          inputDb: scene.stem === 'snare' ? inputDb : 0,
          faderDb: scene.stem === 'snare' ? faderDb : 0,
        },
        kick: {
          solo: scene.stem === 'kick',
          inputDb: scene.stem === 'kick' ? inputDb : 0,
          faderDb: scene.stem === 'kick' ? faderDb : 0,
        },
        bass: {
          solo: scene.stem === 'bass',
          inputDb: scene.stem === 'bass' ? inputDb : 0,
          faderDb: scene.stem === 'bass' ? faderDb : 0,
        },
      },
      { monitorDb },
    );
  }, [faderDb, inputDb, mix.apply, scene]);

  if (screen.view === 'mic' || screen.view === 'mic-coil') {
    let term: string | null = null;
    if (screen.kind === 'anatomy') {
      term =
        screen.mode === 'show' ? screen.term : locked ? screen.target : null;
    } else if (screen.view === 'mic-coil') term = 'voiceCoil';
    const finding = screen.kind === 'anatomy' && screen.mode === 'identify';
    const head = ['grille', 'windscreen', 'diaphragm', 'voiceCoil', 'magnet'];
    return (
      <AnatomyStage
        model={MIC}
        term={term}
        apart={screen.kind === 'hook' ? 0 : 1}
        locked={locked}
        onPressTerm={finding ? onIdentify : undefined}
        listLabel={finding ? 'Choose from a list' : undefined}
        focus={finding ? head : undefined}
      />
    );
  }

  const blind = screen.view === 'blind';
  const takeOnly = screen.view === 'take';
  const stemLabel = stemNamed(scene.stem).label;
  return (
    <div className="flex flex-col gap-3" data-stage="chain">
      {(!blind || locked) && (
        <MixWave
          mix={mix}
          focus={scene.stem}
          gains={{ [scene.stem]: faderDb }}
          inputs={{ [scene.stem]: inputDb }}
          masterDb={0}
          accent={accent}
        />
      )}
      {!blind && !takeOnly && (
        <div className="flex items-stretch gap-2">
          <ChainStep
            title={stemLabel}
            value={`${formatDb(MODEL_PEAK[scene.stem]).replace('.0', '')} dBFS`}
          />
          <ChainStep title="Preamp" value={`+${scene.gain} dB`} lit />
          <ChainStep
            title="Converter"
            value={`${formatDb(peakOf(scene)).replace('.0', '')} dBFS`}
          />
        </div>
      )}
      {!blind && !takeOnly && (
        <LabSlider
          label="Preamp gain"
          min={0}
          max={60}
          step={1}
          value={scene.gain}
          valueText={`${scene.gain} decibels of gain`}
          accent={accent}
          low="0"
          high="+60"
          onChange={(gain) => {
            if (!locked) setScene({ gain });
          }}
        />
      )}
      {!takeOnly && (!blind || locked) && (
        <TargetMeter
          mix={mix}
          point={
            blind
              ? { stem: scene.stem, at: 'output' }
              : { stem: scene.stem, at: 'input' }
          }
          trackDb={blind ? undefined : scene.gain}
          resetKey={blind ? JSON.stringify(scene) : scene.stem}
          showTarget={!blind}
          accent={accent}
        />
      )}
    </div>
  );
}
