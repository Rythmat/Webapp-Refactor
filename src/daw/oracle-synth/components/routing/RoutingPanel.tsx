import React, { useCallback } from 'react';
import { useSynthStore } from '../../store';
import { SourceId } from '../../audio/types';
import styles from './RoutingPanel.module.css';

const SOURCES: { id: SourceId; label: string }[] = [
  { id: 'osc1', label: 'OSC1' },
  { id: 'osc2', label: 'OSC2' },
  { id: 'sub', label: 'SUB' },
  { id: 'noise', label: 'NOISE' },
];

const ROWS = [
  { type: 'filter' as const, index: 0 as const, label: 'FLT 1' },
  { type: 'filter' as const, index: 1 as const, label: 'FLT 2' },
  { type: 'env' as const, index: 0 as const, label: 'ENV 1' },
  { type: 'env' as const, index: 1 as const, label: 'ENV 2' },
];

export const RoutingPanel: React.FC = React.memo(() => {
  const routing = useSynthStore((s) => s.routing);
  const toggleFilterSource = useSynthStore((s) => s.toggleFilterSource);
  const toggleEnvSource = useSynthStore((s) => s.toggleEnvSource);

  const isActive = useCallback(
    (type: 'filter' | 'env', index: 0 | 1, source: SourceId): boolean => {
      if (type === 'filter') {
        const sources =
          index === 0
            ? routing.filterRouting.filter1Sources
            : routing.filterRouting.filter2Sources;
        return sources.includes(source);
      } else {
        const sources =
          index === 0
            ? routing.envelopeRouting.env1Sources
            : routing.envelopeRouting.env2Sources;
        return sources.includes(source);
      }
    },
    [routing],
  );

  const handleToggle = useCallback(
    (type: 'filter' | 'env', index: 0 | 1, source: SourceId) => {
      if (type === 'filter') {
        toggleFilterSource(index, source);
      } else {
        toggleEnvSource(index, source);
      }
    },
    [toggleFilterSource, toggleEnvSource],
  );

  return (
    <div className={styles.panel}>
      <span className={styles.title}>ROUTING</span>

      <div className={styles.grid}>
        {/* Column headers */}
        <div className={styles.cornerCell} />
        {SOURCES.map((src) => (
          <div key={src.id} className={styles.colHeader}>
            {src.label}
          </div>
        ))}

        {/* Rows */}
        {ROWS.map((row) => (
          <React.Fragment key={`${row.type}-${row.index}`}>
            <div className={styles.rowHeader}>{row.label}</div>
            {SOURCES.map((src) => {
              const active = isActive(row.type, row.index, src.id);
              return (
                <button
                  key={src.id}
                  className={`${styles.cell} ${active ? styles.active : ''}`}
                  onClick={() => handleToggle(row.type, row.index, src.id)}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
});
