/* eslint-disable react/jsx-sort-props, tailwindcss/classnames-order */
import { type FC, useCallback } from 'react';
import {
  type AvatarConfig,
  type NoiseType,
  NOISE_LABELS,
  NOISE_TYPES,
  PALETTE_COUNT,
  getPaletteColors,
  randomizeConfig,
} from '@/lib/avatarHexGrid';

interface AvatarEditorProps {
  value: AvatarConfig;
  onChange: (next: AvatarConfig) => void;
  className?: string;
}

const SliderRow: FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, step = 1, onChange }) => (
  <div className="flex items-center gap-3">
    <span
      className="w-24 shrink-0 text-xs"
      style={{ color: 'var(--color-text-dim)' }}
    >
      {label}
    </span>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-1 flex-1 cursor-pointer appearance-none rounded-full"
      style={{ accentColor: '#7ecfcf', background: 'rgba(255,255,255,0.1)' }}
    />
    <span
      className="w-8 text-right text-xs tabular-nums"
      style={{ color: 'var(--color-text-dim)' }}
    >
      {value}
    </span>
  </div>
);

/**
 * Inline avatar editor — controls only, no Dialog wrapper, no Save/Cancel.
 * The parent renders the preview + auto-persists via a debounced saveConfig.
 */
export const AvatarEditor: FC<AvatarEditorProps> = ({
  value,
  onChange,
  className,
}) => {
  const update = useCallback(
    (partial: Partial<AvatarConfig>) => onChange({ ...value, ...partial }),
    [value, onChange],
  );

  const handleRandomize = useCallback(() => {
    onChange(randomizeConfig());
  }, [onChange]);

  const paletteColors = getPaletteColors(value.paletteIndex);

  return (
    <div className={`flex flex-col gap-4 ${className || ''}`}>
      {/* Pattern picker */}
      <div>
        <span
          className="mb-1.5 block text-xs font-medium"
          style={{ color: 'var(--color-text-dim)' }}
        >
          Pattern
        </span>
        <div className="flex flex-wrap gap-1.5">
          {NOISE_TYPES.map((nt: NoiseType) => (
            <button
              key={nt}
              type="button"
              onClick={() => update({ noiseType: nt })}
              className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-100"
              style={{
                background:
                  value.noiseType === nt
                    ? 'rgba(126,207,207,0.15)'
                    : 'rgba(255,255,255,0.04)',
                border:
                  value.noiseType === nt
                    ? '1px solid #7ecfcf'
                    : '1px solid var(--color-border)',
                color:
                  value.noiseType === nt ? '#7ecfcf' : 'var(--color-text-dim)',
              }}
            >
              {NOISE_LABELS[nt]}
            </button>
          ))}
        </div>
      </div>

      {/* Palette picker */}
      <div>
        <span
          className="mb-1.5 block text-xs font-medium"
          style={{ color: 'var(--color-text-dim)' }}
        >
          Palette ({value.paletteIndex + 1}/{PALETTE_COUNT})
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              update({
                paletteIndex:
                  (value.paletteIndex - 1 + PALETTE_COUNT) % PALETTE_COUNT,
              })
            }
            className="rounded px-2 py-1 text-xs"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-dim)',
            }}
          >
            &#9664;
          </button>
          <div className="flex flex-1 gap-1">
            {paletteColors.map((c, i) => (
              <div
                key={i}
                className="h-6 flex-1 rounded"
                style={{ background: c }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              update({
                paletteIndex: (value.paletteIndex + 1) % PALETTE_COUNT,
              })
            }
            className="rounded px-2 py-1 text-xs"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-dim)',
            }}
          >
            &#9654;
          </button>
        </div>
      </div>

      {/* Toggles */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => update({ isGradient: !value.isGradient })}
          className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-100"
          style={{
            background: value.isGradient
              ? 'rgba(126,207,207,0.15)'
              : 'rgba(255,255,255,0.04)',
            border: value.isGradient
              ? '1px solid #7ecfcf'
              : '1px solid var(--color-border)',
            color: value.isGradient ? '#7ecfcf' : 'var(--color-text-dim)',
          }}
        >
          Gradient
        </button>
        <button
          type="button"
          onClick={() =>
            update({
              orientation: value.orientation === 'pointy' ? 'flat' : 'pointy',
            })
          }
          className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-100"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-dim)',
          }}
        >
          {value.orientation === 'pointy' ? 'Pointy' : 'Flat'}
        </button>
      </div>

      {/* Sliders */}
      <div className="flex flex-col gap-2">
        <SliderRow
          label="Cell Size"
          value={value.cellSize}
          min={2}
          max={8}
          onChange={(v) => update({ cellSize: v })}
        />
        <SliderRow
          label="Zoom"
          value={value.zoom}
          min={5}
          max={20}
          onChange={(v) => update({ zoom: v })}
        />
        <SliderRow
          label="Hue"
          value={value.hueShift}
          min={-30}
          max={30}
          onChange={(v) => update({ hueShift: v })}
        />
        <SliderRow
          label="Saturation"
          value={value.saturationShift}
          min={-20}
          max={20}
          onChange={(v) => update({ saturationShift: v })}
        />
        <SliderRow
          label="Lightness"
          value={value.lightnessShift}
          min={-20}
          max={20}
          onChange={(v) => update({ lightnessShift: v })}
        />
      </div>

      {/* Randomize */}
      <div>
        <button
          type="button"
          onClick={handleRandomize}
          className="rounded-full px-4 py-1.5 text-xs font-medium transition-colors duration-150"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-dim)',
          }}
        >
          Randomize
        </button>
      </div>
    </div>
  );
};
