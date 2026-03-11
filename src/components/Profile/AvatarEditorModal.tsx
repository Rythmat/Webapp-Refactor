/* eslint-disable react/jsx-sort-props, tailwindcss/classnames-order */
import React, { useCallback, useState } from 'react';
import { HexAvatarSVG } from '@/components/ui/HexAvatarSVG';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  type AvatarConfig,
  type NoiseType,
  NOISE_TYPES,
  NOISE_LABELS,
  PALETTE_COUNT,
  getPaletteColors,
  randomizeConfig,
} from '@/lib/avatarHexGrid';

interface AvatarEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialConfig: AvatarConfig;
  onSave: (config: AvatarConfig) => void;
}

// ---------------------------------------------------------------------------
// Slider row
// ---------------------------------------------------------------------------

const SliderRow: React.FC<{
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const AvatarEditorModal: React.FC<AvatarEditorModalProps> = ({
  open,
  onOpenChange,
  initialConfig,
  onSave,
}) => {
  const [config, setConfig] = useState<AvatarConfig>(initialConfig);

  const update = useCallback(
    (partial: Partial<AvatarConfig>) =>
      setConfig((prev) => ({ ...prev, ...partial })),
    [],
  );

  const handleRandomize = useCallback(() => {
    setConfig(randomizeConfig());
  }, []);

  const handleSave = useCallback(() => {
    onSave(config);
    onOpenChange(false);
  }, [config, onSave, onOpenChange]);

  // Current palette colors
  const paletteColors = getPaletteColors(config.paletteIndex);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl"
        style={{
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: 'var(--color-text)' }}>
            Edit Avatar
          </DialogTitle>
          <DialogDescription>
            Customize your hexagon avatar pattern
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Preview */}
          <div className="flex flex-col items-center gap-3">
            <div
              className="overflow-hidden rounded-full"
              style={{ border: '3px solid var(--color-accent)' }}
            >
              <HexAvatarSVG config={config} size={200} circular />
            </div>
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

          {/* Controls */}
          <div className="flex flex-col gap-4">
            {/* Noise type */}
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
                        config.noiseType === nt
                          ? 'rgba(126,207,207,0.15)'
                          : 'rgba(255,255,255,0.04)',
                      border:
                        config.noiseType === nt
                          ? '1px solid #7ecfcf'
                          : '1px solid var(--color-border)',
                      color:
                        config.noiseType === nt
                          ? '#7ecfcf'
                          : 'var(--color-text-dim)',
                    }}
                  >
                    {NOISE_LABELS[nt]}
                  </button>
                ))}
              </div>
            </div>

            {/* Palette */}
            <div>
              <span
                className="mb-1.5 block text-xs font-medium"
                style={{ color: 'var(--color-text-dim)' }}
              >
                Palette ({config.paletteIndex + 1}/{PALETTE_COUNT})
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    update({
                      paletteIndex:
                        (config.paletteIndex - 1 + PALETTE_COUNT) %
                        PALETTE_COUNT,
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
                      paletteIndex: (config.paletteIndex + 1) % PALETTE_COUNT,
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
                onClick={() => update({ isGradient: !config.isGradient })}
                className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-100"
                style={{
                  background: config.isGradient
                    ? 'rgba(126,207,207,0.15)'
                    : 'rgba(255,255,255,0.04)',
                  border: config.isGradient
                    ? '1px solid #7ecfcf'
                    : '1px solid var(--color-border)',
                  color: config.isGradient
                    ? '#7ecfcf'
                    : 'var(--color-text-dim)',
                }}
              >
                Gradient
              </button>
              <button
                type="button"
                onClick={() =>
                  update({
                    orientation:
                      config.orientation === 'pointy' ? 'flat' : 'pointy',
                  })
                }
                className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-100"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-dim)',
                }}
              >
                {config.orientation === 'pointy' ? 'Pointy' : 'Flat'}
              </button>
            </div>

            {/* Sliders */}
            <div className="flex flex-col gap-2">
              <SliderRow
                label="Cell Size"
                value={config.cellSize}
                min={2}
                max={8}
                onChange={(v) => update({ cellSize: v })}
              />
              <SliderRow
                label="Zoom"
                value={config.zoom}
                min={5}
                max={20}
                onChange={(v) => update({ zoom: v })}
              />
              <SliderRow
                label="Hue"
                value={config.hueShift}
                min={-30}
                max={30}
                onChange={(v) => update({ hueShift: v })}
              />
              <SliderRow
                label="Saturation"
                value={config.saturationShift}
                min={-20}
                max={20}
                onChange={(v) => update({ saturationShift: v })}
              />
              <SliderRow
                label="Lightness"
                value={config.lightnessShift}
                min={-20}
                max={20}
                onChange={(v) => update({ lightnessShift: v })}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg px-4 py-2 text-sm transition-colors duration-150"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-dim)',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg px-4 py-2 text-sm font-semibold transition-colors duration-150"
            style={{
              background: '#7ecfcf',
              color: '#191919',
            }}
          >
            Save
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
