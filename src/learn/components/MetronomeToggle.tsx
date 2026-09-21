import { usePracticeSettings } from '../audio/usePracticeSettings';

interface MetronomeToggleProps {
  /** Match the neighbouring dial's overall height so the row lines up. */
  height?: number;
}

/**
 * Metronome on/off, reading the shared Learn practice settings.
 *
 * Used on its own in the genre lessons (which already have their own tempo
 * slider) and inside <PracticeControls> in the theory activities.
 */
export function MetronomeToggle({ height = 80 }: MetronomeToggleProps) {
  const { metronomeEnabled, setMetronomeEnabled } = usePracticeSettings();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 0',
        height: `${height + 28}px`,
        fontSize: '11px',
        color: '#888',
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      <span style={{ lineHeight: 1, color: '#aaa' }}>
        {metronomeEnabled ? 'On' : 'Off'}
      </span>
      <button
        type="button"
        onClick={() => setMetronomeEnabled(!metronomeEnabled)}
        aria-pressed={metronomeEnabled}
        aria-label="Metronome"
        title={
          metronomeEnabled
            ? 'Metronome on — click to silence the count'
            : 'Metronome off — click to hear the count'
        }
        style={{
          width: '26px',
          height: '26px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          background: metronomeEnabled
            ? 'rgba(74, 158, 255, 0.18)'
            : 'rgba(255,255,255,0.04)',
          border: `1px solid ${metronomeEnabled ? '#4a9eff' : '#444'}`,
          color: metronomeEnabled ? '#4a9eff' : '#777',
          lineHeight: 1,
          padding: 0,
        }}
      >
        {/* A metronome body — filled when on, outlined when off. */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M6 1.5h4l3 13H3l3-13Z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
            fill={metronomeEnabled ? 'currentColor' : 'none'}
            fillOpacity={metronomeEnabled ? 0.25 : 0}
          />
          <path
            d="M11 3.5 5.5 10"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <label style={{ lineHeight: 1 }}>Click</label>
    </div>
  );
}
