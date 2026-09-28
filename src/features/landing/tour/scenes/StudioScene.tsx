import { useEffect, useMemo, useRef, useState } from 'react';
import { demoChord, keyCenterColor } from '../../music';
import type { SceneProps } from './sceneTypes';
import { MiniPianoRoll } from './studio/MiniPianoRoll';
import { PrismPanel } from './studio/PrismPanel';
import { StudioArrange } from './studio/StudioArrange';
import { StudioDock } from './studio/StudioDock';
import { StudioHeaders } from './studio/StudioHeaders';
import { StudioTransport } from './studio/StudioTransport';
import {
  studioStepTarget,
  useAutoEpoch,
  useAutoFrame,
  useScopedState,
} from './studio/studioHooks';
import {
  hoverReadout,
  spectrumGroups,
  type StudioState,
  type StyleName,
  type TrackId,
} from './studio/studioScript';
import {
  BAR,
  buildSong,
  keyRootFor,
  pickFromColor,
  type ChordRegion,
} from './studio/studioSong';
import { NEUTRAL_TRACK, STUDIO, studioLayout } from './studio/studioTokens';
import { useBarIndex, useStudioTransport } from './studio/useStudioTransport';

const toggle = <T,>(list: readonly T[], item: T): T[] =>
  list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

/**
 * Studio scene — a miniature of the real Studio's arrange view: transport
 * bar, CHORDS/DRUMS track headers, the timeline with its Prism chord ruler
 * and glass clips, and the bottom dock's PRISM and PIANO ROLL tabs. The tour
 * picks C, picks chords by color on the HARMONY spectrum, Creates the clip and
 * plays it back (drums + chords, audible once Sound is on).
 *
 * Orchestration only: the script (`studioScript`) says what the auto tour
 * shows at each moment of the step (read from the tour's `stepProgress`, so
 * there are no scene timers), the visitor's own state takes over exactly what
 * is on screen, and a rAF transport (`useStudioTransport`) runs playback.
 * Every color comes from Prism / key centers via `../../music`.
 */
