import React from 'react';
import { useSynthStore } from '../../store';
import { ModulationSlot } from './ModulationSlot';
import styles from './ModulationPanel.module.css';

export const ModulationPanel: React.FC = React.memo(() => {
  const modRoutes = useSynthStore((s) => s.modRoutes);
  const addModRoute = useSynthStore((s) => s.addModRoute);
  const removeModRoute = useSynthStore((s) => s.removeModRoute);
  const updateModRoute = useSynthStore((s) => s.updateModRoute);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>MODULATION</span>
        <button className={styles.addBtn} onClick={addModRoute}>
          + ADD
        </button>
      </div>

      <div className={styles.routes}>
        {modRoutes.length === 0 && (
          <div className={styles.empty}>
            No mod routes. Click + ADD to create one.
          </div>
        )}
        {modRoutes.map((route) => (
          <ModulationSlot
            key={route.id}
            route={route}
            onUpdate={updateModRoute}
            onRemove={removeModRoute}
          />
        ))}
      </div>
    </div>
  );
});
