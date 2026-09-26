/**
 * SlideAppearanceMenu — editor-only per-slide appearance control (accent color +
 * phase-label visibility). A palette trigger pinned top-right of the canvas opens
 * a portal popover (AddSlideMenu recipe, so it escapes the canvas overflow):
 * preset accent swatches + a custom color + reset-to-default, the LAYOUT PRESET
 * picker, and a "Show phase label" switch. All write through the deck autosave
 * via `onPatch`.
 *
 * The preset list is filtered to the presets legal for this slide's kind: a
 * preset that authors middle-band content would suppress the live layer on an
 * interaction or showcase slide, leaving a student with no way to answer. That
 * rule is `LIVE_LAYER_KINDS`/`bandFree` in `templates/presets.ts` and is
 * asserted per preset in `presets.test.ts`.
 */
import { Check, Palette, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Switch } from '@/components/ui/switch';
import { KEY_OF_COLORS } from '@/constants/theme';
import { PHASE_ACCENT_HEX } from '../../presentation/phaseAccent';
import { showsPhaseChip } from '../../slides/deck';
import { PRESET_LIST, presetFor } from '../../slides/templates/presets';
import type { Slide } from '../../slides/types';

// The 12 circle-of-fifths key colors (C, G, D, A, E, B, F#, Db, Ab, Eb, Bb, F) —
// the same palette the app's musical ColorPicker uses.
const SWATCHES = Object.entries(KEY_OF_COLORS) as [string, string][];

interface SlideAppearanceMenuProps {
  slide: Slide;
  onPatch: (patch: Partial<Slide>) => void;
}

export const SlideAppearanceMenu = ({
  slide,
  onPatch,
}: SlideAppearanceMenuProps) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
    }
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const current = slide.accent ?? PHASE_ACCENT_HEX[slide.phase];

  return (
    <div className="absolute right-3 top-3 z-20">
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-label="Slide appearance"
        className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-sm text-white/80 backdrop-blur hover:border-white/30 hover:text-white"
      >
        <Palette className="h-4 w-4" />
        <span
          aria-hidden
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: current }}
        />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-50 w-64 rounded-2xl border border-white/10 bg-neutral-950 p-4 shadow-2xl"
            style={{ top: pos.top, right: pos.right }}
          >
            <p className="mb-2 text-xs uppercase tracking-wider text-white/40">
              Accent
            </p>
            <div className="flex flex-wrap gap-2">
              {SWATCHES.map(([keyName, hex]) => (
                <button
                  key={keyName}
                  type="button"
                  onClick={() => onPatch({ accent: hex })}
                  aria-label={`Accent — key of ${keyName}`}
                  title={`Key of ${keyName}`}
                  className={`grid h-7 w-7 place-items-center rounded-full ring-2 ring-offset-2 ring-offset-neutral-950 ${
                    slide.accent === hex ? 'ring-white' : 'ring-transparent'
                  }`}
                  style={{ backgroundColor: hex }}
                >
                  {slide.accent === hex && (
                    <Check className="h-3.5 w-3.5 text-black" />
                  )}
                </button>
              ))}
              <label
                aria-label="Custom accent color"
                className="relative grid h-7 w-7 cursor-pointer place-items-center overflow-hidden rounded-full border border-white/20"
                style={{
                  background:
                    'conic-gradient(red,orange,yellow,lime,cyan,blue,magenta,red)',
                }}
              >
                <input
                  type="color"
                  value={current}
                  onChange={(e) => onPatch({ accent: e.target.value })}
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={() => onPatch({ accent: undefined })}
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white"
            >
              <RotateCcw className="h-3 w-3" />
              Reset to phase default
            </button>

            {/*
              Layout preset — P2 task 8's "Reset to standard".
              Because elements are DERIVED, switching preset is a one-field
              write: `resetToPreset` sets `presetId`, drops any stored rects and
              syncs the accent-bar flag, and the next render re-derives every
              zone from it. There is no element list to rewrite and nothing to
              migrate, which is the whole reason the derived model was chosen.
            */}
            <div className="mt-4 border-t border-white/10 pt-3">
              <p className="mb-2 text-xs uppercase tracking-wider text-white/40">
                Layout
              </p>
              <select
                aria-label="Slide layout preset"
                value={slide.presetId ?? ''}
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id) {
                    // "Automatic" — no preset; the migration derives zones from
                    // the slide's own shape, which is what a legacy slide does.
                    onPatch({ presetId: undefined, accentBar: undefined });
                    return;
                  }
                  const preset = presetFor(id);
                  onPatch({
                    presetId: id,
                    accentBar: preset?.accentBar ? true : undefined,
                  });
                }}
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white/85"
              >
                <option value="">Automatic</option>
                {PRESET_LIST.filter((preset) =>
                  preset.kinds.includes(slide.kind),
                ).map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-[11px] leading-snug text-white/35">
                Presets that would cover a question or a shared project are not
                offered for this slide.
              </p>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
              <span className="text-sm text-white/80">Show phase label</span>
              <Switch
                checked={showsPhaseChip(slide)}
                onCheckedChange={(v) =>
                  // Showing the chip is the default, so record it by CLEARING
                  // the flag rather than writing `false` — the stored slide
                  // stays minimal and `showsPhaseChip` is the only reader.
                  onPatch({ hidePhaseLabel: v ? undefined : true })
                }
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};
