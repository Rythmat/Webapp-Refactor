import { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import { Loader2, Music4, Upload } from 'lucide-react';
import { useStore } from '@/daw/store';
import { trackEngineRegistry } from '@/daw/hooks/usePlaybackEngine';
import {
  getAudioBuffer,
  removeAudioBuffer,
  setAudioBuffer,
  setOriginalAudio,
  subscribeAudioBufferChanges,
} from '@/daw/audio/AudioBufferStore';
import { audioEngine } from '@/daw/audio/AudioEngine';
import {
  DEMO_CHOP_SAMPLE,
  DEFAULT_SAMPLER_ATTACK,
  DEFAULT_SAMPLER_FILTER_HZ,
  DEFAULT_SAMPLER_GAIN,
  DEFAULT_SAMPLER_MODE,
  DEFAULT_SAMPLER_RELEASE,
  SAMPLER_ACCEPTED_EXTENSIONS,
  SAMPLER_MAX_DURATION_SECONDS,
  SAMPLER_ROOT_NOTE_OPTIONS,
  mintSamplerSampleId,
  samplerBufferKey,
  samplerContentType,
  validateSamplerFile,
  type SamplerPlaybackMode,
  type SamplerSampleRef,
} from '@/daw/instruments/samplerChops';
import { useAuthToken } from '@/contexts/AuthContext/hooks/useAuthToken';
import { showError } from '@/components/utils/toast';
import { RotaryKnob } from './RotaryKnob';
import { SamplerWaveform } from './SamplerWaveform';
import { PianoKeyboard } from '@/daw/oracle-synth/components/keyboard/PianoKeyboard';

// Decode on the engine's context when running, else one shared fallback —
// mirrors load-audio.ts's getDecodeContext (module-private there).
let fallbackDecodeCtx: AudioContext | null = null;
function decodeContext(): AudioContext {
  if (audioEngine.getIsInitialized()) return audioEngine.getContext();
  if (!fallbackDecodeCtx) fallbackDecodeCtx = new AudioContext();
  return fallbackDecodeCtx;
}

const ACCEPT_ATTR = SAMPLER_ACCEPTED_EXTENSIONS.join(',');

const PLAYBACK_MODES: Array<{ id: SamplerPlaybackMode; label: string }> = [
  { id: 'classic', label: 'Classic' },
  { id: 'one-shot', label: '1-Shot' },
];

type SampleParamUpdates = Partial<
  Pick<
    SamplerSampleRef,
    | 'rootNote'
    | 'attack'
    | 'release'
    | 'mode'
    | 'gain'
    | 'startPct'
    | 'lengthPct'
    | 'filterOn'
    | 'filterHz'
    | 'filterRes'
  >
>;

/**
 * Controls-tab panel for 'sampler' (Chops) tracks, laid out after Ableton
 * Simpler's Sample tab: playback-mode rail | waveform with draggable trim
 * markers | sample param row | persistent Filter + envelope strip. All state
 * lives on Track.samplerSample — the playback engine owns store→engine apply.
 */
export function SamplerChopsView({ trackId }: { trackId: string }) {
  const track = useStore((s) => s.tracks.find((t) => t.id === trackId));
  const setSamplerSample = useStore((s) => s.setSamplerSample);
  const token = useAuthToken();
  const sample = track?.samplerSample;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [decoding, setDecoding] = useState(false);
  const [activeNotes, setActiveNotes] = useState<Set<number>>(() => new Set());

  // Re-render when the sample buffer lands (drop decode or rehydration fetch).
  const bufferReady = useSyncExternalStore(subscribeAudioBufferChanges, () =>
    sample ? !!getAudioBuffer(samplerBufferKey(sample.sampleId)) : false,
  );
  const buffer = sample
    ? getAudioBuffer(samplerBufferKey(sample.sampleId))
    : undefined;

  const commitSample = useCallback(
    (
      newBuffer: AudioBuffer,
      meta: {
        name: string;
        sourceUrl?: string;
        original?: { bytes: ArrayBuffer; contentType: string };
      },
    ) => {
      const prev = useStore
        .getState()
        .tracks.find((t) => t.id === trackId)?.samplerSample;
      const sampleId = mintSamplerSampleId();
      const key = samplerBufferKey(sampleId);
      setAudioBuffer(key, newBuffer);
      if (meta.original) {
        setOriginalAudio(key, meta.original.bytes, meta.original.contentType);
      }
      setSamplerSample(trackId, {
        sampleId,
        assetId: null,
        sourceUrl: meta.sourceUrl,
        // Every sample declares its own root — a kept-over root from the
        // previous sample would be silently wrong for the new audio.
        rootNote:
          meta.sourceUrl === DEMO_CHOP_SAMPLE.sourceUrl
            ? DEMO_CHOP_SAMPLE.rootNote
            : 'C4',
        attack: prev?.attack ?? DEFAULT_SAMPLER_ATTACK,
        release: prev?.release ?? DEFAULT_SAMPLER_RELEASE,
        name: meta.name,
        durationSeconds: newBuffer.duration,
        // Playback prefs survive a replace; the trim window resets (it was
        // measured against the previous audio).
        mode: prev?.mode ?? DEFAULT_SAMPLER_MODE,
        gain: prev?.gain ?? DEFAULT_SAMPLER_GAIN,
        filterOn: prev?.filterOn ?? false,
        filterHz: prev?.filterHz ?? DEFAULT_SAMPLER_FILTER_HZ,
        filterRes: prev?.filterRes ?? 0,
      });
      // setSamplerSample no-ops while a collaborator holds this track's lock —
      // don't leave an orphan buffer or pretend the load worked.
      const took =
        useStore.getState().tracks.find((t) => t.id === trackId)?.samplerSample
          ?.sampleId === sampleId;
      if (!took) {
        removeAudioBuffer(key);
        showError(
          'This track is being edited by a collaborator — sample not loaded.',
        );
        return;
      }
      // The replaced sample's buffer is unreachable now; free it.
      if (prev) removeAudioBuffer(samplerBufferKey(prev.sampleId));
      // Bundled samples rehydrate from their public URL; user files upload
      // eagerly so a reload can't lose them (save-time sweep is the retry).
      if (!meta.sourceUrl && token) {
        void import('@/lib/studio-assets/upload-pending')
          .then((m) => m.uploadSamplerSample(token, trackId))
          .catch((err) => {
            console.error('[Chops] sample upload failed:', err);
            showError(
              'Sample kept locally — cloud upload failed and will retry on save.',
            );
          });
      }
    },
    [trackId, setSamplerSample, token],
  );

  const handleFile = useCallback(
    async (file: File) => {
      const problem = validateSamplerFile(file.name, file.size);
      if (problem) {
        showError(problem);
        return;
      }
      setDecoding(true);
      try {
        const bytes = await file.arrayBuffer();
        // Clone before decode — some browsers neuter the input buffer, and we
        // keep the original bytes so upload can skip a lossy re-encode.
        const original = bytes.slice(0);
        const decoded = await decodeContext().decodeAudioData(bytes);
        if (decoded.duration > SAMPLER_MAX_DURATION_SECONDS) {
          showError(
            `That file is ${decoded.duration.toFixed(1)}s long — samples work best under ${SAMPLER_MAX_DURATION_SECONDS}s. Trim it and try again.`,
          );
          return;
        }
        commitSample(decoded, {
          name: file.name,
          original: {
            bytes: original,
            contentType: samplerContentType(file.name, file.type),
          },
        });
      } catch (err) {
        console.error('[Chops] decode failed:', err);
        showError(
          `Couldn't read "${file.name}" as audio — try a WAV or MP3 file.`,
        );
      } finally {
        setDecoding(false);
      }
    },
    [commitSample],
  );

  const handleDemo = useCallback(async () => {
    setDecoding(true);
    try {
      const url = DEMO_CHOP_SAMPLE.sourceUrl!;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`fetch ${resp.status}`);
      const bytes = await resp.arrayBuffer();
      const decoded = await decodeContext().decodeAudioData(bytes);
      commitSample(decoded, {
        name: DEMO_CHOP_SAMPLE.name ?? 'Demo chop',
        sourceUrl: url,
      });
    } catch (err) {
      console.error('[Chops] demo sample load failed:', err);
      showError("Couldn't load the demo sample.");
    } finally {
      setDecoding(false);
    }
  }, [commitSample]);

  const updateSample = useCallback(
    (updates: SampleParamUpdates) => {
      const current = useStore
        .getState()
        .tracks.find((t) => t.id === trackId)?.samplerSample;
      if (!current) return;
      setSamplerSample(trackId, { ...current, ...updates });
    },
    [trackId, setSamplerSample],
  );

  // ── Audition ──────────────────────────────────────────────────────────
  const handleNoteOn = useCallback(
    (note: number, velocity: number) => {
      trackEngineRegistry
        .get(trackId)
        ?.trackEngine.noteOn(note, Math.round(velocity * 127));
      setActiveNotes((prev) => new Set(prev).add(note));
    },
    [trackId],
  );
  const handleNoteOff = useCallback(
    (note: number) => {
      trackEngineRegistry.get(trackId)?.trackEngine.noteOff(note);
      setActiveNotes((prev) => {
        const next = new Set(prev);
        next.delete(note);
        return next;
      });
    },
    [trackId],
  );

  if (!track) return null;

  // A sample restored from a save that was never uploaded (no assetId, no
  // sourceUrl) has unrecoverable bytes — say so instead of spinning forever.
  const unrecoverable =
    !!sample &&
    !bufferReady &&
    !decoding &&
    !sample.sourceUrl &&
    !sample.assetId;

  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(true);
    },
    onDragLeave: (e: React.DragEvent) => {
      // Ignore leave events fired when the drag passes over child elements.
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setDragActive(false);
      }
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) void handleFile(file);
    },
  };

  const mode = sample?.mode ?? DEFAULT_SAMPLER_MODE;
  const startPct = sample?.startPct ?? 0;
  const lengthPct = sample?.lengthPct ?? 100;

  return (
    <div
      data-tutorial-id="sampler-view"
      className="flex h-full flex-col overflow-hidden"
    >
      {/* ── Toolbar ── */}
      <div
        className="flex shrink-0 items-center gap-2 border-b px-3 py-1.5"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <span
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--color-text-dim)' }}
        >
          Sampler
        </span>
        {sample && (
          <span
            className="max-w-[180px] truncate rounded-lg px-2 py-0.5 text-[11px]"
            style={{
              backgroundColor: 'var(--color-surface-2)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
            title={sample.name}
          >
            {sample.name ?? 'Sample'}
          </span>
        )}
        {(decoding || (sample && !bufferReady && !unrecoverable)) && (
          <Loader2
            size={12}
            className="animate-spin"
            style={{ color: 'var(--color-text-dim)' }}
          />
        )}
        {sample && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="ml-auto cursor-pointer rounded-lg px-2 py-0.5 text-[11px] transition-colors"
            style={{
              backgroundColor: 'var(--color-surface-2)',
              color: 'var(--color-text-dim)',
              border: '1px solid var(--color-border)',
            }}
          >
            Replace…
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = '';
        }}
      />

      {/* ── Mode rail + waveform ── */}
      <div className="flex min-h-0 flex-1">
        <div
          className="flex w-[64px] shrink-0 flex-col border-r"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {PLAYBACK_MODES.map((m) => {
            const active = sample && mode === m.id;
            return (
              <button
                key={m.id}
                data-tutorial-id={`sampler-mode-${m.id}`}
                disabled={!sample}
                onClick={() => updateSample({ mode: m.id })}
                className="flex-1 cursor-pointer border-b text-[10px] font-semibold uppercase tracking-wide transition-colors disabled:cursor-default disabled:opacity-40"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: active
                    ? 'var(--color-surface-2)'
                    : 'transparent',
                  color: active
                    ? 'var(--color-accent)'
                    : 'var(--color-text-dim)',
                }}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        <div
          className="relative min-h-[64px] flex-1"
          {...dropHandlers}
          style={{
            outline:
              dragActive && sample ? '2px solid var(--color-accent)' : 'none',
            outlineOffset: -2,
          }}
        >
          {!sample ? (
            <div
              data-tutorial-id="sampler-dropzone"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-1.5"
              style={{
                backgroundColor: dragActive
                  ? 'rgba(126,207,207,0.08)'
                  : 'transparent',
                outline: dragActive ? '2px solid var(--color-accent)' : 'none',
                outlineOffset: -2,
                transition: 'background-color 150ms ease',
              }}
            >
              {decoding ? (
                <Loader2
                  size={18}
                  className="animate-spin"
                  style={{ color: 'var(--color-text-dim)' }}
                />
              ) : (
                <Upload size={18} style={{ color: 'var(--color-text-dim)' }} />
              )}
              <div
                className="text-xs font-medium"
                style={{ color: 'var(--color-text-dim)' }}
              >
                Drop Sample Here
              </div>
              <button
                data-tutorial-id="sampler-demo-button"
                onClick={(e) => {
                  e.stopPropagation();
                  void handleDemo();
                }}
                className="mt-1 flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1 text-[11px] font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--color-surface-2)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <Music4 size={12} />
                Use demo sample
              </button>
            </div>
          ) : unrecoverable ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
              <span className="text-xs" style={{ color: 'var(--color-text)' }}>
                This sample couldn’t be restored — its audio was never uploaded
                before the project closed.
              </span>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer rounded-lg px-3 py-1 text-[11px] font-medium"
                style={{
                  backgroundColor: 'var(--color-surface-2)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                }}
              >
                Load a new sample
              </button>
            </div>
          ) : !bufferReady || !buffer ? (
            <div className="absolute inset-0 flex items-center justify-center gap-2">
              <Loader2
                size={14}
                className="animate-spin"
                style={{ color: 'var(--color-text-dim)' }}
              />
              <span
                className="text-xs"
                style={{ color: 'var(--color-text-dim)' }}
              >
                Loading sample…
              </span>
            </div>
          ) : (
            <SamplerWaveform
              buffer={buffer}
              startPct={startPct}
              lengthPct={lengthPct}
              onTrimCommit={(s, l) =>
                updateSample({ startPct: s, lengthPct: l })
              }
            />
          )}
        </div>
      </div>

      {/* ── Sample param row ── */}
      <div
        className="flex shrink-0 items-center gap-4 border-t px-3 py-1"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <RotaryKnob
          label="Gain"
          value={sample?.gain ?? DEFAULT_SAMPLER_GAIN}
          min={0}
          max={2}
          size={34}
          formatValue={(v) =>
            v <= 0.011 ? '-∞ dB' : `${(20 * Math.log10(v)).toFixed(1)}dB`
          }
          onChange={(v) => updateSample({ gain: v })}
        />
        {(
          [
            ['Start', startPct],
            ['Length', lengthPct],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="flex flex-col items-center">
            <span
              className="text-[9px] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--color-text-dim)' }}
            >
              {label}
            </span>
            <span
              className="text-[11px] tabular-nums"
              style={{ color: 'var(--color-accent)' }}
            >
              {value.toFixed(2)}%
            </span>
          </div>
        ))}
        <label
          className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--color-text-dim)' }}
        >
          Root
          <select
            data-tutorial-id="sampler-root-note"
            value={sample?.rootNote ?? 'C4'}
            disabled={!sample}
            onChange={(e) => updateSample({ rootNote: e.target.value })}
            className="rounded px-2 py-1 text-[11px] disabled:opacity-40"
            style={{
              backgroundColor: 'var(--color-surface-3)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
          >
            {SAMPLER_ROOT_NOTE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        {sample?.durationSeconds != null && (
          <span
            className="ml-auto text-[10px] tabular-nums"
            style={{ color: 'var(--color-text-dim)' }}
          >
            {sample.durationSeconds.toFixed(2)}s
          </span>
        )}
      </div>

      {/* ── Bottom strip: Filter | Envelope (Simpler-style) ── */}
      <div
        className="flex shrink-0 items-center gap-4 border-t px-3 py-1"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <button
          data-tutorial-id="sampler-filter"
          disabled={!sample}
          onClick={() => updateSample({ filterOn: !sample?.filterOn })}
          className="flex cursor-pointer items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider disabled:cursor-default disabled:opacity-40"
          style={{ color: 'var(--color-text-dim)' }}
        >
          <span
            className="inline-block h-2.5 w-2.5 rounded-[2px]"
            style={{
              backgroundColor: sample?.filterOn
                ? 'var(--color-accent)'
                : 'var(--color-surface-3)',
              border: '1px solid var(--color-border)',
            }}
          />
          Filter
        </button>
        <RotaryKnob
          label="Freq"
          value={sample?.filterHz ?? DEFAULT_SAMPLER_FILTER_HZ}
          min={40}
          max={22000}
          size={34}
          log
          formatValue={(v) =>
            v >= 1000 ? `${(v / 1000).toFixed(1)}kHz` : `${Math.round(v)}Hz`
          }
          onChange={(v) => updateSample({ filterHz: v })}
        />
        <RotaryKnob
          label="Res"
          value={sample?.filterRes ?? 0}
          min={0}
          max={100}
          size={34}
          formatValue={(v) => `${Math.round(v)}%`}
          onChange={(v) => updateSample({ filterRes: v })}
        />
        <div className="h-6 w-px bg-white/10" />
        <RotaryKnob
          label="Attack"
          value={sample?.attack ?? DEFAULT_SAMPLER_ATTACK}
          min={0}
          max={0.5}
          size={34}
          formatValue={(v) => `${Math.round(v * 1000)}ms`}
          onChange={(v) => updateSample({ attack: v })}
        />
        <RotaryKnob
          label="Release"
          value={sample?.release ?? DEFAULT_SAMPLER_RELEASE}
          min={0.01}
          max={2}
          size={34}
          formatValue={(v) => `${v.toFixed(2)}s`}
          onChange={(v) => updateSample({ release: v })}
        />
      </div>

      {/* ── Audition keyboard ── */}
      <div
        className="relative h-[76px] shrink-0 border-t"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div style={{ position: 'absolute', inset: 0 }}>
          <PianoKeyboard
            startNote={36}
            endNote={96}
            activeNotes={activeNotes}
            onNoteOn={handleNoteOn}
            onNoteOff={handleNoteOff}
          />
        </div>
      </div>
    </div>
  );
}
