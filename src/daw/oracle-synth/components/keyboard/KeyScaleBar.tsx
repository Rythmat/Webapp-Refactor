import React, { useMemo } from 'react';
import { MODE_GROUPS, MODE_DISPLAY } from '@prism/engine';
import { useSynthStore } from '../../store';
import { NOTE_NAMES } from '../../audio/constants';
import type { SnapMode } from '../../audio/ScaleQuantizer';
import { Toggle } from '../controls/Toggle';
import { Dropdown } from '../controls/Dropdown';
import { SegmentedControl } from '../controls/SegmentedControl';
import styles from './KeyScaleBar.module.css';

const KEYSCALE_ACCENT = '#8fd694';

const KEY_OPTIONS = NOTE_NAMES.map((name, pc) => ({
  value: String(pc),
  label: name,
}));

const SNAP_OPTIONS = [
  { value: 'nearest', label: 'NEAR' },
  { value: 'down', label: 'DOWN' },
  { value: 'up', label: 'UP' },
  { value: 'fold', label: 'FOLD' },
];

interface KeyScaleBarProps {
  /** Project-detected key when hosted in the DAW (null = none detected). */
  songKey?: { rootPc: number; mode: string } | null;
  /** Trigger project analysis when no key has been detected yet. */
  onRequestAnalyze?: () => void;
}

/**
 * Key/Scale lock bar (Serum 2-style keyboard Key+Scale, UNISON-powered):
 * quantizes every note path into the chosen key, with "snap to song key"
 * following the project's live-detected key.
 */
export const KeyScaleBar: React.FC<KeyScaleBarProps> = React.memo(
  ({ songKey = null, onRequestAnalyze }) => {
    const keyScale = useSynthStore((s) => s.keyScale);
    const setKeyScale = useSynthStore((s) => s.setKeyScale);

    const scaleOptions = useMemo(
      () =>
        MODE_GROUPS.flatMap((group) =>
          group.modes.map((mode) => ({
            value: mode,
            label: MODE_DISPLAY[mode] ?? mode,
          })),
        ),
      [],
    );

    const inDaw = onRequestAnalyze !== undefined || songKey !== null;

    const handleSnapToSongKey = () => {
      if (songKey) {
        setKeyScale({
          enabled: true,
          followProjectKey: true,
          rootPc: songKey.rootPc,
          mode: songKey.mode,
        });
      } else {
        onRequestAnalyze?.();
      }
    };

    return (
      <div className={styles.bar}>
        <Toggle
          value={keyScale.enabled}
          label="KEY LOCK"
          accent={KEYSCALE_ACCENT}
          onChange={(v) => setKeyScale({ enabled: v })}
        />
        <Dropdown
          value={String(keyScale.rootPc)}
          options={KEY_OPTIONS}
          onChange={(v) =>
            setKeyScale({ rootPc: Number(v), followProjectKey: false })
          }
        />
        <Dropdown
          value={keyScale.mode}
          options={scaleOptions}
          onChange={(v) => setKeyScale({ mode: v, followProjectKey: false })}
        />
        <SegmentedControl
          value={keyScale.snapMode}
          options={SNAP_OPTIONS}
          accent={KEYSCALE_ACCENT}
          onChange={(v) => setKeyScale({ snapMode: v as SnapMode })}
        />
        {inDaw && (
          <button
            className={`${styles.songKeyBtn} ${
              keyScale.followProjectKey && keyScale.enabled
                ? styles.songKeyActive
                : ''
            }`}
            onClick={handleSnapToSongKey}
            title={
              songKey
                ? `Follow the project's detected key (${NOTE_NAMES[songKey.rootPc]} ${MODE_DISPLAY[songKey.mode] ?? songKey.mode})`
                : 'No key detected yet — run project analysis'
            }
          >
            {songKey ? 'SNAP TO SONG KEY' : 'ANALYZE KEY'}
          </button>
        )}
      </div>
    );
  },
);
