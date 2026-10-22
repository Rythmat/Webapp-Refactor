import { AlertTriangle, Download, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  downloadAudioBlob,
  exportProjectAudio,
  exportStems,
  stemTracks,
  type AudioExportFormat,
  type ExportProgress,
  type StemProgress,
  type WavBitDepth,
} from '@/daw/audio/exportAudio';
import { projectEndTick } from '@/daw/audio/renderProject';
import { BUNDLED_MODELS } from '@/daw/audio/nam/NamModelStore';
import { isTrackAudible } from '@/daw/audio/trackAudibility';
import {
  exportProjectMidi,
  planProjectMidi,
} from '@/daw/commands/projectCommands';
import { FX_LABEL } from '@/daw/data/libraryItems';
import { notice } from '@/daw/shell/notice';
import { useStore, type Track } from '@/daw/store';
import { Button } from '@/daw/ui/Button';
import { DawDialog } from '@/daw/ui/DawDialog';
import { Segmented } from '@/daw/ui/Segmented';
import { Select } from '@/daw/ui/Select';
import { TYPE_CLASS } from '@/daw/ui/styles';
import { downloadFile } from '@/daw/utils/exportFiles';
import { ticksPerBar } from '@/daw/utils/timelineScale';
import { isOpusEncodingSupported } from '@/lib/studio-assets/encode-opus';
import {
  useExportDialogStore,
  type ExportChoices,
  type ExportTab,
  type ExportWhat,
  type NotationFormat,
  type RangeChoice,
} from './exportDialogStore';

// ── Export (milestone 2.15; ST11, shell-23, shell-34, audio-core-20) ───────
//
// One dialog for every way out of the editor, opened from the top bar's
// white Export pill, Project ▾, a track's menu and the command palette.
// Audio | Notation on top (Soundtrap's Audio | Note), then what to export:
// the whole song, each track as its own file (stems, in one zip), or one
// track. Audio is WAV (16 or 24-bit) or Opus, the whole song, the loop or a
// run of bars, with the master chain on or off; one track can leave its
// effects out. Notation is a MIDI file or MusicXML (the lead sheet's chords,
// the full score, or one track's part).
//
// What the offline render still leaves out stays in view: an amp whose model
// this build doesn't have (one saved by a newer client) exports without it.
// Guitar, bass and vocal tracks export through their pedals (milestone
// 1.11), and SoundFont tracks are rendered for the export (soundFontRender). While it exports, a bar shows
// how far it is ("Exporting… 42%"; indeterminate where the browser can't
// say) and Cancel ends any export at once, stems included, with no file
// (milestone 1.11). Closing the dialog while it exports cancels it too.
// Mounted only while open (shell-17), with the choices in exportDialogStore.

const FORMATS: { id: AudioExportFormat; label: string; hint: string }[] = [
  { id: 'wav', label: 'WAV', hint: 'Uncompressed: the best quality' },
  { id: 'opus', label: 'Opus', hint: 'Compressed: a small file' },
];
const BIT_DEPTHS: WavBitDepth[] = [16, 24];

/**
 * The Notation side's formats, for the whole song and for one track. Each
 * segment carries a lesson anchor (export-notation-<format>), so Save and
 * Export can point at the MusicXML one.
 */
const SONG_NOTATION_FORMATS: {
  value: NotationFormat;
  label: string;
  anchor: string;
}[] = [
  { value: 'midi', label: 'MIDI file', anchor: 'export-notation-midi' },
  {
    value: 'leadsheet',
    label: 'MusicXML: lead sheet',
    anchor: 'export-notation-leadsheet',
  },
  {
    value: 'score',
    label: 'MusicXML: full score',
    anchor: 'export-notation-score',
  },
];
const TRACK_NOTATION_FORMATS: {
  value: NotationFormat;
  label: string;
  anchor: string;
}[] = [
  { value: 'midi', label: 'MIDI file', anchor: 'export-notation-midi' },
  {
    value: 'score',
    label: 'MusicXML: its part',
    anchor: 'export-notation-score',
  },
];

