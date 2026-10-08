import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Download, Loader2, AlertTriangle } from 'lucide-react';
import { useStore } from '@/daw/store';
import {
  exportProjectAudio,
  downloadAudioBlob,
  type AudioExportFormat,
  type ExportProgress,
  type WavBitDepth,
} from '@/daw/audio/exportAudio';
import { projectEndTick } from '@/daw/audio/renderProject';
import { ticksPerBar } from '@/daw/utils/timelineScale';
import { isOpusEncodingSupported } from '@/lib/studio-assets/encode-opus';
import { showError, showSuccess } from '@/components/utils/toast';

const FORMATS: { id: AudioExportFormat; label: string; hint: string }[] = [
  { id: 'wav', label: 'WAV', hint: 'Uncompressed · DAW-ready' },
  { id: 'opus', label: 'Opus', hint: 'Compressed · small' },
];
const BIT_DEPTHS: WavBitDepth[] = [16, 24];

type RangeChoice = 'project' | 'loop' | 'custom';

/**
 * The format, bit depth and range the student picked. FileMenu holds them,
 * since the dialog is mounted only while open, so the next export starts from
 * the last one's choices.
 */
export interface ExportChoices {
  format: AudioExportFormat;
  bitDepth: WavBitDepth;
  range: RangeChoice;
}

export const DEFAULT_EXPORT_CHOICES: ExportChoices = {
  format: 'wav',
  bitDepth: 16,
  range: 'project',
};

/** A typed bar number, or null when it isn't a whole number ≥ 1. */
function parseBar(text: string): number | null {
  const n = Number(text.trim());
  return Number.isInteger(n) && n >= 1 ? n : null;
}

/** Seconds → m:ss. */
function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── Segmented control ──────────────────────────────────────────────────────

function Seg<T extends string | number>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { value: T; label: string; disabled?: boolean }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="flex gap-1 rounded-lg p-1"
      style={{ backgroundColor: 'var(--color-surface-2)' }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        const off = disabled || opt.disabled;
        return (
          <button
            key={String(opt.value)}
            onClick={() => onChange(opt.value)}
            disabled={off}
            className="flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              backgroundColor: active ? '#f59e0b' : 'transparent',
              color: active ? '#1a1a1a' : 'var(--color-text-dim)',
              cursor: off ? 'default' : 'pointer',
              opacity: off ? 0.5 : 1,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="text-[10px] font-semibold uppercase tracking-wider"
      style={{ color: 'var(--color-text-dim)' }}
    >
      {children}
    </span>
  );
}

function BarInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-1 flex-col gap-1">
      <span className="text-[10px]" style={{ color: 'var(--color-text-dim)' }}>
        {label}
      </span>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        step={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-md px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-amber-500"
        // The dialog portals outside .daw-root, so the theme vars need
        // literal fallbacks or the field renders without a box.
        style={{
          backgroundColor: 'var(--color-surface-2, rgba(255,255,255,0.08))',
          color: 'var(--color-text, #e8e8f0)',
          border: '1px solid var(--color-border, rgba(255,255,255,0.2))',
        }}
      />
    </label>
  );
}

// ── ExportAudioDialog ──────────────────────────────────────────────────────

