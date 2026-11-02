import { useMemo, useRef } from 'react';
import { canvasFont, drawTag } from '../../lab/drawWave';
import { useLabCanvas } from '../../lab/useLabCanvas';
import { GROOVE_STATS } from '../../mix/grooveStats';
import { dbToGain } from '../../mix/mixMath';
import { stemNamed, type StemId } from '../../mix/stems';
import type { Mix } from '../../mix/useMixEngine';

const STRIDE = 12;

/** One stem shows one bar, wide enough to see a hit's height. */
const barSeconds = GROOVE_STATS.seconds / 4;

/** All of a buffer's channels, added and halved to mono. */
function monoOf(buffer: AudioBuffer): Float32Array {
  const out = new Float32Array(buffer.length);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < out.length; i++) {
      out[i] += data[i] / buffer.numberOfChannels;
    }
  }
  return out;
}

/**
 * The groove as a DAW draws a clip: its real waveform, at its real height for the
 * fader settings, between the two lines that mark 0 dBFS. Anything over them is
 * cut flat, as it really is. A faint outline shows it at unity, so that "half as
 * tall" is there to see, and a line follows what's playing.
 */
export function MixWave({
  mix,
  focus,
  gains,
  inputs,
  masterDb,
  accent,
}: {
  mix: Mix;
  /** One stem, or the whole mix through the master. */
  focus: StemId | 'master';
  gains: Readonly<Partial<Record<StemId, number>>>;
  /** Gain before each stem's converter: over 0 dBFS, it stays cut flat. */
  inputs?: Readonly<Partial<Record<StemId, number>>>;
  masterDb: number;
  accent: string;
}) {
  const monos = useMemo(() => {
    const out = new Map<StemId, Float32Array>();
    for (const [id, buffer] of mix.buffers ?? []) out.set(id, monoOf(buffer));
    return out;
  }, [mix.buffers]);

  // One column a pixel, worked out only when something changes.
  const columns = useRef<{
    width: number;
    key: string;
    now: Float32Array;
    unity: Float32Array;
    over: Uint8Array;
  } | null>(null);

  const key = `${focus}|${JSON.stringify(gains)}|${JSON.stringify(inputs)}|${masterDb}|${monos.size}`;
  const keyRef = useRef(key);
  keyRef.current = key;
  const props = useRef({
    focus,
    gains,
    inputs,
    masterDb,
    position: mix.position,
  });
  props.current = { focus, gains, inputs, masterDb, position: mix.position };

  const build = (width: number) => {
    const { focus: f, gains: g, inputs: pre, masterDb: m } = props.current;
    const size = Math.max(1, Math.round(width));
    const now = new Float32Array(size);
    const unity = new Float32Array(size);
    const over = new Uint8Array(size);
    const span = f === 'master' ? 1 : barSeconds / GROOVE_STATS.seconds;
    const length = Math.floor(
      (monos.values().next().value?.length ?? 0) * span,
    );
    if (length) {
      const ids = (f === 'master' ? [...monos.keys()] : [f]) as StemId[];
      const master = f === 'master' ? dbToGain(m) : 1;
      const channels = ids.flatMap((id) => {
        const data = monos.get(id);
        return data
          ? [
              {
                data,
                gain: dbToGain(g[id] ?? 0),
                input: dbToGain(pre?.[id] ?? 0),
              },
            ]
          : [];
      });
      const step = length / size;
      for (let x = 0; x < size; x++) {
        const end = Math.min(length, Math.floor((x + 1) * step));
        let high = 0;
        let highUnity = 0;
        let clipped = false;
        for (let i = Math.floor(x * step); i < end; i += STRIDE) {
          let sum = 0;
          let sumUnity = 0;
          for (const { data, gain, input } of channels) {
            const taken = data[i] * input;
            if (Math.abs(taken) > 1) clipped = true;
            sum += Math.max(-1, Math.min(1, taken)) * gain;
            sumUnity += data[i];
          }
          high = Math.max(high, Math.abs(sum * master));
          highUnity = Math.max(highUnity, Math.abs(sumUnity));
        }
        over[x] = high > 1 || clipped ? 1 : 0;
        now[x] = Math.min(1, high);
        unity[x] = Math.min(1, highUnity);
      }
    }
    columns.current = { width: size, key: keyRef.current, now, unity, over };
  };

  const { canvasRef } = useLabCanvas(
    ({ ctx, width, height }) => {
      if (
        !columns.current ||
        columns.current.width !== Math.round(width) ||
        columns.current.key !== keyRef.current
      ) {
        build(width);
      }
      const data = columns.current;
      if (!data) return;
      const mid = height / 2;
      const reach = (height / 2) * 0.82;

      ctx.fillStyle = 'rgb(255 255 255 / 0.2)';
      for (let x = 0; x < data.width; x++) {
        const h = data.unity[x] * reach;
        ctx.fillRect(x, mid - h, 1, Math.max(1, h * 2));
      }
      for (let x = 0; x < data.width; x++) {
        const h = data.now[x] * reach;
        ctx.fillStyle = data.over[x] ? '#ef4444' : accent;
        ctx.fillRect(x, mid - h, 1, Math.max(1, h * 2));
      }

      // The ceiling, above and below.
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = 'rgb(255 255 255 / 0.4)';
      ctx.lineWidth = 1;
      for (const y of [mid - reach, mid + reach]) {
        ctx.beginPath();
        ctx.moveTo(0, Math.round(y) + 0.5);
        ctx.lineTo(width, Math.round(y) + 0.5);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      const canvas = canvasRef.current;
      if (canvas && width > 340) {
        const label =
          props.current.focus === 'master'
            ? 'Whole mix'
            : stemNamed(props.current.focus).label;
        drawTag(ctx, label, 44, 16, canvasFont(canvas, 0.75), width);
        drawTag(
          ctx,
          '0 dBFS',
          width - 36,
          mid - reach,
          canvasFont(canvas, 0.6875),
          width,
        );
      }

      const at = props.current.position();
      if (at != null) {
        const seconds =
          props.current.focus === 'master' ? GROOVE_STATS.seconds : barSeconds;
        const x = Math.round(((at % seconds) / seconds) * width) + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      }
    },
    { live: true },
  );

  return (
    <div
      className="relative h-[clamp(7rem,20vh,12rem)] overflow-hidden rounded-[1.25rem] border border-white/10 bg-white/[0.02]"
      data-mix-wave={focus}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full"
        role="img"
        aria-label={`The waveform of ${focus === 'master' ? 'the whole mix' : stemNamed(focus).label}`}
      />
    </div>
  );
}
