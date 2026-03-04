import React, { useCallback, useMemo, useState } from 'react';
import { SynthEngine } from '../../audio/SynthEngine';
import { useSynthStore } from '../../store';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useSyncStoreToEngine } from '../../hooks/useSyncStoreToEngine';
import { useViewportScale } from '../../hooks/useViewportScale';
import { SourceRow } from './SourceRow';
import { LFOArea } from './LFOArea';
import { ModulationPanel } from '../modulation/ModulationPanel';
import { RightSidebar } from './RightSidebar';
import { PianoKeyboard } from '../keyboard/PianoKeyboard';
import { WheelControl } from '../controls/WheelControl';
import { Knob } from '../controls/Knob';
import { NumberStepper } from '../controls/NumberStepper';
import { WaveformVisualizer } from '../visualizers/WaveformVisualizer';
import { PresetSelector } from '../preset/PresetSelector';
import { FXPanel } from '../fx/FXPanel';
import { RoutingPanel } from '../routing/RoutingPanel';
import { ArpPanel } from '../arp/ArpPanel';
import styles from './SynthLayout.module.css';

interface SynthLayoutProps {
  engine: SynthEngine;
  engineRef: React.RefObject<SynthEngine | null>;
}

export const SynthLayout: React.FC<SynthLayoutProps> = ({
  engine,
  engineRef,
}) => {
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
  const masterVolume = useSynthStore((s) => s.masterVolume);
  const setMasterVolume = useSynthStore((s) => s.setMasterVolume);
  const pitchBend = useSynthStore((s) => s.pitchBend);
  const setPitchBend = useSynthStore((s) => s.setPitchBend);
  const pitchBendRange = useSynthStore((s) => s.pitchBendRange);
  const setPitchBendRange = useSynthStore((s) => s.setPitchBendRange);
  const modWheel = useSynthStore((s) => s.modWheel);
  const setModWheel = useSynthStore((s) => s.setModWheel);
  const analyser = useMemo(() => engine.getAnalyserNode(), [engine]);

  // Sync store to engine
  useSyncStoreToEngine(engine);

  const handleNoteOn = useCallback(
    (note: number, velocity: number = 0.8) => {
      engine.noteOn(note, velocity);
      setActiveNotes((prev) => new Set(prev).add(note));
    },
    [engine]
  );

  const handleNoteOff = useCallback(
    (note: number) => {
      engine.noteOff(note);
      setActiveNotes((prev) => {
        const next = new Set(prev);
        next.delete(note);
        return next;
      });
    },
    [engine]
  );

  // QWERTY keyboard shortcuts
  useKeyboardShortcuts(
    engineRef,
    (note) => setActiveNotes((prev) => new Set(prev).add(note)),
    (note) =>
      setActiveNotes((prev) => {
        const next = new Set(prev);
        next.delete(note);
        return next;
      })
  );

  const { scale, offsetX, offsetY } = useViewportScale();

  return (
    <div className={styles.scaleWrapper}>
    <div
      className={styles.layout}
      style={{ transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})` }}
    >
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.logo}>ORACLE</span>
        <PresetSelector />
        <RightSidebar />
        <div className={styles.headerRight}>
          <div style={{ width: 120, flexShrink: 0 }}>
            <WaveformVisualizer
              analyser={analyser}
              height={32}
              color="#ffffff"
            />
          </div>
          <Knob
            label="MAIN"
            value={masterVolume}
            min={0}
            max={1}
            defaultValue={0.8}
            accent="#ffffff"
            size={36}
            horizontal
            formatValue={(v) => `${Math.round(v * 100)}%`}
            onChange={setMasterVolume}
          />
        </div>
      </div>

      {/* Source modules row */}
      <div className={styles.sources}>
        <SourceRow engine={engine} />
      </div>

      {/* Middle section: Modulation (left) | LFO (center) | FX (right) */}
      <div className={styles.middle}>
        <div className={styles.middleLeft}>
          <ModulationPanel />
          <RoutingPanel />
        </div>
        <div className={styles.middleCenter}>
          <LFOArea />
        </div>
        <div className={styles.middleRight}>
          <FXPanel />
          <ArpPanel />
        </div>
      </div>

      {/* Footer: wheels + keyboard */}
      <div className={styles.footer}>
        <div className={styles.wheels}>
          <div className={styles.pitchGroup}>
            <WheelControl
              label="PITCH"
              value={pitchBend}
              min={-1}
              max={1}
              springBack={true}
              accent="#e8c840"
              onChange={setPitchBend}
            />
            <NumberStepper
              label="RANGE"
              value={pitchBendRange}
              min={1}
              max={24}
              onChange={setPitchBendRange}
            />
          </div>
          <WheelControl
            label="MOD"
            value={modWheel}
            min={0}
            max={1}
            springBack={false}
            accent="#7ecfcf"
            onChange={setModWheel}
          />
        </div>
        <div className={styles.keyboardWrapper}>
          <PianoKeyboard
            startNote={36}
            endNote={96}
            activeNotes={activeNotes}
            onNoteOn={handleNoteOn}
            onNoteOff={handleNoteOff}
          />
        </div>
      </div>
    </div>
    </div>
  );
};
