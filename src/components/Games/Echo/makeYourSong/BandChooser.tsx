// ── Choose Your Band ───────────────────────────────────────────────────────
// The live back-office bands, then the chosen band's grooves: its 4/4
// styles across its L1, L2 and L3 variations (bandPracticeTrack.ts
// `literacyBands`), each at its own tempo, which the song plays at. A
// groove can be heard before it's chosen. As Practice with a Band picks
// them, in the same cards.

import { Loader2, Play, Square } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/components/utilities';
import type { LiteracyBandOption } from '@/features/practiceTracks/genre/bandPracticeTrack';

export interface BandChooserProps {
  bands: LiteracyBandOption[] | null;
  failed: string | null;
  picked: { band: string; variation: string } | null;
  onPick: (band: string, variation: string) => void;
  keyColor: string;
  /** "C Major". */
  keyName: string;
  previewing: boolean;
  /** The groove's sounds are loading for a preview. */
  previewLoading: boolean;
  onPreview: () => void;
  onStopPreview: () => void;
  /** Start My Song, or Back to My Song when changing the band. */
  doneLabel: string;
  onDone: () => void;
  /** Changing the band, a way back without changing it. */
  onCancel?: () => void;
}

function ChoiceCard({
  name,
  value,
  checked,
  onPick,
  keyColor,
  testId,
  children,
}: {
  name: string;
  value: string;
  checked: boolean;
  onPick: (value: string) => void;
  keyColor: string;
  testId: string;
  children: ReactNode;
}) {
  return (
    <label
      data-choice={testId}
      data-checked={checked || undefined}
      className={cn(
        'relative flex min-h-[64px] cursor-pointer flex-col justify-center gap-1 rounded-xl border bg-white/[0.03] p-3 transition-colors focus-within:ring-2 focus-within:ring-white/60 hover:bg-white/[0.06]',
        checked ? 'border-transparent' : 'border-white/[0.08]',
      )}
      style={
        checked
          ? {
              boxShadow: `0 0 0 2px ${keyColor}`,
              backgroundColor: `${keyColor}1f`,
            }
          : undefined
      }
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onPick(value)}
        className="sr-only"
      />
      {children}
    </label>
  );
}

export function BandChooser({
  bands,
  failed,
  picked,
  onPick,
  keyColor,
  keyName,
  previewing,
  previewLoading,
  onPreview,
  onStopPreview,
  doneLabel,
  onDone,
  onCancel,
}: BandChooserProps) {
  const band = bands?.find((b) => b.band.id === picked?.band) ?? null;
  const style =
    band?.styles.find((s) => s.variation === picked?.variation) ?? null;

  return (
    <div
      data-echo-band-chooser
      className="mx-auto flex w-full max-w-[880px] flex-col gap-6 px-6 py-6 max-[639px]:px-4"
    >
      <header className="flex flex-col gap-1.5">
        <h1 className="text-[28px] font-normal leading-9 text-[#e8e8f0]">
          Choose Your Band
        </h1>
        <p className="text-[15px] leading-6 text-white/55">
          Pick a band and its groove. The band plays along while you make your
          song in {keyName}.
        </p>
      </header>

      <section aria-labelledby="echo-band" className="flex flex-col gap-3">
        <h2 id="echo-band" className="text-[17px] leading-6 text-[#e8e8f0]">
          Choose a Band
        </h2>
        {bands === null ? (
          <p className="flex items-center gap-2 text-[15px] text-white/55">
            <Loader2 aria-hidden className="size-4 animate-spin" />
            Getting the bands ready…
          </p>
        ) : bands.length === 0 ? (
          <p className="text-[15px] text-white/55">
            {failed ?? 'No band is ready to play yet.'}
          </p>
        ) : (
          <div
            role="radiogroup"
            aria-label="Choose a Band"
            className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,180px),1fr))] gap-2"
          >
            {bands.map((b) => (
              <ChoiceCard
                key={b.band.id}
                name="echo-band"
                value={b.band.id}
                checked={b.band.id === band?.band.id}
                onPick={(id) => {
                  const next = bands.find((o) => o.band.id === id)!;
                  onPick(id, next.styles[0].variation);
                }}
                keyColor={keyColor}
                testId={`band:${b.band.id}`}
              >
                <span className="text-[15px] font-medium leading-5 text-[#e8e8f0]">
                  {b.band.name}
                </span>
                <span className="text-xs leading-4 text-white/55">
                  {b.instruments.join(' · ')}
                </span>
              </ChoiceCard>
            ))}
          </div>
        )}
      </section>

      {band && (
        <section aria-labelledby="echo-groove" className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2
              id="echo-groove"
              className="text-[17px] leading-6 text-[#e8e8f0]"
            >
              Choose a Groove
            </h2>
            <p className="text-[13px] leading-5 text-white/55">
              How {band.band.name} plays. Each groove has its own tempo.
            </p>
          </div>
          <div
            role="radiogroup"
            aria-label="Choose a Groove"
            className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,180px),1fr))] gap-2"
          >
            {band.styles.map((s) => (
              <ChoiceCard
                key={s.variation}
                name="echo-groove"
                value={s.variation}
                checked={s.variation === style?.variation}
                onPick={(variation) => onPick(band.band.id, variation)}
                keyColor={keyColor}
                testId={`groove:${s.variation}`}
              >
                <span className="text-[15px] font-medium leading-5 text-[#e8e8f0]">
                  {s.name}
                </span>
                <span className="text-xs leading-4 text-white/55">
                  L{s.level} · {s.bpm} BPM
                </span>
              </ChoiceCard>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.08] pt-5">
        <button
          type="button"
          data-echo-band-done
          disabled={!band || !style}
          onClick={onDone}
          className="inline-flex h-10 items-center rounded-full bg-white px-6 text-[15px] font-semibold text-[#101012] hover:bg-[#e6e6e8] disabled:opacity-40"
        >
          {doneLabel}
        </button>
        {style &&
          (previewing ? (
            <button
              type="button"
              onClick={onStopPreview}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-white/10 px-5 text-[15px] text-[#e8e8f0] hover:bg-white/[0.14]"
            >
              <Square aria-hidden className="size-4" />
              Stop
            </button>
          ) : (
            <button
              type="button"
              data-echo-preview
              onClick={onPreview}
              disabled={previewLoading}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-white/10 px-5 text-[15px] text-[#e8e8f0] hover:bg-white/[0.14] disabled:opacity-60"
            >
              {previewLoading ? (
                <Loader2 aria-hidden className="size-4 animate-spin" />
              ) : (
                <Play aria-hidden className="size-4" />
              )}
              Hear the Groove
            </button>
          ))}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 items-center rounded-full px-4 text-[15px] text-white/70 hover:text-[#e8e8f0]"
          >
            Cancel
          </button>
        )}
        {band && style && (
          <p className="basis-full text-[13px] leading-5 text-white/55">
            {band.band.name} plays {style.name} at {style.bpm} BPM.
          </p>
        )}
      </div>
    </div>
  );
}