/** Whether the amp an Audio track plays through names a model this build
 *  doesn't bundle: the export can't load it (pedalChainBuilder), so that
 *  amp passes the signal through. */
function ampModelLeftOut(t: Track): boolean {
  if (t.instrument !== 'audio-input' || t.audioClips.length === 0) return false;
  // The first amp is the one that gets a model, live and in an export.
  const amp = t.guitarChain?.find((b) => b.type === 'nam-amp');
  if (!amp?.enabled || !amp.namModelId) return false;
  return !BUNDLED_MODELS.some((m) => m.id === amp.namModelId);
}

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

/** Whether a track holds notes the notation files can write. */
function hasNotes(track: Track): boolean {
  return track.midiClips.some((c) => !c.muted && c.events.length > 0);
}

/** Whether a track holds anything a render would play. */
function hasContent(track: Track): boolean {
  return hasNotes(track) || track.audioClips.some((c) => !c.muted);
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className={`${TYPE_CLASS.micro} text-daw-text-3`}>{children}</span>
  );
}

function Hint({
  children,
  alert = false,
}: {
  children: React.ReactNode;
  alert?: boolean;
}) {
  return (
    <span
      className={`${TYPE_CLASS.label} ${alert ? 'text-daw-danger-text' : 'text-daw-text-3'}`}
      role={alert ? 'alert' : undefined}
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
      <span className={`${TYPE_CLASS.label} text-daw-text-3`}>{label}</span>
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

type Progress =
  | { kind: 'mix'; p: ExportProgress }
  | { kind: 'stems'; p: StemProgress };

export function ExportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const tab = useExportDialogStore((s) => s.tab);
  const setTab = useExportDialogStore((s) => s.setTab);
  const choices = useExportDialogStore((s) => s.choices);
  const setChoices = useExportDialogStore((s) => s.setChoices);
  const set = useCallback(
    (patch: Partial<ExportChoices>) => setChoices(patch),
    [setChoices],
  );

  const tracks = useStore((s) => s.tracks);
  const loopEnabled = useStore((s) => s.loopEnabled);
  const bpm = useStore((s) => s.bpm);
  const masteringChain = useStore((s) => s.masteringFxChain);
  const chordCount = useStore((s) => s.chordRegions.length);
  const barTicks = useStore((s) =>
    ticksPerBar(s.timeSignatureNumerator, s.timeSignatureDenominator),
  );

  const { format, bitDepth, range, mastering, what, trackId, dry, notation } =
    choices;
  const track = tracks.find((t) => t.id === trackId) ?? null;
  // Stems are an audio idea: a MIDI file already keeps each track apart.
  const whatNow: ExportWhat =
    tab === 'notation' && what === 'stems' ? 'song' : what;

  const [startBarText, setStartBarText] = useState('1');
  const [endBarText, setEndBarText] = useState('1');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const stopper = useRef<AbortController | null>(null);
  // While it renders, focus is on Stop (stems) or the progress line: the
  // run button turns off, and focus on <body> would let Space and the
  // editor's keys reach the song behind the dialog.
  const stopRef = useRef<HTMLButtonElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  // Focus starts on Audio | Notation, the dialog's first choice.
  const tabsRef = useRef<HTMLDivElement>(null);
  const initialFocus = useMemo(
    () => ({
      get current() {
        return (
          tabsRef.current?.querySelector<HTMLElement>(
            'button[data-state="checked"]',
          ) ?? null
        );
      },
    }),
    [],
  );
  const [stopping, setStopping] = useState(false);
  const opusSupported = isOpusEncodingSupported();

  const showsProgress = progress !== null;
  // An audio export is under way: it can be cancelled (notation is quick).
  const exporting = busy && showsProgress;
  const cancelExport = () => {
    if (!stopper.current) return;
    setStopping(true);
    stopper.current.abort();
  };
  useEffect(() => {
    if (!busy) return;
    const frame = requestAnimationFrame(() =>
      (stopRef.current ?? statusRef.current)?.focus(),
    );
    return () => cancelAnimationFrame(frame);
  }, [busy, showsProgress]);

  // Prefill the bars with the whole song each time it opens.
  useEffect(() => {
    if (!open) return;
    const lastBar = Math.max(
      1,
      Math.ceil(projectEndTick(useStore.getState()) / barTicks),
    );
    setStartBarText('1');
    setEndBarText(String(lastBar));
  }, [open, barTicks]);

  // With the loop off, its range falls back to the whole song.
  useEffect(() => {
    if (!loopEnabled && range === 'loop') set({ range: 'project' });
  }, [loopEnabled, range, set]);

  // A chosen track that has gone (deleted, an Undo) leaves One track.
  useEffect(() => {
    if (what === 'track' && !track) set({ what: 'song', trackId: null });
  }, [what, track, set]);

  const startBar = parseBar(startBarText);
  const endBar = parseBar(endBarText);
  const customValid =
    startBar !== null && endBar !== null && endBar >= startBar;
  const customError =
    range !== 'custom' || customValid
      ? null
      : startBar === null || endBar === null
        ? 'Bars are whole numbers from 1.'
        : 'The end bar must be the start bar or after it.';
  const customSeconds = customValid
    ? ((endBar - startBar + 1) * barTicks * 60) / bpm / 480
    : 0;

  const stems = useMemo(
    () => (whatNow === 'stems' ? stemTracks(useStore.getState()) : []),
    // The track list is what stemTracks reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [whatNow, tracks],
  );

  // What the file leaves out, said before it is made. Mute and solo as
  // Play has them, which is what the render does.
  const audible = (t: Track) =>
    whatNow === 'track'
      ? t.id === trackId
      : isTrackAudible(t, tracks) && hasContent(t);
  const songPlays = tracks.some(audible);
  const warnings: string[] = [];
  if (tab === 'audio') {
    const ampLeftOut = tracks.filter((t) => audible(t) && ampModelLeftOut(t));
    if (ampLeftOut.length > 0) {
      const names = ampLeftOut.map((t) => t.name).join(', ');
      warnings.push(
        `${names}: the amp model isn’t one this Studio has, so ${ampLeftOut.length === 1 ? 'its amp is' : 'their amps are'} left out of the export (the other pedals still play).`,
      );
    }
    if (whatNow === 'song' && tracks.length > 0 && !songPlays) {
      // Not a refusal: a lesson's last step may bounce whatever is there.
      warnings.push(
        'Nothing plays in the song yet (or what plays is muted), so the file will be silent.',
      );
    }
    if (whatNow === 'stems' && mastering && masteringChain.length > 0) {
      warnings.push(
        'With mastering on, each stem goes through the master chain alone, so the stems won’t add up exactly to the song.',
      );
    }
  }

  const trackOptions = tracks.map((t) => ({
    value: t.id,
    label: t.name,
    disabled: tab === 'notation' ? !hasNotes(t) : !hasContent(t),
  }));

  // Why the run button is off, if it is.
  const leadSheet =
    tab === 'notation' && whatNow === 'song' && notation === 'leadsheet';
  let blocked: string | null = null;
  if (leadSheet) {
    // The lead sheet is the chord symbols: it needs no track.
    if (chordCount === 0) blocked = 'The song has no chord symbols yet';
  } else if (tracks.length === 0) blocked = 'Add a track first';
  else if (tab === 'audio' && customError) blocked = customError;
  else if (whatNow === 'track' && !track) blocked = 'Choose a track';
  else if (
    whatNow === 'track' &&
    track &&
    tab === 'notation' &&
    !hasNotes(track)
  )
    blocked = `${track.name} has no notes to write down`;
  else if (
    whatNow === 'track' &&
    track &&
    tab === 'audio' &&
    !hasContent(track)
  )
    blocked = `${track.name} has nothing to play`;
  else if (whatNow === 'stems' && stems.length === 0)
    blocked = 'No track plays anything yet';
  else if (whatNow === 'song' && tab === 'notation' && !tracks.some(hasNotes))
    blocked = 'There are no notes to write down yet';

  const renderRange = () => {
    const custom = range === 'custom' && startBar !== null && endBar !== null;
    return {
      // Bars are inclusive: bars 5–12 run from the top of bar 5 to the end
      // of bar 12.
      range: custom
        ? { startTick: (startBar - 1) * barTicks, endTick: endBar * barTicks }
        : range === 'loop'
          ? ('loop' as const)
          : ('project' as const),
      rangeLabel: custom
        ? startBar === endBar
          ? `bar-${startBar}`
          : `bars-${startBar}-${endBar}`
        : undefined,
    };
  };

  const runAudio = async () => {
    const effectiveFormat =
      format === 'opus' && !opusSupported ? 'wav' : format;
    const base = {
      format: effectiveFormat,
      bitDepth,
      mastering,
      ...renderRange(),
    };
    const controller = new AbortController();
    stopper.current = controller;
    if (whatNow === 'stems') {
      setProgress({
        kind: 'stems',
        p: {
          index: 0,
          total: stems.length,
          trackName: stems[0]?.name ?? '',
          stage: 'render',
          fraction: null,
          overall: 0,
        },
      });
      return exportStems(
        base,
        (p) => setProgress({ kind: 'stems', p }),
        controller.signal,
      );
    }
    setProgress({ kind: 'mix', p: { stage: 'render', fraction: null } });
    return exportProjectAudio(
      whatNow === 'track' && trackId
        ? { ...base, trackId, dry, mastering: dry ? false : mastering }
        : base,
      (p) => setProgress({ kind: 'mix', p }),
      controller.signal,
    );
  };

  const handleAudio = async () => {
    setBusy(true);
    try {
      const result = await runAudio();
      const { blob, filename } = result;
      downloadAudioBlob(blob, filename);
      // Session-only: the lesson engine watches for a finished bounce, and
      // a course lesson's Export Audio step for the done moment (a stem or
      // one track's file counts, as the bounce does).
      useStore.getState().markAudioExported();
      useStore.getState().markDone('exportAudio');
      const skipped = (result as { skipped?: string[] }).skipped ?? [];
      notice({
        title: `Exported ${filename}`,
        // A track deleted (by a collaborator) before its turn.
        description:
          skipped.length > 0
            ? `Left out, deleted while exporting: ${skipped.join(', ')}`
            : undefined,
      });
      onOpenChange(false);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        notice({
          title: 'Export cancelled',
          description: 'No file was made.',
        });
      } else {
        console.error('[Export] audio export failed', err);
        notice({
          title: 'The export didn’t finish',
          description: err instanceof Error ? err.message : undefined,
          variant: 'destructive',
        });
      }
    } finally {
      stopper.current = null;
      setStopping(false);
      setBusy(false);
      setProgress(null);
    }
  };

  const handleNotation = async () => {
    setBusy(true);
    try {
      const state = useStore.getState();
      const one = whatNow === 'track' && trackId ? [trackId] : undefined;
      let filename = '';
      if (notation === 'midi' || (one && notation === 'leadsheet')) {
        filename = planProjectMidi(state, { trackIds: one })?.filename ?? '';
        if (!(await exportProjectMidi({ trackIds: one }))) {
          notice({ title: 'There are no notes to write to a MIDI file' });
          return;
        }
      } else {
        // The notation writers load with the first export.
        const { buildFullScoreXml, buildLeadSheetExport } = await import(
          '@/daw/midi/scoreExport'
        );
        const file =
          notation === 'leadsheet'
            ? buildLeadSheetExport(state)
            : buildFullScoreXml(state, { trackIds: one });
        if (!file) {
          notice({
            title:
              notation === 'leadsheet'
                ? 'The song has no chord symbols to write yet'
                : 'There are no notes to write down',
          });
          return;
        }
        downloadFile(
          new Blob([file.xml], {
            type: 'application/vnd.recordare.musicxml+xml',
          }),
          file.filename,
        );
        // A lesson's MusicXML step watches for it (exportProjectMidi marks
        // a MIDI file's own).
        useStore.getState().markDone('exportMusicXml');
        filename = file.filename;
      }
      notice({ title: filename ? `Exported ${filename}` : 'Exported' });
      onOpenChange(false);
    } catch (err) {
      console.error('[Export] notation export failed', err);
      notice({
        title: 'The export didn’t finish',
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const notationOptions =
    whatNow === 'track' ? TRACK_NOTATION_FORMATS : SONG_NOTATION_FORMATS;
  const notationNow: NotationFormat =
    whatNow === 'track' && notation === 'leadsheet' ? 'midi' : notation;

  // The whole job's share done, or null for an indeterminate bar.
  let barPct: number | null = null;
  let progressLabel = '';
  if (progress) {
    const whole =
      progress.kind === 'mix' ? progress.p.fraction : progress.p.overall;
    barPct = whole === null ? null : Math.round(whole * 100);
    const parts = [`Exporting…${barPct === null ? '' : ` ${barPct}%`}`];
    if (progress.kind === 'stems') {
      const { index, total, trackName } = progress.p;
      parts.push(`Track ${index + 1} of ${total} · ${trackName}`);
    }
    if (progress.p.stage === 'encode') parts.push('encoding');
    progressLabel = stopping ? 'Canceling…' : parts.join(' · ');
  }

  const masteringNames = masteringChain.map((fx) => FX_LABEL[fx] ?? fx);

  return (
    <DawDialog
      open={open}
      onOpenChange={(o) => {
        // Closed while it exports: the export is cancelled, then it closes.
        if (!o && exporting) cancelExport();
        if (!busy || exporting) onOpenChange(o);
      }}
      // A notation file is written at once; an audio export can be
      // cancelled, so it can close while that runs.
      closable={!busy || exporting}
      initialFocus={initialFocus}
      size="md"
      // Its top stays put as the sides and choices change its height (the
      // tallest choice is centred), so the switch never jumps under the
      // pointer.
      className="top-[max(24px,calc(50dvh-310px))] translate-y-0"
      data={{ 'data-tutorial-id': 'export-audio-dialog' }}
      title="Export"
      description={
        tab === 'audio'
          ? 'Your song as an audio file, rendered offline with its instruments, effects and sends.'
          : 'Your notes as a MIDI file, or as music notation (MusicXML) for MuseScore, Finale or Sibelius.'
      }
      footer={
        <>
          {exporting ? (
            // Stays on (a second press does nothing), so focus stays here.
            <Button
              ref={stopRef}
              data-testid="export-cancel"
              aria-disabled={stopping || undefined}
              onClick={cancelExport}
            >
              Cancel
            </Button>
          ) : (
            <Button onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
          )}
          {tab === 'audio' ? (
            <Button
              variant="primary"
              data-tutorial-id="export-audio-run"
              title={blocked ?? undefined}
              onClick={() => void handleAudio()}
              disabled={busy || blocked !== null}
            >
              <Download strokeWidth={2.5} />
              {tracks.length === 0 ? 'Add a track first' : 'Export'}
            </Button>
          ) : (
            <Button
              variant="primary"
              data-testid="export-notation-run"
              data-tutorial-id="export-notation-run"
              title={blocked ?? undefined}
              onClick={() => void handleNotation()}
              disabled={busy || blocked !== null}
            >
              <Download strokeWidth={2.5} />
              {tracks.length === 0 && !leadSheet
                ? 'Add a track first'
                : 'Export'}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-3 pb-1">
        <div ref={tabsRef} className="self-start">
          <Segmented
            label="Export as"
            testId="export-tab"
            options={[
              { value: 'audio', label: 'Audio', testId: 'export-tab-audio' },
              {
                value: 'notation',
                label: 'Notation',
                testId: 'export-tab-notation',
              },
            ]}
            value={tab}
            onValueChange={(next: ExportTab) => setTab(next)}
            disabled={busy}
          />
        </div>

        {/* What */}
        <div className="flex flex-col gap-2">
          <FieldLabel>What</FieldLabel>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              label="What to export"
              testId="export-what"
              options={[
                { value: 'song', label: 'Whole song' },
                ...(tab === 'audio'
                  ? [{ value: 'stems' as const, label: 'Each track' }]
                  : []),
                { value: 'track', label: 'One track' },
              ]}
              value={whatNow}
              onValueChange={(next: ExportWhat) =>
                set({
                  what: next,
                  trackId:
                    next === 'track'
                      ? (trackId ??
                        useStore.getState().selectedTrackId ??
                        tracks[0]?.id ??
                        null)
                      : trackId,
                })
              }
              disabled={busy}
            />
            {whatNow === 'track' ? (
              <Select
                label="Track"
                id="export-track-select"
                options={trackOptions}
                value={trackId ?? undefined}
                onValueChange={(id) => set({ trackId: id })}
                disabled={busy}
                className="max-w-[200px]"
              />
            ) : null}
          </div>
          {whatNow === 'stems' ? (
            <Hint>
              {stems.length === 1
                ? 'One file for the one track that plays, in a zip.'
                : `${stems.length} files, one for each track that plays, in one zip.`}
            </Hint>
          ) : null}
          {whatNow === 'track' && tab === 'audio' ? (
            <Segmented
              label="Effects"
              testId="export-dry"
              options={[
                { value: 'wet', label: 'With its effects' },
                { value: 'dry', label: 'No effects' },
              ]}
              value={dry ? 'dry' : 'wet'}
              onValueChange={(next) => set({ dry: next === 'dry' })}
              disabled={busy}
              className="self-start"
            />
          ) : null}
        </div>

        {tab === 'audio' ? (
          <>
            <div className="flex flex-col gap-2">
              <FieldLabel>Format</FieldLabel>
              <div className="flex flex-wrap items-center gap-2">
                <Segmented
                  label="Format"
                  options={FORMATS.map((f) => ({
                    value: f.id,
                    label: f.label,
                    disabled: f.id === 'opus' && !opusSupported,
                  }))}
                  value={format}
                  onValueChange={(next) => set({ format: next })}
                  disabled={busy}
                />
                {format === 'wav' ? (
                  <Segmented
                    label="Bit depth"
                    options={BIT_DEPTHS.map((b) => ({
                      value: String(b),
                      label: `${b}-bit`,
                    }))}
                    value={String(bitDepth)}
                    onValueChange={(next) =>
                      set({ bitDepth: Number(next) as WavBitDepth })
                    }
                    disabled={busy}
                  />
                ) : null}
              </div>
              <Hint>
                {FORMATS.find((f) => f.id === format)?.hint}
                {opusSupported ? '' : ' · Opus needs a newer browser'}
              </Hint>
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel>Range</FieldLabel>
              <Segmented
                label="Range"
                options={[
                  { value: 'project' as RangeChoice, label: 'Whole song' },
                  {
                    value: 'loop' as RangeChoice,
                    label: loopEnabled ? 'Loop' : 'Loop (off)',
                    disabled: !loopEnabled,
                  },
                  { value: 'custom' as RangeChoice, label: 'Bars' },
                ]}
                value={range}
                onValueChange={(next) => set({ range: next })}
                disabled={busy}
                className="self-start"
              />
              {range === 'custom' ? (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-end gap-2">
                    <BarInput
                      label="Start bar"
                      value={startBarText}
                      onChange={setStartBarText}
                      disabled={busy}
                    />
                    <span
                      className={`pb-1.5 ${TYPE_CLASS.body} text-daw-text-3`}
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
                  <Hint alert={customError !== null}>
                    {customError ??
                      `${endBar! - startBar! + 1} ${endBar === startBar ? 'bar' : 'bars'} · ${formatDuration(customSeconds)} (the end bar included)`}
                  </Hint>
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel>Mastering</FieldLabel>
              <Segmented
                label="Mastering"
                testId="export-mastering"
                options={[
                  { value: 'on', label: 'On' },
                  { value: 'off', label: 'Off' },
                ]}
                value={
                  mastering &&
                  masteringChain.length > 0 &&
                  !(whatNow === 'track' && dry)
                    ? 'on'
                    : 'off'
                }
                onValueChange={(next) => set({ mastering: next === 'on' })}
                disabled={
                  busy ||
                  masteringChain.length === 0 ||
                  (whatNow === 'track' && dry)
                }
                className="self-start"
              />
              <Hint>
                {whatNow === 'track' && dry
                  ? 'A track without its effects leaves the master chain out too.'
                  : masteringChain.length === 0
                    ? 'The master chain is empty (Mix ▸ Master).'
                    : `The master chain: ${masteringNames.join(', ')}.`}
              </Hint>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <FieldLabel>Format</FieldLabel>
            <Segmented
              label="Notation format"
              testId="export-notation-format"
              options={notationOptions}
              value={notationNow}
              onValueChange={(next) => set({ notation: next })}
              disabled={busy}
              className="self-start"
            />
            <Hint>
              {notationNow === 'midi'
                ? 'Every note, one MIDI track per track; drums on channel 10.'
                : notationNow === 'leadsheet'
                  ? 'The chord symbols, bar by bar, with the song’s sections.'
                  : 'Notes, rests, chords and marks as the Score shows them.'}
            </Hint>
          </div>
        )}

        {!busy && warnings.length > 0 ? (
          <div className="flex gap-2 rounded-[var(--daw-radius-md)] bg-daw-warning-subtle p-3">
            <AlertTriangle
              aria-hidden
              className="mt-0.5 size-3.5 shrink-0 text-daw-warning"
            />
            <div className="flex flex-col gap-1">
              {warnings.map((w) => (
                <span key={w} className={`${TYPE_CLASS.label} text-daw-text-2`}>
                  {w}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* Why it can't go, unless the bars already say so under them. */}
        {!busy &&
        blocked &&
        blocked !== customError &&
        (tracks.length > 0 || leadSheet) ? (
          <Hint>{blocked}.</Hint>
        ) : null}

        {busy && progress ? (
          <div
            ref={statusRef}
            tabIndex={-1}
            className="flex flex-col gap-2 outline-none"
            role="status"
          >
            <div className="flex items-center gap-2">
              <Loader2
                aria-hidden
                className="size-3.5 animate-spin text-daw-text-3 motion-reduce:animate-none"
              />
              <span className={`${TYPE_CLASS.body} text-daw-text-3`}>
                {progressLabel}
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="Export progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={barPct ?? undefined}
              data-testid="export-progress"
              data-indeterminate={barPct === null || undefined}
              className="h-1.5 w-full overflow-hidden rounded-full bg-daw-meter-track"
            >
              {barPct === null ? (
                // How far it is isn't known here: the whole bar breathes.
                <div className="h-full w-full rounded-full bg-daw-text opacity-40 motion-safe:animate-pulse" />
              ) : (
                <div
                  className="h-full rounded-full bg-daw-text transition-all duration-200"
                  style={{ width: `${barPct}%` }}
                />
              )}
            </div>
          </div>
        ) : null}
      </div>
    </DawDialog>
  );
}
