import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { Download, Loader2, AlertTriangle } from 'lucide-react';
import { useStore } from '@/daw/store';
import type { Track } from '@/daw/store/tracksSlice';
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
import { Button } from '@/daw/ui/Button';
import { DawDialog } from '@/daw/ui/DawDialog';
import { Segmented } from '@/daw/ui/Segmented';
import { TYPE_CLASS } from '@/daw/ui/styles';
import type { ExportChoices, RangeChoice } from './exportChoices';

const FORMATS: { id: AudioExportFormat; label: string; hint: string }[] = [
  { id: 'wav', label: 'WAV', hint: 'Uncompressed · DAW-ready' },
  { id: 'opus', label: 'Opus', hint: 'Compressed · small' },
];
const BIT_DEPTHS: WavBitDepth[] = [16, 24];

export { DEFAULT_EXPORT_CHOICES, type ExportChoices } from './exportChoices';

/** A typed bar number, or null when it isn't a whole number ≥ 1. */
function parseBar(text: string): number | null {
  const n = Number(text.trim());
  return Number.isInteger(n) && n >= 1 ? n : null;
}

/** Whether a Guitar/Bass/Vocal track's stored chain has a wah switched on:
 *  its envelope follower can't run in an offline render (WahPedal). */
function usesWah(track: Track): boolean {
  const chain =
    track.instrument === 'guitar-fx' || track.instrument === 'bass-fx'
      ? track.guitarChain
      : track.instrument === 'vocal-fx'
        ? track.vocalChain
        : undefined;
  return !!chain?.some((b) => b.type === 'wah' && b.enabled);
}

/** Seconds → m:ss. */
function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ── Fields ──────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className={TYPE_CLASS.micro} style={{ color: 'var(--daw-text-3)' }}>
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
      <span className={TYPE_CLASS.label} style={{ color: 'var(--daw-text-3)' }}>
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
        className={`h-7 w-full rounded-[var(--daw-radius-sm)] border border-daw-outline bg-transparent px-2.5 text-daw-text outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-daw-focus ${TYPE_CLASS.body}`}
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
  // What doesn't render as it plays (see renderProject's parity checklist):
  // warn so the difference isn't a surprise. Muted tracks are excluded from
  // the bounce anyway, so don't warn about them.
  const wahCount = tracks.filter(
    (t) => !t.mute && t.audioClips.length > 0 && usesWah(t),
  ).length;
  const warnings: string[] = [];
  if (wahCount > 0)
    warnings.push(
      `${wahCount} ${wahCount === 1 ? 'track uses' : 'tracks use'} the wah pedal, which bounces as a fixed filter (no sweep).`,
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

  const stagePct =
    progress && progress.pct > 0 ? ` ${Math.round(progress.pct * 100)}%` : '…';
  const progressLabel =
    progress?.stage === 'instruments'
      ? `Rendering instruments${stagePct}`
      : progress?.stage === 'render'
        ? `Rendering mixdown${stagePct}`
        : progress?.stage === 'encode'
          ? `Encoding${stagePct}`
          : '';
  // SoundFont tracks (when there are any), then the mixdown, then encoding.
  // The mixdown starts the bar off a little way in, so it isn't stuck at 0
  // in a browser that can't report the render's progress.
  const barPct =
    progress?.stage === 'instruments'
      ? progress.pct * 20
      : progress?.stage === 'render'
        ? 25 + progress.pct * 55
        : progress?.stage === 'encode'
          ? 80 + progress.pct * 20
          : 0;

  const exportBlocked = busy || trackCount === 0 || !!customError;
  const formatHint = FORMATS.find((f) => f.id === format)?.hint ?? '';

  return (
    <DawDialog
      open={open}
      onOpenChange={(o) => !busy && onOpenChange(o)}
      // Nothing closes it while it renders.
      closable={!busy}
      size="sm"
      data={{ 'data-tutorial-id': 'export-audio-dialog' }}
      title="Export Audio"
      description="Bounce your project to an audio file. The full mix (instruments, effects, sends and mastering) is rendered offline."
      footer={
        <>
          <Button onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            data-tutorial-id="export-audio-run"
            onClick={() => void handleExport()}
            disabled={exportBlocked}
          >
            <Download strokeWidth={2.5} />
            {trackCount === 0 ? 'Add a track first' : 'Export'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5 pb-1">
        {/* Format */}
        <div className="flex flex-col gap-2">
          <FieldLabel>Format</FieldLabel>
          <Segmented
            label="Format"
            options={FORMATS.map((f) => ({
              value: f.id,
              label: f.label,
              disabled: f.id === 'opus' && !opusSupported,
            }))}
            value={format}
            onValueChange={setFormat}
            disabled={busy}
            className="self-start"
          />
          <span
            className={TYPE_CLASS.label}
            style={{ color: 'var(--daw-text-3)' }}
          >
            {opusSupported
              ? formatHint
              : `${formatHint} · Opus isn’t supported in this browser`}
          </span>
        </div>

        {/* Format-specific quality */}
        {format === 'wav' && (
          <div className="flex flex-col gap-2">
            <FieldLabel>Bit depth</FieldLabel>
            <Segmented
              label="Bit depth"
              options={BIT_DEPTHS.map((b) => ({
                value: String(b),
                label: `${b}-bit`,
              }))}
              value={String(bitDepth)}
              onValueChange={(next) => setBitDepth(Number(next) as WavBitDepth)}
              disabled={busy}
              className="self-start"
            />
          </div>
        )}

        {/* Range */}
        <div className="flex flex-col gap-2">
          <FieldLabel>Range</FieldLabel>
          <Segmented
            label="Range"
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
            onValueChange={setRange}
            disabled={busy}
            className="self-start"
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
                  className={`pb-1.5 ${TYPE_CLASS.body}`}
                  style={{ color: 'var(--daw-text-3)' }}
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
                className={TYPE_CLASS.label}
                style={{
                  color: customError
                    ? 'var(--daw-danger-text)'
                    : 'var(--daw-text-3)',
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
            className="flex gap-2 rounded-[var(--daw-radius-md)] p-3"
            style={{ backgroundColor: 'var(--daw-warning-subtle)' }}
          >
            <AlertTriangle
              size={14}
              className="mt-0.5 shrink-0"
              style={{ color: 'var(--daw-warning)' }}
            />
            <div className="flex flex-col gap-1">
              {warnings.map((w) => (
                <span
                  key={w}
                  className={TYPE_CLASS.label}
                  style={{ color: 'var(--daw-text-2)' }}
                >
                  {w}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Progress */}
        {busy && (
          <div className="flex flex-col gap-2" role="status">
            <div className="flex items-center gap-2">
              <Loader2
                size={14}
                className="animate-spin"
                style={{ color: 'var(--daw-text-3)' }}
              />
              <span
                className={TYPE_CLASS.body}
                style={{ color: 'var(--daw-text-3)' }}
              >
                {progressLabel}
              </span>
            </div>
            <div
              className="h-1.5 w-full overflow-hidden rounded-full"
              style={{ backgroundColor: 'var(--daw-meter-track)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-200"
                style={{
                  width: `${barPct}%`,
                  backgroundColor: 'var(--daw-text)',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </DawDialog>
  );
}
