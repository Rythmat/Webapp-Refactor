import React from 'react';
import { useSynthStore } from '../../store';
import { Knob } from '../controls/Knob';
import styles from './MacroStrip.module.css';

const MACRO_ACCENT = '#b8a4e3';

/**
 * Eight macro knobs — each is a modulation source assignable to any matrix
 * destination, and each is reachable from DAW automation via MIDI CC 20-27.
 */
export const MacroStrip: React.FC = React.memo(() => {
  const macros = useSynthStore((s) => s.macros);
  const setMacroValue = useSynthStore((s) => s.setMacroValue);

  return (
    <div className={styles.strip}>
      <span className={styles.title}>MACROS</span>
      <div className={styles.knobs}>
        {macros.map((macro, i) => (
          <div
            key={i}
            title={`${macro.name} — DAW automation via CC ${20 + i}`}
          >
            <Knob
              label={`M${i + 1}`}
              value={macro.value}
              min={0}
              max={1}
              defaultValue={0}
              accent={MACRO_ACCENT}
              size={22}
              showValue={false}
              onChange={(v) => setMacroValue(i, v)}
            />
          </div>
        ))}
      </div>
    </div>
  );
});
