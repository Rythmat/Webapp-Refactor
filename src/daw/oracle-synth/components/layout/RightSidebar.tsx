import React from 'react';
import { useSynthStore } from '../../store';
import { Knob } from '../controls/Knob';
import { SegmentedControl } from '../controls/SegmentedControl';
import { VoiceMode } from '../../audio/types';
import styles from './RightSidebar.module.css';

const VOICE_MODES: { value: VoiceMode; label: string }[] = [
  { value: 'poly', label: 'POLY' },
  { value: 'mono', label: 'MONO' },
  { value: 'legato', label: 'LEG' },
];

export const RightSidebar: React.FC = React.memo(() => {
  const voiceMode = useSynthStore((s) => s.voiceMode);
  const voiceCount = useSynthStore((s) => s.voiceCount);
  const glide = useSynthStore((s) => s.glide);
  const spread = useSynthStore((s) => s.spread);
  const setVoiceMode = useSynthStore((s) => s.setVoiceMode);
  const setVoiceCount = useSynthStore((s) => s.setVoiceCount);
  const setGlide = useSynthStore((s) => s.setGlide);
  const setSpread = useSynthStore((s) => s.setSpread);

  return (
    <div className={styles.sidebar}>
      <span className={styles.title}>VOICE</span>

      <SegmentedControl
        options={VOICE_MODES}
        value={voiceMode}
        onChange={(v) => setVoiceMode(v as VoiceMode)}
      />

      <div className={styles.knobGrid}>
        <Knob
          label="VOICES"
          value={voiceCount}
          min={1}
          max={16}
          step={1}
          defaultValue={8}
          accent="#888"
          size={26}
          horizontal
          labelLeft
          formatValue={(v) => String(Math.round(v))}
          onChange={(v) => setVoiceCount(Math.round(v))}
        />
        <Knob
          label="GLIDE"
          value={glide}
          min={0}
          max={2}
          defaultValue={0}
          accent="#888"
          size={26}
          horizontal
          labelLeft
          formatValue={(v) =>
            v >= 1 ? `${v.toFixed(1)}s` : `${Math.round(v * 1000)}ms`
          }
          onChange={setGlide}
        />
        <Knob
          label="SPREAD"
          value={spread}
          min={0}
          max={1}
          defaultValue={0}
          accent="#888"
          size={26}
          horizontal
          labelLeft
          formatValue={(v) => `${Math.round(v * 100)}%`}
          onChange={setSpread}
        />
      </div>
    </div>
  );
});
