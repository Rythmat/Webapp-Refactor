// ── AudioMidiSourcePanel ───────────────────────────────────────────────────
// Compact control shown atop a MIDI (synth) track's controls: turns a live
// guitar or bass audio track into a MIDI controller that plays THIS synth.
//
// Only renders when the project has at least one guitar-fx/bass-fx track (i.e.
// there is something to source MIDI from). Writes the binding to the MIDI
// track's `audioMidiSource`; the detection engine is driven by
// useGuitarMidiDetection, which reconciles this binding.

import { useStore, type AudioMidiSource } from '@/daw/store';

export function AudioMidiSourcePanel({ trackId }: { trackId: string }) {
  const tracks = useStore((s) => s.tracks);
  const updateTrack = useStore((s) => s.updateTrack);

  const track = tracks.find((t) => t.id === trackId);
  const audioTracks = tracks.filter(
    (t) => t.instrument === 'guitar-fx' || t.instrument === 'bass-fx',
  );
  if (!track || audioTracks.length === 0) return null;

  const cfg: AudioMidiSource = track.audioMidiSource ?? {
    enabled: false,
    sourceTrackId: null,
    mode: 'mono',
  };
  const effectiveSourceId = cfg.sourceTrackId ?? audioTracks[0]?.id ?? null;
  const sourceTrack = audioTracks.find((t) => t.id === effectiveSourceId);
  const isBass = sourceTrack?.instrument === 'bass-fx';
  const hasDevice = Boolean(sourceTrack?.audioInputId);

  const patch = (p: Partial<AudioMidiSource>) =>
    updateTrack(trackId, { audioMidiSource: { ...cfg, ...p } });

  const onSelectSource = (id: string) => {
    const next = audioTracks.find((t) => t.id === id);
    // Bass is monophonic-only — force mono when a bass source is chosen.
    patch({
      sourceTrackId: id,
      mode: next?.instrument === 'bass-fx' ? 'mono' : cfg.mode,
    });
  };

  return (
    <div
      className="flex flex-col gap-1.5 px-3 py-2"
      style={{
        borderBottom: '1px solid var(--color-border, rgba(255,255,255,0.08))',
      }}
    >
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={cfg.enabled}
          onChange={(e) => patch({ enabled: e.target.checked })}
        />
        <span
          className="text-xs font-medium"
          style={{ color: 'var(--color-text)' }}
        >
          Play from instrument input
        </span>
      </label>

      {cfg.enabled && (
        <div className="flex flex-wrap items-center gap-2 pl-6">
          <select
            value={effectiveSourceId ?? ''}
            onChange={(e) => onSelectSource(e.target.value)}
            className="rounded px-1.5 py-1 text-xs"
            style={{
              background: 'var(--color-bg-elev, rgba(0,0,0,0.3))',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border, rgba(255,255,255,0.12))',
            }}
          >
            {audioTracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {isBass ? (
            <span
              className="text-xs"
              style={{ color: 'var(--color-text-dim)' }}
            >
              Mono
            </span>
          ) : (
            <div
              className="flex overflow-hidden rounded"
              style={{
                border: '1px solid var(--color-border, rgba(255,255,255,0.12))',
              }}
            >
              {(['mono', 'poly'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => patch({ mode: m })}
                  className="px-2 py-1 text-xs capitalize transition-colors"
                  style={{
                    background:
                      cfg.mode === m
                        ? 'var(--color-accent, #6366f1)'
                        : 'transparent',
                    color: cfg.mode === m ? '#fff' : 'var(--color-text-dim)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  title={
                    m === 'mono'
                      ? 'Single notes / bass lines (low latency)'
                      : 'Chords (higher latency)'
                  }
                >
                  {m}
                </button>
              ))}
            </div>
          )}

          {!hasDevice && (
            <span
              className="text-[10px]"
              style={{ color: 'var(--color-warning, #f59e0b)' }}
            >
              Select an input on the {isBass ? 'bass' : 'guitar'} track
            </span>
          )}
        </div>
      )}
    </div>
  );
}
