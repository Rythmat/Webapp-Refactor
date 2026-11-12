import { useEffect, useMemo, useRef } from 'react';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import { DEMO_PROGRESSION, keyCenterColor, KEY_CENTERS } from '../../music';
import { useSoundOff } from '../useSoundOff';
import type { SceneProps } from './sceneTypes';
import { StudioPromptBar } from './studio/StudioPromptBar';
import { StudioBottomBar, StudioSideRail } from './studio/StudioRails';
import { StudioTimeline, type LanePart } from './studio/StudioTimeline';
import { StudioTopBar } from './studio/StudioTopBar';
import { StudioTracks } from './studio/StudioTracks';
import { NEUTRAL_TRACK, SHELL, shellLayout } from './studio/shellTokens';
import {
  useAutoEpoch,
  useAutoFrame,
  useScopedState,
} from './studio/studioHooks';
import { DEMO_KEY_PC, endState, type TrackId } from './studio/studioScript';
import { BAR, bassLine, buildSong, keyRootFor } from './studio/studioSong';
import { useBarIndex, useStudioTransport } from './studio/useStudioTransport';

/**
 * Everything Prism writes for the demo prompt, built once: chords and drums
 * from the real engine in D, a bass line on the chord roots. The scene shows
 * (and the transport plays) only the parts written so far.
 */
const SONG = (() => {
  const song = buildSong({
    clip: DEMO_PROGRESSION,
    keyRoot: keyRootFor(DEMO_KEY_PC),
    style: 'Pop',
  });
  const bass = bassLine(song.regions);
  return {
    ...song,
    bassNotes: bass.notes,
    events: [...song.events, ...bass.events].sort((a, b) => a.tick - b.tick),
  };
})();

/** Every part written (the end of "Bass and drums"). */
const FULL_SONG = endState(2);

const KEY_LABEL = displayAccidentals(
  KEY_CENTERS.find((k) => k.pitchClass === DEMO_KEY_PC)?.name ?? '',
);

/**
 * Studio scene — a miniature of today's Studio: the pill top bar, the stage
 * card (track column, chord lane, lanes), the ∆ side rail, the bottom bar and
 * the prompt bar, which is Prism now. The tour asks Prism for a pop chorus in
 * D, Creates — the chords land on the chord lane in their colors — lets the
 * bass and drums follow, and plays it back (audible once Sound is on).
 *
 * Orchestration only: the script (`studioScript`) says what the auto tour
 * shows at each moment of the step (read from the tour's `stepProgress`, so
 * there are no scene timers) and a rAF transport (`useStudioTransport`) runs
 * playback. The visitor's controls are Play/Pause and Back to start (a Play
 * before Prism is done shows the whole song); every color comes from Prism /
 * key centers via `../../music`.
 */
