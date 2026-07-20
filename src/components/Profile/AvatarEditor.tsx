import { Shuffle } from 'lucide-react';
import { type FC } from 'react';
import {
  type AvatarConfig,
  PALETTE_COUNT,
  getPaletteColors,
} from '@/lib/avatarHexGrid';

interface AvatarEditorProps {
  value: AvatarConfig;
  onChange: (next: AvatarConfig) => void;
  className?: string;
}

const pillClass =
  'flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-colors duration-150 hover:brightness-125';
const pillStyle = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-text-dim)',
} as const;

/**
 * Inline avatar editor — five full-width hex colour selectors that drive the
 * avatar's palette, plus a randomize pill. Edits auto-persist via the parent's
 * debounced saveConfig.
 */
export const AvatarEditor: FC<AvatarEditorProps> = ({
  value,
  onChange,
  className,
}) => {
  // The five active colours: the custom override if set, else the current preset.
  const base = value.paletteOverride ?? getPaletteColors(value.paletteIndex);
  const colors = Array.from({ length: 5 }, (_, i) => base[i] ?? '#000000');

  const setColor = (index: number, hex: string) => {
    onChange({
      ...value,
      paletteOverride: colors.map((c, i) => (i === index ? hex : c)),
    });
  };

  const handleRandomize = () => {
    // Change only the colours — keep the hex pattern + cell size. Pick a
    // different preset palette (never the current one) and drop any override.
    const offset = 1 + Math.floor(Math.random() * (PALETTE_COUNT - 1));
    onChange({
      ...value,
      paletteIndex: (value.paletteIndex + offset) % PALETTE_COUNT,
      paletteOverride: undefined,
    });
  };

  return (
    <div className={`flex flex-col gap-4 ${className || ''}`}>
      {/* Five hex colour selectors */}
      <div>
        <span
          className="mb-2 block text-xs font-medium"
          style={{ color: 'var(--color-text-dim)' }}
        >
          Colors
        </span>
        <div className="flex flex-col gap-2">
          {colors.map((c, i) => (
            <label
              // eslint-disable-next-line react/no-array-index-key
              key={i}
              className="relative h-9 w-full cursor-pointer rounded-lg shadow-inner"
              style={{ background: c, border: '1px solid var(--color-border)' }}
              title={c}
            >
              <input
                type="color"
                value={c}
                onChange={(e) => setColor(i, e.target.value)}
                className="absolute inset-0 size-full cursor-pointer opacity-0"
                aria-label={`Color ${i + 1}`}
              />
            </label>
          ))}
        </div>
      </div>

      {/* Randomize */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleRandomize}
          className={pillClass}
          style={pillStyle}
        >
          <Shuffle size={13} />
          Randomize
        </button>
      </div>
    </div>
  );
};
