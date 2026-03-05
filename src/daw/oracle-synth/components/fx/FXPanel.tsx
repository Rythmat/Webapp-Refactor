import React, { useCallback, useMemo } from 'react';
import { useSynthStore } from '../../store';
import type { FXType } from '../../audio/types';
import { FXSlot } from './FXSlot';
import styles from './FXPanel.module.css';

export const FXPanel: React.FC = React.memo(() => {
  const fx = useSynthStore((s) => s.fx);
  const fxRoutes = useSynthStore((s) => s.fxRoutes);
  const addFXRoute = useSynthStore((s) => s.addFXRoute);
  const removeFXRoute = useSynthStore((s) => s.removeFXRoute);
  const updateFXRoute = useSynthStore((s) => s.updateFXRoute);

  const setDriveParam = useSynthStore((s) => s.setDriveParam);
  const setChorusParam = useSynthStore((s) => s.setChorusParam);
  const setPhaserParam = useSynthStore((s) => s.setPhaserParam);
  const setDelayParam = useSynthStore((s) => s.setDelayParam);
  const setCompressorParam = useSynthStore((s) => s.setCompressorParam);

  const usedTypes = useMemo(
    () => new Set(fxRoutes.map((r) => r.type)),
    [fxRoutes],
  );

  const handleParamChange = useCallback(
    (type: FXType, key: string, value: number | boolean) => {
      switch (type) {
        case 'drive':
          setDriveParam(key as keyof typeof fx.drive, value as never);
          break;
        case 'chorus':
          setChorusParam(key as keyof typeof fx.chorus, value as never);
          break;
        case 'phaser':
          setPhaserParam(key as keyof typeof fx.phaser, value as never);
          break;
        case 'delay':
          setDelayParam(key as keyof typeof fx.delay, value as never);
          break;
        case 'compressor':
          setCompressorParam(key as keyof typeof fx.compressor, value as never);
          break;
      }
    },
    [
      setDriveParam,
      setChorusParam,
      setPhaserParam,
      setDelayParam,
      setCompressorParam,
    ],
  );

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>FX</span>
        {fxRoutes.length < 5 && (
          <button className={styles.addBtn} onClick={addFXRoute}>
            + ADD
          </button>
        )}
      </div>

      <div className={styles.routes}>
        {fxRoutes.length === 0 && (
          <div className={styles.empty}>
            No effects. Click + ADD to create one.
          </div>
        )}
        {fxRoutes.map((route) => (
          <FXSlot
            key={route.id}
            route={route}
            fx={fx}
            usedTypes={usedTypes}
            onUpdate={updateFXRoute}
            onRemove={removeFXRoute}
            onParamChange={handleParamChange}
          />
        ))}
      </div>
    </div>
  );
});