export const StudioScene = ({
  stepIndex,
  mode,
  visible,
  compact,
  onUserAction,
  stepProgress,
  audio,
  soundOn,
  resetKey,
}: SceneProps) => {
  const layout = shellLayout(compact);
  const auto = mode === 'auto';
  const staticMode = mode === 'static';

  // Visitor playback belongs to one visit of a step in one auto run: a step
  // pill (even the current one) or an idle return starts fresh; taking over
  // mid-step keeps what is on screen.
  const epoch = useAutoEpoch(mode);
  const scope = `${stepIndex}:${epoch}:${resetKey ?? 0}`;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const frame = useAutoFrame(stepProgress, stepIndex, mode);
  const [userPlaying, setUserPlaying] = useScopedState<boolean>(scope);
  const [rewinds, setRewinds] = useScopedState<number>(scope);
  /** The visitor pressed Play before Prism finished: show the whole song. */
  const [filled, setFilled] = useScopedState<boolean>(scope);
  /** Bumped by every Play/Back to start: a Play still waiting on Sound is dropped. */
  const playReq = useRef(0);

  const shown = filled ? FULL_SONG : frame.state;
  const keyColor = shown.keyPc === null ? null : keyCenterColor(shown.keyPc);
  const trackColor = keyColor ?? NEUTRAL_TRACK;
  const written: Record<TrackId, boolean> = {
    chords: shown.chords,
    bass: shown.band,
    drums: shown.band,
  };
  const writtenRef = useRef(written);
  writtenRef.current = written;

  const regions = shown.chords ? SONG.regions : [];
  const parts = useMemo(() => {
    const out: LanePart[] = [];
    const key = `${epoch}:${resetKey ?? 0}`;
    if (shown.chords)
      out.push({
        track: 'chords',
        name: 'Chords',
        notes: SONG.chordNotes,
        paintKey: `chords:${key}`,
      });
    if (shown.band) {
      out.push({
        track: 'bass',
        name: 'Bass',
        notes: SONG.bassNotes,
        paintKey: `bass:${key}`,
      });
      out.push({
        track: 'drums',
        name: 'Drums',
        notes: SONG.drumNotes,
        paintKey: `drums:${key}`,
      });
    }
    return out;
  }, [shown.chords, shown.band, epoch, resetKey]);

  // ── Playback ───────────────────────────────────────────────────────────
  // The "Play it back" step plays in user mode too (a step pill, or a click
  // during the auto pass keeps it running).
  const playing =
    userPlaying ?? (auto ? frame.playing : mode === 'user' && stepIndex === 3);
  const { position, meters } = useStudioTransport({
    playing,
    visible,
    loop: !staticMode,
    quantize: staticMode,
    rewindOnPlay: staticMode,
    resetKey: `${scope}:${rewinds ?? 0}`,
    resetTick: staticMode && rewinds === null ? frame.parkTick : 0,
    events: SONG.events,
    isAudible: (track) => writtenRef.current[track],
    audio,
    // Playback in user mode holds it (no idle reset mid-song).
    onWrap: () => {
      if (mode === 'user' && playing) onUserAction();
    },
    onEnd: () => setUserPlaying(false),
  });
  const bar = useBarIndex(position);
  const barRegion = regions.findIndex(
    (r) => bar * BAR >= r.startTick && bar * BAR < r.endTick,
  );
  const parked = staticMode && userPlaying === null && frame.parkTick > 0;
  const current =
    (playing || parked) && barRegion >= 0 ? regions[barRegion] : null;

  // Auto cues preview their chord (silent unless Sound is on); once per cue
  // of an auto run, also under StrictMode's double effects.
  const cue = `${epoch}:${frame.soundKey}`;
  const lastSound = useRef<string | null>(null);
  useEffect(() => {
    if (!auto || !frame.sound || lastSound.current === cue) return;
    lastSound.current = cue;
    audio.notes(frame.sound, 0.8, 0, 0.6);
  }, [cue, auto]);

  // ── Visitor actions ────────────────────────────────────────────────────
  // Each takes over exactly what is on screen, including whether the auto
  // pass is playing.
  const takeOver = () => {
    if (auto) setUserPlaying((p) => p ?? frame.playing);
    onUserAction();
  };

  const togglePlay = () => {
    takeOver();
    const next = !playing;
    // Play before Prism has written it all plays what it will write.
    if (next && !shown.band) setFilled(true);
    const id = ++playReq.current;
    const at = scope;
    // Unless a Back to start, another Play or a scope change came first.
    const start = () => {
      if (playReq.current === id && scopeRef.current === at)
        setUserPlaying(next);
    };
    // Play is a gesture: it turns Sound on, like the demo's other keys, and
    // starts once it's on (Sound going off meanwhile drops it). Pause turns
    // it off.
    if (!next) {
      audio.disable();
      start();
    } else if (audio.isEnabled()) start();
    else
      void audio.enableFromGesture().then((on) => {
        if (on) start();
      });
  };

  // Sound off (the mute, the demo leaving the screen, a hidden tab, a
  // take-over while muted) pauses the visitor's playback as Pause does.
  useSoundOff(!auto && playing, soundOn, () => {
    playReq.current += 1;
    setUserPlaying(false);
  });

  const rewind = () => {
    takeOver();
    playReq.current += 1;
    setUserPlaying(false);
    setRewinds((n) => (n ?? 0) + 1);
    audio.disable();
  };

  const press = auto ? frame.press : null;

  return (
    <div
      className="relative size-full select-none overflow-hidden"
      style={{ background: SHELL.bg, color: SHELL.text }}
    >
      <StudioTopBar
        layout={layout}
        compact={compact}
        keyPc={shown.keyPc}
        keyColor={keyColor}
        playing={playing}
        pressPlay={press === 'play'}
        position={position}
        onPlay={togglePlay}
        onRewind={rewind}
      />
      <div
        className="absolute overflow-hidden rounded-[12px]"
        style={{
          left: layout.card.x,
          top: layout.card.y,
          width: layout.card.w,
          height: layout.card.h,
          background: SHELL.surface,
        }}
      >
        <StudioTracks
          layout={layout}
          compact={compact}
          staticMode={staticMode}
          trackColor={trackColor}
          nowPlaying={current && { label: current.label, color: current.color }}
          meters={meters}
        />
        <StudioTimeline
          layout={layout}
          compact={compact}
          staticMode={staticMode}
          regions={regions}
          parts={parts}
          trackColor={trackColor}
          keyLabel={shown.keyPc === null ? null : KEY_LABEL}
          position={position}
          playing={playing}
          activeRegion={current ? barRegion : null}
        />
        <StudioPromptBar
          layout={layout}
          compact={compact}
          staticMode={staticMode}
          asked={shown.asked}
          pressPrompt={press === 'prompt'}
          pressCreate={press === 'create'}
        />
      </div>
      {layout.railW > 0 && <StudioSideRail layout={layout} />}
      <StudioBottomBar layout={layout} compact={compact} />
    </div>
  );
};