export function ExportAudioDialog({
  open,
  onOpenChange,
  choices,
  onChoicesChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  choices: ExportChoices;
  onChoicesChange: Dispatch<SetStateAction<ExportChoices>>;
}) {
  // Selecting the stable tracks array ref (not a mapped fresh array) avoids the
  // useShallow fresh-object infinite-loop trap; derive counts in render.
  const tracks = useStore((s) => s.tracks);
  const loopEnabled = useStore((s) => s.loopEnabled);
  const bpm = useStore((s) => s.bpm);
  const barTicks = useStore((s) =>
    ticksPerBar(s.timeSignatureNumerator, s.timeSignatureDenominator),
  );

  const trackCount = tracks.length;
  // Instruments that don't render faithfully offline (see renderProject parity
  // checklist) — warn so a silent/dry track isn't a surprise. Muted tracks are
  // excluded from the bounce anyway, so don't warn about them.
  const soundfontCount = tracks.filter(
    (t) => !t.mute && t.instrument === 'soundfont',
  ).length;
  const ampDryCount = tracks.filter(
    (t) =>
      !t.mute &&
      (t.instrument === 'guitar-fx' ||
        t.instrument === 'bass-fx' ||
        t.instrument === 'vocal-fx') &&
      t.audioClips.length > 0,
  ).length;
  const warnings: string[] = [];
  if (soundfontCount > 0)
    warnings.push(
      `${soundfontCount} SoundFont/GM ${soundfontCount === 1 ? 'track is' : 'tracks are'} not yet included in the bounce.`,
    );
  if (ampDryCount > 0)
    warnings.push(
      `${ampDryCount} guitar/bass/vocal ${ampDryCount === 1 ? 'track bounces' : 'tracks bounce'} dry (without amp/pedal FX).`,
    );

  const { format, bitDepth, range } = choices;
  const setFormat = (next: AudioExportFormat) =>
    onChoicesChange((c) => ({ ...c, format: next }));
  const setBitDepth = (next: WavBitDepth) =>
    onChoicesChange((c) => ({ ...c, bitDepth: next }));
  const setRange = (next: RangeChoice) =>
    onChoicesChange((c) => ({ ...c, range: next }));
  const [startBarText, setStartBarText] = useState('1');
  const [endBarText, setEndBarText] = useState('1');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);

  const opusSupported = isOpusEncodingSupported();

  // Reset transient export state ONLY on an open transition. Keeping loopEnabled
  // out of these deps is deliberate: a loop toggle mid-render (local or from a
  // collab peer) must not clear `busy` and defeat the busy-keyed guards.
  useEffect(() => {
    if (open) {
      setBusy(false);
      setProgress(null);
    }
  }, [open]);

  // Prefill the bar range with the whole project each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    const lastBar = Math.max(
      1,
      Math.ceil(projectEndTick(useStore.getState()) / barTicks),
    );
    setStartBarText('1');
    setEndBarText(String(lastBar));
  }, [open, barTicks]);

  const startBar = parseBar(startBarText);
  const endBar = parseBar(endBarText);
  const customValid =
    startBar !== null && endBar !== null && endBar >= startBar;
  const customError =
    range !== 'custom' || customValid
      ? null
      : startBar === null || endBar === null
        ? 'Bars are whole numbers from 1.'
        : 'End bar must be the same as or after the start bar.';
  const customSeconds = customValid
    ? ((endBar - startBar + 1) * barTicks * 60) / bpm / 480
    : 0;

  // If the loop is off, the loop range is unavailable — fall back to the
  // whole project (a custom range is unaffected).
  useEffect(() => {
    if (!loopEnabled)
      onChoicesChange((c) =>
        c.range === 'loop' ? { ...c, range: 'project' } : c,
      );
  }, [loopEnabled, onChoicesChange]);

  const handleExport = useCallback(async () => {
    setBusy(true);
    setProgress({ stage: 'render', pct: 0 });
    try {
      const effectiveFormat =
        format === 'opus' && !opusSupported ? 'wav' : format;
      const custom = range === 'custom' && startBar !== null && endBar !== null;
      const { blob, filename } = await exportProjectAudio(
        {
          format: effectiveFormat,
          // Bars are inclusive: bars 5–12 runs from the top of bar 5 to the
          // end of bar 12.
          range: custom
            ? {
                startTick: (startBar - 1) * barTicks,
                endTick: endBar * barTicks,
              }
            : range === 'loop'
              ? 'loop'
              : 'project',
          rangeLabel: custom
            ? startBar === endBar
              ? `bar-${startBar}`
              : `bars-${startBar}-${endBar}`
            : undefined,
          bitDepth,
        },
        setProgress,
      );
      downloadAudioBlob(blob, filename);
      // Session-only flag the tutorial engine watches for a completed bounce.
      useStore.getState().markAudioExported();
      showSuccess(`Exported ${filename}`);
      onOpenChange(false);
    } catch (err) {
      console.error('[ExportAudio] export failed', err);
      showError(
        `Export failed: ${err instanceof Error ? err.message : 'unknown error'}`,
      );
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }, [
    format,
    range,
    startBar,
    endBar,
    barTicks,
    bitDepth,
    opusSupported,
    onOpenChange,
  ]);

  const progressLabel =
    progress?.stage === 'render'
      ? 'Rendering mixdown…'
      : progress?.stage === 'encode'
        ? `Encoding${progress.pct > 0 ? ` ${Math.round(progress.pct * 100)}%` : '…'}`
        : '';
  // Render has no sub-progress; show a modest indeterminate fill so the bar
  // isn't stuck at 0 while the offline render runs.
  const barPct =
    progress?.stage === 'render'
      ? 30
      : progress?.stage === 'encode'
        ? 40 + progress.pct * 60
        : 0;

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content
          data-tutorial-id="export-audio-dialog"
          className="fixed left-1/2 top-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 rounded-2xl p-6 outline-none"
          style={{
            maxWidth: 420,
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
            boxShadow:
              '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
          }}
          onInteractOutside={(e) => busy && e.preventDefault()}
          onEscapeKeyDown={(e) => busy && e.preventDefault()}
        >
          <Dialog.Title
            className="mb-1 text-lg font-semibold"
            style={{ color: 'var(--color-text)' }}
          >
            Export Audio
          </Dialog.Title>
          <Dialog.Description
            className="mb-5 text-xs"
            style={{ color: 'var(--color-text-dim)' }}
          >
            Bounce your project to an audio file. The full mix — instruments,
            effects, sends and mastering — is rendered offline.
          </Dialog.Description>

          <div className="flex flex-col gap-5">
            {/* Format */}
            <div className="flex flex-col gap-2">
              <FieldLabel>Format</FieldLabel>
              <div className="flex gap-2">
                {FORMATS.map((f) => {
                  const active = f.id === format;
                  const unavailable = f.id === 'opus' && !opusSupported;
                  return (
                    <button
                      key={f.id}
                      onClick={() => !unavailable && setFormat(f.id)}
                      disabled={busy || unavailable}
                      className="flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-2 transition-colors"
                      style={{
                        backgroundColor: active
                          ? 'rgba(255, 255, 255, 0.08)'
                          : 'var(--color-surface-2)',
                        border: `1px solid ${active ? 'rgba(255, 255, 255, 0.6)' : 'var(--color-border)'}`,
                        cursor: unavailable ? 'not-allowed' : 'pointer',
                        opacity: unavailable ? 0.4 : 1,
                      }}
                    >
                      <span
                        className="text-xs font-semibold"
                        style={{
                          color: active
                            ? 'var(--color-text)'
                            : 'var(--color-text-dim)',
                        }}
                      >
                        {f.label}
                      </span>
                      <span
                        className="text-[9px]"
                        style={{ color: 'var(--color-text-dim)' }}
                      >
                        {unavailable ? 'unsupported' : f.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Format-specific quality */}
            {format === 'wav' && (
              <div className="flex flex-col gap-2">
                <FieldLabel>Bit depth</FieldLabel>
                <Seg
                  options={BIT_DEPTHS.map((b) => ({
                    value: b,
                    label: `${b}-bit`,
                  }))}
                  value={bitDepth}
                  onChange={setBitDepth}
                  disabled={busy}
                />
              </div>
            )}
            {/* Range */}
            <div className="flex flex-col gap-2">
              <FieldLabel>Range</FieldLabel>
              <Seg
                options={[
                  { value: 'project' as const, label: 'Whole project' },
                  {
                    value: 'loop' as const,
                    label: loopEnabled ? 'Loop region' : 'Loop (off)',
                    disabled: !loopEnabled,
                  },
                  { value: 'custom' as const, label: 'Start – End' },
                ]}
                value={range}
                onChange={setRange}
                disabled={busy}
              />
              {range === 'custom' && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-end gap-2">
                    <BarInput
                      label="Start bar"
                      value={startBarText}
                      onChange={setStartBarText}
                      disabled={busy}
                    />
                    <span
                      className="pb-2 text-xs"
                      style={{ color: 'var(--color-text-dim)' }}
                    >
                      to
                    </span>
                    <BarInput
                      label="End bar"
                      value={endBarText}
                      onChange={setEndBarText}
                      disabled={busy}
                    />
                  </div>
                  <span
                    className="text-[11px]"
                    style={{
                      color: customError ? '#f87171' : 'var(--color-text-dim)',
                    }}
                    role={customError ? 'alert' : undefined}
                  >
                    {customError ??
                      `${endBar! - startBar! + 1} ${
                        endBar === startBar ? 'bar' : 'bars'
                      } · ${formatDuration(customSeconds)} (end bar included)`}
                  </span>
                </div>
              )}
            </div>

            {/* Coverage warnings */}
            {!busy && warnings.length > 0 && (
              <div
                className="flex gap-2 rounded-lg p-3"
                style={{
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                }}
              >
                <AlertTriangle
                  size={14}
                  className="mt-0.5 shrink-0"
                  style={{ color: '#f59e0b' }}
                />
                <div className="flex flex-col gap-1">
                  {warnings.map((w) => (
                    <span
                      key={w}
                      className="text-[11px] leading-snug"
                      style={{ color: 'var(--color-text-dim)' }}
                    >
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Progress */}
            {busy && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Loader2
                    size={13}
                    className="animate-spin"
                    style={{ color: 'var(--color-text-dim)' }}
                  />
                  <span
                    className="text-xs"
                    style={{ color: 'var(--color-text-dim)' }}
                  >
                    {progressLabel}
                  </span>
                </div>
                <div
                  className="h-1.5 w-full overflow-hidden rounded-full"
                  style={{ backgroundColor: 'var(--color-surface-2)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-200"
                    style={{
                      width: `${barPct}%`,
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => onOpenChange(false)}
                disabled={busy}
                className="rounded-full px-4 py-2 text-xs font-medium transition-colors hover:bg-white/5"
                style={{
                  color: 'var(--color-text-dim)',
                  border: '1px solid var(--color-border)',
                  cursor: busy ? 'default' : 'pointer',
                  opacity: busy ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
              <button
                data-tutorial-id="export-audio-run"
                onClick={() => void handleExport()}
                disabled={busy || trackCount === 0 || !!customError}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-colors"
                style={{
                  backgroundColor: '#f59e0b',
                  color: '#1a1a1a',
                  cursor:
                    busy || trackCount === 0 || customError
                      ? 'default'
                      : 'pointer',
                  opacity: busy || trackCount === 0 || customError ? 0.5 : 1,
                }}
              >
                <Download size={13} strokeWidth={2.5} />
                {trackCount === 0 ? 'Add a track first' : 'Export'}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
