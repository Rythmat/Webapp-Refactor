import { useState, useCallback } from 'react';
import { DawDock } from './minimal-dock';

export function DockDemo() {
  const [mixerOpen, setMixerOpen] = useState(false);
  const [addTrackOpen, setAddTrackOpen] = useState(false);
  const [fxOpen, setFxOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);

  const toggleMixer = useCallback(() => setMixerOpen((o) => !o), []);
  const toggleAddTrack = useCallback(() => setAddTrackOpen((o) => !o), []);
  const toggleFx = useCallback(() => setFxOpen((o) => !o), []);
  const toggleInfo = useCallback(() => setInfoOpen((o) => !o), []);
  const toggleControls = useCallback(() => setControlsOpen((o) => !o), []);
  const handlePrism = useCallback(() => console.log('Prism toggled'), []);

  return (
    <div className="relative h-screen" style={{ backgroundColor: '#191919' }}>
      <DawDock
        mixerOpen={mixerOpen}
        prismOpen={false}
        addTrackOpen={addTrackOpen}
        fxOpen={fxOpen}
        infoOpen={infoOpen}
        controlsOpen={controlsOpen}
        onMixerToggle={toggleMixer}
        onPrismToggle={handlePrism}
        onAddTrackToggle={toggleAddTrack}
        onFxToggle={toggleFx}
        onInfoToggle={toggleInfo}
        onControlsToggle={toggleControls}
      />
    </div>
  );
}
