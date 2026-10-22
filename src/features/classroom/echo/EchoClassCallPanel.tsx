import { useMemo } from 'react';
import { echoHeadline } from '@/components/Games/Echo/echoCues';
import type { RunCall } from '@/components/Games/Echo/echoRunCues';
import { melodyPads } from '@/curriculum/engine/echo';
import { pitchClassOf } from '@/curriculum/engine/musicLiteracy/pitch';
import type { RunView } from '@/curriculum/engine/musicLiteracy/run';
import { colorKeyOf, keyName } from '@/curriculum/musicLiteracy/ChooseKeyPanel';
import { ChordBars } from '@/curriculum/musicLiteracy/ChordBars';
import { LiteracyCallPanel } from '@/curriculum/musicLiteracy/LiteracyCallPanel';
import { attackAt } from '@/curriculum/musicLiteracy/literacyKeys';
import type { EchoClassKey } from './types';

// ── The circle and its hub, for a class's round ────────────────────────────
// Echo's call panel (Music Literacy's circle in the key's color, its hub
// saying Get Ready, Listen, the count-off and Your Turn), as the play screen
// shows it (EchoStage.tsx), for whichever screen of the class shows the
// round: a student's (from their own run), the projector's and the
// teacher's (read off the clock, silent).
//
// Ears only (Teacher Settings, Lights during the call): the hub keeps its
// cues but shows no degrees or chords, and nothing lights.

export interface EchoClassCallPanelProps {
  classKey: EchoClassKey;
  /** The round's call on its run; null between rounds. */
  placed: RunCall | null;
  view: RunView;
  running: boolean;
  /** What the hub says out of a run: "Waiting for your teacher…". */
  idle: string;
  /** The pads light and the hub shows the call (the default), or ears only. */
  lights?: boolean;
  /** Under the circle, for a melody. */
  line?: string;
  compact?: boolean;
}

export function EchoClassCallPanel({
  classKey,
  placed,
  view,
  running,
  idle,
  lights = true,
  line,
  compact,
}: EchoClassCallPanelProps) {
  const keyColor = useMemo(() => melodyPads(classKey).keyColor, [classKey]);
  const tick = running ? view.tick : -1;
  const headline = placed
    ? echoHeadline(placed.timeline, tick, running, idle)
    : { kind: 'idle' as const, text: idle };
  // Ears only: the beats and cues go on, but nothing of the call shows.
  const shown = lights ? view : { ...view, hub: null, lit: [] };

  const chordNow = useMemo(() => {
    if (!placed || placed.call.kind !== 'chords' || !lights) return null;
    const inAnswer = tick >= placed.timeline.response.start;
    const attacks = inAnswer ? placed.attacks.response : placed.attacks.call;
    const now = running ? attackAt(attacks, tick) : null;
    const bar = now?.attack.bar ?? -1;
    return {
      hub: {
        kind: 'chord' as const,
        label: (now?.attack.chord ?? placed.call.chords[0])?.label ?? '?',
        lit:
          !!now?.sounding &&
          now.attack.chord.midis.some((m) => view.lit.includes(m)),
      },
      bars: placed.call.labels.map((label, b) => ({
        label,
        lit: running && b === bar,
      })),
    };
  }, [placed, tick, running, view.lit, lights]);

  const melody = placed?.call.kind === 'melody' && lights;
  return (
    <LiteracyCallPanel
      tonicPc={pitchClassOf(classKey.tonic)}
      mode={classKey.mode}
      keyColor={keyColor}
      keyName={keyName(classKey.tonic, classKey.mode)}
      colorOf={classKey.mode === 'minor' ? colorKeyOf(classKey.tonic) : null}
      call={melody ? placed.notes.call : []}
      response={melody ? placed.notes.response : []}
      words={[]}
      wordsStart={placed?.timeline.call.start ?? 0}
      barTicks={placed?.timeline.barTicks ?? 1920}
      beatsPerBar={4}
      view={running ? shown : { ...shown, hub: null, beat: -1 }}
      running={running}
      headline={headline}
      hubContent={chordNow?.hub}
      compact={compact}
      below={
        chordNow ? (
          <ChordBars rows={[{ bars: chordNow.bars }]} keyColor={keyColor} />
        ) : line ? (
          <p className="text-center text-[15px] leading-6 text-white/55">
            {line}
          </p>
        ) : undefined
      }
    />
  );
}
