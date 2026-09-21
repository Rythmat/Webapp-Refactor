import {
  MAX_PRACTICE_BPM,
  MIN_PRACTICE_BPM,
} from '../audio/practiceSettingsStore';
import { usePracticeSettings } from '../audio/usePracticeSettings';
import { MetronomeToggle } from './MetronomeToggle';

interface PracticeControlsProps {
  /**
   * The tempo this activity was written for. Shown when no override is set,
   * and the value the tempo slider starts from.
   */
  activityBpm: number;
  /** Slider track length in pixels. Matches LessonVolumeDial's default. */
  height?: number;
}

/**
 * Metronome on/off plus a tempo override, sitting alongside the volume dial in
 * the theory activities. Both settings are shared and persisted, so a tempo you
 * dial in for one scale carries into the next activity.
 *
 * Out-of-time activities don't render this — there is no pulse to control. The
 * genre lessons use <MetronomeToggle> alone, since they already carry their own
 * tempo slider tied to each flow's tempo range.
 */
export function PracticeControls({
  activityBpm,
  height = 80,
}: PracticeControlsProps) {
  const { tempoBpm, setTempoBpm } = usePracticeSettings();

  const effectiveBpm = tempoBpm ?? activityBpm;
  const isOverridden = tempoBpm !== null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        flexShrink: 0,
        fontSize: '11px',
        color: '#888',
        userSelect: 'none',
      }}
    >
      <MetronomeToggle height={height} />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 0',
          height: `${height + 28}px`,
        }}
      >
        <span
          style={{
            fontVariantNumeric: 'tabular-nums',
            color: isOverridden ? '#4a9eff' : '#aaa',
            lineHeight: 1,
          }}
        >
          {effectiveBpm}
        </span>
        <input
          id="practice-tempo"
          type="range"
          min={MIN_PRACTICE_BPM}
          max={MAX_PRACTICE_BPM}
          value={effectiveBpm}
          onChange={(e) => setTempoBpm(Number(e.target.value))}
          // Double-click hands the activity back its own tempo.
          onDoubleClick={() => setTempoBpm(null)}
          style={{
            writingMode: 'vertical-lr',
            direction: 'rtl',
            width: '20px',
            height: `${height}px`,
            accentColor: isOverridden ? '#4a9eff' : '#777',
            cursor: 'pointer',
          }}
          aria-label="Practice tempo in beats per minute"
          aria-valuetext={`${effectiveBpm} BPM${isOverridden ? '' : ' (activity default)'}`}
          title={
            isOverridden
              ? `${effectiveBpm} BPM — double-click to return to this activity's ${activityBpm} BPM`
              : `${activityBpm} BPM — this activity's own tempo. Drag to slow it down.`
          }
        />
        <label
          htmlFor="practice-tempo"
          style={{ cursor: 'pointer', lineHeight: 1 }}
        >
          BPM
        </label>
      </div>
    </div>
  );
}