export const StudioScene = ({
  stepIndex,
  mode,
  visible,
  compact,
  onUserAction,
  playNotes,
  stepProgress,
  audio,
  resetKey,
}: SceneProps) => {
  const layout = studioLayout(compact);
  const auto = mode === 'auto';
  const staticMode = mode === 'static';

  // Visitor state belongs to one visit of a step in one auto run: a step
  // pill (even the current one) or an idle return starts fresh; taking over
  // mid-step keeps what is on screen.
  const epoch = useAutoEpoch(mode);
  const scope = `${stepIndex}:${epoch}:${resetKey ?? 0}`;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const frame = useAutoFrame(stepProgress, stepIndex, mode);
  const [user, setUser] = useScopedState<StudioState>(scope);
  const [userPlaying, setUserPlaying] = useScopedState<boolean>(scope);
  const [stops, setStops] = useScopedState<number>(scope);
  const [selected, setSelected] = useScopedState<number>(scope);
  const [hoverSeg, setHoverSeg] = useState<number | null>(null);
  // One-shots: set on a click, cleared when their animation ends, so a
  // remount (dock switch) never replays them.
  const [flash, setFlash] = useState<{ segment: number; n: number } | null>(
    null,
  );
  const [keyRing, setKeyRing] = useState<number | null>(null);
  const oneShots = useRef(0);
  const [creates, setCreates] = useState(0);
  /** Bumped by every Play/Stop: a Play still waiting on Sound is dropped. */
  const playReq = useRef(0);

  const shown = user ?? frame.state;
  const shownRef = useRef(shown);
  shownRef.current = shown;

  const keyRoot = keyRootFor(shown.keyPc ?? 0);
  const keyColor = shown.keyPc === null ? null : keyCenterColor(shown.keyPc);
  const seqKey = shown.seq.join('|');
  const clipKey = shown.clip?.join('|') ?? '';
  const song = useMemo(
    () => buildSong({ clip: shown.clip, keyRoot, style: shown.style }),
    [clipKey, keyRoot, shown.style],
  );
  const groups = useMemo(() => spectrumGroups(shown), [shown.keyPc, seqKey]);

  const isAudible = (track: TrackId) =>
    !shown.muted.includes(track) &&
    (shown.soloed.length === 0 || shown.soloed.includes(track));

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
    resetKey: `${scope}:${stops ?? 0}`,
    resetTick: staticMode && stops === null ? frame.parkTick : 0,
    events: song.events,
    isAudible,
    audio,
    // Playback in user mode holds it (no idle reset mid-song).
    onWrap: () => {
      if (mode === 'user' && playing) onUserAction();
    },
    onEnd: () => setUserPlaying(false),
  });
  const bar = useBarIndex(position);
  const barRegion = song.regions.findIndex(
    (r) => bar * BAR >= r.startTick && bar * BAR < r.endTick,
  );
  const parked = staticMode && userPlaying === null && frame.parkTick > 0;
  const current =
    (playing || parked) && barRegion >= 0 ? song.regions[barRegion] : null;
  const activeRegion = playing
    ? barRegion
    : (selected ?? (parked ? barRegion : null));

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
  // Every handler takes over exactly what is on screen: the state and
  // whether the auto pass is playing.
  const take = (fn: (s: StudioState) => StudioState) => {
    if (auto) setUserPlaying((p) => p ?? frame.playing);
    onUserAction();
    setUser((prev) => fn(prev ?? shownRef.current));
  };
  const takeOver = () => take((s) => s);

  const pickKey = (pc: number) => {
    take((s) => ({ ...s, keyPc: pc }));
    playNotes(demoChord('1 major', keyRootFor(pc)).midis, 0.8);
  };

  const pickColor = (segment: number) => {
    const s = shownRef.current;
    const group = spectrumGroups(s).get(segment);
    if (!group || s.keyPc === null) {
      setHoverSeg(segment);
      return;
    }
    const token = pickFromColor(group, s.seq, s.picks);
    take((prev) => ({
      ...prev,
      seq: [...prev.seq, token],
      picks: prev.picks + 1,
    }));
    if (!staticMode) setFlash({ segment, n: ++oneShots.current });
    playNotes(demoChord(token, keyRootFor(s.keyPc)).midis, 0.9);
  };

  const create = () => {
    take((s) => ({ ...s, clip: [...s.seq] }));
    setCreates((n) => n + 1);
  };

  const togglePlay = () => {
    takeOver();
    const next = !playing;
    const id = ++playReq.current;
    const at = scope;
    // Unless a Stop, another Play or a scope change came first.
    const start = () => {
      if (playReq.current === id && scopeRef.current === at)
        setUserPlaying(next);
    };
    // Play is a gesture: it turns Sound on, like the demo's other keys.
    // Pause turns it off.
    if (!next) {
      audio.disable();
      start();
    } else if (audio.isEnabled()) start();
    else void audio.enableFromGesture().then(start, start);
  };

  const stop = () => {
    takeOver();
    playReq.current += 1;
    setUserPlaying(false);
    setStops((n) => (n ?? 0) + 1);
    setSelected(null);
    audio.disable();
  };

  const playRegion = (region: ChordRegion, index: number) => {
    takeOver();
    setSelected(index);
    playNotes(region.midis, 0.9);
  };

  const playChord = (token: string) => {
    takeOver();
    playNotes(demoChord(token, keyRoot).midis, 0.9);
  };

  const playKey = (midi: number) => {
    takeOver();
    playNotes([midi], 0.5);
  };

  const press = auto ? frame.press : null;
  // A later spectrum click: that segment carries the step's cursor target.
  const cursor =
    auto && frame.cursor !== null
      ? { segment: frame.cursor, target: studioStepTarget(stepIndex) }
      : null;
  // The cursor's press drives the readout; otherwise the visitor's hover.
  const hover =
    (auto ? frame.hover : null) ??
    (hoverSeg === null
      ? null
      : { segment: hoverSeg, ...hoverReadout(shown, hoverSeg) });

  return (
    <div
      className="relative size-full select-none overflow-hidden"
      style={{ background: STUDIO.bg, color: STUDIO.text }}
    >
      <StudioTransport
        layout={layout}
        compact={compact}
        keyPc={shown.keyPc}
        keyColor={keyColor}
        playing={playing}
        pressPlay={press === 'play'}
        position={position}
        onKey={() => {
          take((s) => ({ ...s, dock: 'prism' }));
          if (!staticMode) setKeyRing(++oneShots.current);
        }}
        onPlay={togglePlay}
        onStop={stop}
      />
      <StudioHeaders
        layout={layout}
        compact={compact}
        staticMode={staticMode}
        trackColor={keyColor ?? NEUTRAL_TRACK}
        state={shown}
        meters={meters}
        onToggle={(kind, track) =>
          take((s) => ({ ...s, [kind]: toggle(s[kind], track) }))
        }
      />
      <StudioArrange
        layout={layout}
        compact={compact}
        staticMode={staticMode}
        song={song}
        keyColor={keyColor}
        audible={{ chords: isAudible('chords'), drums: isAudible('drums') }}
        position={position}
        activeRegion={activeRegion}
        paintKey={`${clipKey}:${creates}`}
        onRegion={playRegion}
      />
      <StudioDock
        layout={layout}
        compact={compact}
        staticMode={staticMode}
        dock={shown.dock}
        pressRoll={press === 'roll'}
        trackColor={keyColor ?? NEUTRAL_TRACK}
        nowPlaying={current && { label: current.label, color: current.color }}
        onDock={(dock) => take((s) => ({ ...s, dock }))}
      >
        {shown.dock === 'prism' ? (
          <PrismPanel
            layout={layout}
            compact={compact}
            staticMode={staticMode}
            state={shown}
            keyRoot={keyRoot}
            groups={groups}
            hover={hover}
            press={press}
            cursor={cursor}
            flash={flash}
            keyRing={keyRing}
            onFlashDone={() => setFlash(null)}
            onRingDone={() => setKeyRing(null)}
            onKey={pickKey}
            onUndo={() => take((s) => ({ ...s, seq: s.seq.slice(0, -1) }))}
            onClear={() => take((s) => ({ ...s, seq: [] }))}
            onSegment={pickColor}
            onHover={setHoverSeg}
            onCreate={create}
            onStyle={(style: StyleName) => take((s) => ({ ...s, style }))}
            onChord={playChord}
          />
        ) : (
          <MiniPianoRoll
            layout={layout}
            compact={compact}
            staticMode={staticMode}
            notes={song.chordNotes}
            regions={song.regions}
            keyPc={shown.keyPc}
            position={position}
            glow={current && { bar, color: current.color }}
            onKey={playKey}
          />
        )}
      </StudioDock>
    </div>
  );
};
