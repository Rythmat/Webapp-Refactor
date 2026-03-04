import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { trackEngineRegistry } from '@/daw/hooks/usePlaybackEngine';
import { DrumMachineEngine, DRUM_KITS } from '@/daw/instruments/DrumMachineEngine';
import type { DrumKitId } from '@/daw/instruments/DrumMachineEngine';

interface DrumKitSelectorProps {
  trackId: string;
}

export function DrumKitSelector({ trackId }: DrumKitSelectorProps) {
  const [currentKit, setCurrentKit] = useState<DrumKitId>('natural');
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Sync current kit from the engine on mount
  useEffect(() => {
    const state = trackEngineRegistry.get(trackId);
    if (state?.instrument instanceof DrumMachineEngine) {
      setCurrentKit(state.instrument.getKit());
    }
  }, [trackId]);

  const handleKitChange = useCallback(
    async (kitId: DrumKitId) => {
      const state = trackEngineRegistry.get(trackId);
      if (!(state?.instrument instanceof DrumMachineEngine)) return;

      setLoading(true);
      setDropdownOpen(false);
      try {
        await state.instrument.setKit(kitId);
        setCurrentKit(kitId);
      } catch (err) {
        console.error('[DrumKitSelector] Failed to load kit:', err);
      } finally {
        setLoading(false);
      }
    },
    [trackId],
  );

  const currentLabel = DRUM_KITS.find((k) => k.id === currentKit)?.label ?? currentKit;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center px-4 py-2 shrink-0 gap-4 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <span
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--color-text-dim)' }}
        >
          Drum Kit
        </span>

        {/* Kit selector dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors"
            style={{
              backgroundColor: 'var(--color-surface-2)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
          >
            {loading ? (
              <Loader2 size={12} className="animate-spin" style={{ color: 'var(--color-text-dim)' }} />
            ) : null}
            {currentLabel}
            <ChevronDown size={12} style={{ color: 'var(--color-text-dim)' }} />
          </button>

          {dropdownOpen && (
            <div
              className="absolute top-full left-0 mt-1 rounded-lg overflow-hidden z-30"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                minWidth: 160,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              {DRUM_KITS.map((kit) => (
                <button
                  key={kit.id}
                  onClick={() => handleKitChange(kit.id)}
                  className="block w-full text-left px-4 py-2 text-xs cursor-pointer transition-colors"
                  style={{
                    backgroundColor: kit.id === currentKit ? 'var(--color-surface-2)' : 'transparent',
                    color: kit.id === currentKit ? 'var(--color-text)' : 'var(--color-text-dim)',
                    fontWeight: kit.id === currentKit ? 600 : 400,
                    border: 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (kit.id !== currentKit) e.currentTarget.style.backgroundColor = 'var(--color-surface-2)';
                  }}
                  onMouseLeave={(e) => {
                    if (kit.id !== currentKit) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {kit.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Drum pad area */}
      <div className="flex-1 flex items-center justify-center">
        <DrumPads trackId={trackId} />
      </div>
    </div>
  );
}

// ── Drum Pads ──────────────────────────────────────────────────────────

const DRUM_PAD_MAP = [
  { label: 'Kick', note: 36 },
  { label: 'Snare', note: 38 },
  { label: 'Sidestick', note: 40 },
  { label: 'HH Closed', note: 42 },
  { label: 'HH Pedal', note: 44 },
  { label: 'HH Open', note: 46 },
  { label: 'Tom Lo', note: 41 },
  { label: 'Tom Mid', note: 45 },
  { label: 'Tom Hi', note: 48 },
  { label: 'Crash', note: 49 },
  { label: 'Ride', note: 51 },
] as const;

function DrumPads({ trackId }: { trackId: string }) {
  const handlePadDown = useCallback(
    (note: number) => {
      const state = trackEngineRegistry.get(trackId);
      if (state) state.trackEngine.noteOn(note, 100);
    },
    [trackId],
  );

  return (
    <div className="grid grid-cols-4 gap-2 p-4">
      {DRUM_PAD_MAP.map((pad) => (
        <button
          key={pad.note}
          onMouseDown={() => handlePadDown(pad.note)}
          className="flex items-center justify-center rounded-lg cursor-pointer transition-all active:scale-95"
          style={{
            width: 64,
            height: 64,
            backgroundColor: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-dim)',
            fontSize: 10,
            fontWeight: 500,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-surface-3)';
            e.currentTarget.style.borderColor = 'var(--color-accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-surface-2)';
            e.currentTarget.style.borderColor = 'var(--color-border)';
          }}
        >
          {pad.label}
        </button>
      ))}
    </div>
  );
}
