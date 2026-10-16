import React, { useCallback, useMemo } from 'react';
import { useSynthStore } from '../../store';
import type { FXRoute, FXType } from '../../audio/types';
import { FXSlot } from './FXSlot';
import { derivedSlotType, projectFxSlots } from './fxSlots';
import styles from './FXPanel.module.css';

export const FXPanel: React.FC = React.memo(() => {
  const fx = useSynthStore((s) => s.fx);
  const fxRoutes = useSynthStore((s) => s.fxRoutes);
  const addFXRoute = useSynthStore((s) => s.addFXRoute);
  const ensureFXRoute = useSynthStore((s) => s.ensureFXRoute);
  const removeFXRoute = useSynthStore((s) => s.removeFXRoute);
  const updateFXRoute = useSynthStore((s) => s.updateFXRoute);

  const setDriveParam = useSynthStore((s) => s.setDriveParam);
  const setChorusParam = useSynthStore((s) => s.setChorusParam);
  const setPhaserParam = useSynthStore((s) => s.setPhaserParam);
  const setDelayParam = useSynthStore((s) => s.setDelayParam);
  const setReverbParam = useSynthStore((s) => s.setReverbParam);
  const setCompressorParam = useSynthStore((s) => s.setCompressorParam);

  // One slot per effect the chain runs or the patch routes (fxSlots.ts).
  const slots = useMemo(() => projectFxSlots(fx, fxRoutes), [fx, fxRoutes]);
  const usedTypes = useMemo(
    () => new Set(slots.map((slot) => slot.route.type)),
    [slots],
  );

  // A derived slot's edits go to a real route, made on first use.
  const routeIdFor = useCallback(
    (id: string) => {
      const type = derivedSlotType(id);
      return type ? ensureFXRoute(type) : id;
    },
    [ensureFXRoute],
  );
  const handleUpdate = useCallback(
    (id: string, updates: Partial<FXRoute>) =>
      updateFXRoute(routeIdFor(id), updates),
    [routeIdFor, updateFXRoute],
  );
  const handleRemove = useCallback(
    (id: string) => removeFXRoute(routeIdFor(id)),
    [routeIdFor, removeFXRoute],
  );

  const handleParamChange = useCallback(
    (type: FXType, key: string, value: number | boolean) => {
      // Switching off an effect that has no route keeps its slot: the route
      // is made first, so the slot stays as an "off" effect.
      if (key === 'enabled') ensureFXRoute(type);
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
        case 'reverb':
          setReverbParam(key as keyof typeof fx.reverb, value as never);
          break;
        case 'compressor':
          setCompressorParam(key as keyof typeof fx.compressor, value as never);
          break;
      }
    },
    [
      ensureFXRoute,
      setDriveParam,
      setChorusParam,
      setPhaserParam,
      setDelayParam,
      setReverbParam,
      setCompressorParam,
    ],
  );

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>FX</span>
        {slots.length < 6 && (
          <button className={styles.addBtn} onClick={addFXRoute}>
            + ADD
          </button>
        )}
      </div>

      <div className={styles.routes}>
        {slots.length === 0 && (
          <div className={styles.empty}>
            No effects. Click + ADD to create one.
          </div>
        )}
        {slots.map(({ route }) => (
          <FXSlot
            key={route.type}
            route={route}
            fx={fx}
            usedTypes={usedTypes}
            onUpdate={handleUpdate}
            onRemove={handleRemove}
            onParamChange={handleParamChange}
          />
        ))}
      </div>
    </div>
  );
});
