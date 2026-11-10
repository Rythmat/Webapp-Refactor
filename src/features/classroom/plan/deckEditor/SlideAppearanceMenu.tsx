/**
 * SlideAppearanceMenu — editor-only per-slide appearance: the accent colour
 * (the accent bar), the layout preset and whether the section label shows.
 * A pill pinned top-right of the canvas opens the Studio's popover; every
 * change writes through the deck autosave via `onPatch`.
 *
 * The preset list is filtered to the presets legal for this slide's kind: a
 * preset that authors middle-band content would suppress the live layer on an
 * interaction or showcase slide, leaving a student with no way to answer. That
 * rule is `LIVE_LAYER_KINDS`/`bandFree` in `templates/presets.ts` and is
 * asserted per preset in `presets.test.ts`.
 */
import { Check, Palette, RotateCcw } from 'lucide-react';
import { MicroLabel } from '@/components/kit';
import { KEY_OF_COLORS } from '@/constants/theme';
import { Button } from '@/daw/ui/Button';
import { Popover, PopoverContent, PopoverTrigger } from '@/daw/ui/Popover';
import { Segmented } from '@/daw/ui/Segmented';
import { Select } from '@/daw/ui/Select';
import { showsPhaseChip } from '../../slides/deck';
import { PRESET_LIST, presetFor } from '../../slides/templates/presets';
import type { Slide } from '../../slides/types';

// The 12 circle-of-fifths key colors (C, G, D, A, E, B, F#, Db, Ab, Eb, Bb, F) —
// the same palette the app's musical ColorPicker uses.
const SWATCHES = Object.entries(KEY_OF_COLORS) as [string, string][];

/** "Automatic" has no preset id; Select needs a value for it. */
const AUTOMATIC = 'automatic';

interface SlideAppearanceMenuProps {
  slide: Slide;
  onPatch: (patch: Partial<Slide>) => void;
}

export const SlideAppearanceMenu = ({
  slide,
  onPatch,
}: SlideAppearanceMenuProps) => {
  const current = slide.accent ?? '#ffffff';
  const presets = PRESET_LIST.filter((preset) =>
    preset.kinds.includes(slide.kind),
  );

  return (
    <div className="absolute right-3 top-3 z-20">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="pill" size="pill" aria-label="Slide appearance">
            <Palette aria-hidden />
            <span
              aria-hidden
              className="size-3 rounded-full border border-white/20"
              style={{ backgroundColor: current }}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="flex w-72 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <MicroLabel>Accent</MicroLabel>
            <div className="flex flex-wrap gap-2">
              {SWATCHES.map(([keyName, hex]) => (
                <button
                  key={keyName}
                  type="button"
                  onClick={() => onPatch({ accent: hex })}
                  aria-label={`Accent: key of ${keyName}`}
                  aria-pressed={slide.accent === hex}
                  title={`Key of ${keyName}`}
                  className={`grid size-7 place-items-center rounded-full ring-2 ring-offset-2 ring-offset-daw-float ${
                    slide.accent === hex ? 'ring-white' : 'ring-transparent'
                  }`}
                  style={{ backgroundColor: hex }}
                >
                  {slide.accent === hex && (
                    <Check aria-hidden className="size-3.5 text-black" />
                  )}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 text-[0.8125rem] text-daw-text-2 hover:text-daw-text">
                <span
                  aria-hidden
                  className="size-4 rounded-full border border-white/20"
                  style={{ backgroundColor: current }}
                />
                Custom colour
                <input
                  type="color"
                  value={current}
                  onChange={(e) => onPatch({ accent: e.target.value })}
                  className="sr-only"
                />
              </label>
              <Button
                variant="quiet"
                size="sm"
                onClick={() => onPatch({ accent: undefined })}
                disabled={!slide.accent}
              >
                <RotateCcw aria-hidden />
                White
              </Button>
            </div>
          </div>

          {/*
            Layout preset. Because elements are DERIVED, switching preset is a
            one-field write: `presetId` (and the accent-bar flag it implies),
            and the next render re-derives every zone from it.
          */}
          <div className="flex flex-col gap-2 border-t border-daw-edge pt-3">
            <MicroLabel>Layout</MicroLabel>
            <Select
              label="Slide layout preset"
              value={slide.presetId ?? AUTOMATIC}
              onValueChange={(id) => {
                if (id === AUTOMATIC) {
                  // No preset: the migration derives zones from the slide's
                  // own shape, which is what a legacy slide does.
                  onPatch({ presetId: undefined, accentBar: undefined });
                  return;
                }
                const preset = presetFor(id);
                onPatch({
                  presetId: id,
                  accentBar: preset?.accentBar ? true : undefined,
                });
              }}
              options={[
                { value: AUTOMATIC, label: 'Automatic' },
                ...presets.map((p) => ({ value: p.id, label: p.label })),
              ]}
            />
            <p className="text-[0.75rem] leading-snug text-daw-text-3">
              Layouts that would cover a question or a shared project are not
              offered for this slide.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-daw-edge pt-3">
            <span className="text-[0.8125rem] text-daw-text">
              Section label
            </span>
            <Segmented
              label="Section label"
              value={showsPhaseChip(slide) ? 'show' : 'hide'}
              onValueChange={(v) =>
                // Showing is the default, so record it by CLEARING the flag
                // rather than writing `false`: the stored slide stays minimal.
                onPatch({ hidePhaseLabel: v === 'show' ? undefined : true })
              }
              options={[
                { value: 'show', label: 'Show' },
                { value: 'hide', label: 'Hide' },
              ]}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
