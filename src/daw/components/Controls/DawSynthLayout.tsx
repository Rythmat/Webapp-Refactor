import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type FC,
  type RefObject,
} from 'react';
import { useStore } from '@/daw/store';
import type { SynthEngine } from '@/daw/oracle-synth/audio/SynthEngine';
import { useSynthStore } from '@/daw/oracle-synth/store';
import { useKeyboardShortcuts } from '@/daw/oracle-synth/hooks/useKeyboardShortcuts';
import { SourceRow } from '@/daw/oracle-synth/components/layout/SourceRow';
import { LFOArea } from '@/daw/oracle-synth/components/layout/LFOArea';
import { RightSidebar } from '@/daw/oracle-synth/components/layout/RightSidebar';
import { ModulationPanel } from '@/daw/oracle-synth/components/modulation/ModulationPanel';
import { RoutingPanel } from '@/daw/oracle-synth/components/routing/RoutingPanel';
import { FXPanel } from '@/daw/oracle-synth/components/fx/FXPanel';
import { ArpPanel } from '@/daw/oracle-synth/components/arp/ArpPanel';
import { PresetSelector } from '@/daw/oracle-synth/components/preset/PresetSelector';
import { PianoKeyboard } from '@/daw/oracle-synth/components/keyboard/PianoKeyboard';
import { useLiveChordColor } from '@/daw/hooks/useLiveChordColor';
import { WheelControl } from '@/daw/oracle-synth/components/controls/WheelControl';
import { Knob } from '@/daw/oracle-synth/components/controls/Knob';
import { NumberStepper } from '@/daw/oracle-synth/components/controls/NumberStepper';
import { WaveformVisualizer } from '@/daw/oracle-synth/components/visualizers/WaveformVisualizer';
import { useContainerScale } from '@/daw/hooks/useContainerScale';
import styles from '@/daw/oracle-synth/components/layout/SynthLayout.module.css';

// ── DawSynthLayout ────────────────────────────────────────────────────────
// Mirrors oracle-synth's SynthLayout but with container-based scaling
// (ResizeObserver) instead of viewport-based scaling (window dimensions).

interface DawSynthLayoutProps {
  engine: SynthEngine;
  engineRef: RefObject<SynthEngine | null>;
}

export const DawSynthLayout: FC<DawSynthLayoutProps> = ({
  engine,
  engineRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scale, offsetX, offsetY } = useContainerScale(containerRef);

  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
  const hwActiveNotes = useStore((s) => s.hwActiveNotes);
  const mergedNotes = useMemo(
    () => new Set([...activeNotes, ...hwActiveNotes]),
    [activeNotes, hwActiveNotes],
  );
  const chordColor = useLiveChordColor(mergedNotes);

  // Store reads
  const masterVolume = useSynthStore((s) => s.masterVolume);
  const setMasterVolume = useSynthStore((s) => s.setMasterVolume);
  const pitchBend = useSynthStore((s) => s.pitchBend);
  const setPitchBend = useSynthStore((s) => s.setPitchBend);
  const pitchBendRange = useSynthStore((s) => s.pitchBendRange);
  const setPitchBendRange = useSynthStore((s) => s.setPitchBendRange);
  const modWheel = useSynthStore((s) => s.modWheel);
  const setModWheel = useSynthStore((s) => s.setModWheel);

  const analyser = useMemo(() => engine.getAnalyserNode(), [engine]);

  // Note handlers
  const handleNoteOn = useCallback(
    (note: number, velocity: number = 0.8) => {
      engine.noteOn(note, velocity);
      setActiveNotes((prev) => new Set(prev).add(note));
    },
    [engine],
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
    [engine],
  );

  // QWERTY keyboard shortcuts for playing notes
  useKeyboardShortcuts(
    engineRef,
    (note) => setActiveNotes((prev) => new Set(prev).add(note)),
    (note) =>
      setActiveNotes((prev) => {
        const next = new Set(prev);
        next.delete(note);
        return next;
      }),
  );

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: '#111',
      }}
    >
      <div
        className={styles.layout}
        style={{
          transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
        }}
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
              activeNotes={mergedNotes}
              activeColor={chordColor ?? undefined}
              onNoteOn={handleNoteOn}
              onNoteOff={handleNoteOff}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
