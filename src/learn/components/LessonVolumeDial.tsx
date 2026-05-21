import { useLessonVolume } from '../audio/useLessonVolume';

interface LessonVolumeDialProps {
  /** Slider track length in pixels. Default 80, matches a 120px keyboard row. */
  height?: number;
}

/**
 * Compact vertical volume slider that sits alongside the lesson keyboard.
 * Reads/writes the shared lesson volume store so the same value applies in
 * every lesson surface (genre, fundamentals, theory activities).
 */
export function LessonVolumeDial({ height = 80 }: LessonVolumeDialProps) {
  const { volume, setVolume } = useLessonVolume();
  const percent = Math.round(volume * 100);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 0',
        fontSize: '11px',
        color: '#888',
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontVariantNumeric: 'tabular-nums',
          color: '#aaa',
          lineHeight: 1,
        }}
      >
        {percent}
      </span>
      <input
        id="lesson-volume"
        type="range"
        min={0}
        max={100}
        value={percent}
        onChange={(e) => setVolume(Number(e.target.value) / 100)}
        style={{
          writingMode: 'vertical-lr',
          direction: 'rtl',
          width: '20px',
          height: `${height}px`,
          accentColor: '#4a9eff',
          cursor: 'pointer',
        }}
        aria-label="Lesson volume"
        title="Volume — metronome and lesson playback"
      />
      <label
        htmlFor="lesson-volume"
        style={{ cursor: 'pointer', lineHeight: 1 }}
      >
        {volume <= 0.001 ? 'Mute' : 'Vol'}
      </label>
    </div>
  );
}
