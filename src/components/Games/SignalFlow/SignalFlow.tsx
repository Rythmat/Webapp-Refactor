import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { colorForKeyMode } from '@/lib/modeColorShift';
import { ArcadeGameHeader } from '../ArcadeGameHeader';
import { VolumeDial } from '../VolumeDial';
import { Knob, LiveMeter, PlayKeys, ScopeCard, Switch } from './Controls';
import type { GearVisual } from './gear/shapes';
import { gearVisual } from './gear/visuals';
import {
  CABLE_BLURB,
  CABLE_NAME,
  CABLE_SHORT_NAME,
  gearDef,
  gearName,
  portOf,
} from './rig/gearDefs';
import {
  clearedCleanly,
  fitProblem,
  missionReducer,
  rackFor,
  startMission,
  type Mission,
  type MissionAction,
  type MissionState,
} from './rig/missionReducer';
import { CHAPTERS, ALL_MISSIONS, type Chapter } from './rig/missions';
import type {
  CableKind,
  ControlDef,
  GearInstance,
  PortRef,
} from './rig/rigTypes';
import { cableEdges, HUM } from './rig/traceSignal';
import { RigScene, type RigLayout } from './scene/RigScene';
import { CABLE_WIDTH, plugDrawing } from './scene/cablePath';
import { stackLayout } from './scene/stackLayout';
import { useRigAudio } from './useRigAudio';
import { useSignalFlowProgress } from './useSignalFlowProgress';

// ── Signal Flow ────────────────────────────────────────────────────────────
// A rig you can hear. Real gear on a bench, real cables, and real audio through
// all of it, so what you plug in and what you turn is what you hear.

const START_VOLUME = 0.7;
const ACTIVITY_NAME: Readonly<Record<Mission['activity'], string>> = {
  build: 'Build',
  probe: 'Probe',
  dial: 'Dial',
  order: 'Order',
  fix: 'Fix',
};

const chapterOf = (mission: Mission) =>
  CHAPTERS.find((chapter) => chapter.id === mission.chapter) as Chapter;

const accentOf = (chapter: Chapter) => colorForKeyMode(chapter.accentKey);

// ── Little drawings ────────────────────────────────────────────────────────

function GearThumb({
  visual,
  className = 'size-16',
}: {
  visual: GearVisual;
  className?: string;
}) {
  const { box } = visual;
  const pad = (box.x1 - box.x0) * 0.04 + 0.3;
  return (
    <svg
      viewBox={`${box.x0 - pad} ${box.y0 - pad} ${box.x1 - box.x0 + pad * 2} ${box.y1 - box.y0 + pad * 2}`}
      className={className}
      aria-hidden
    >
      {visual.parts.map((part) =>
        part.layers.map((layer, i) => (
          <g key={`${part.id}${i}`}>
            <path
              d={layer.outline}
              fill="none"
              stroke="rgba(255,255,255,0.75)"
              strokeWidth={1.4}
              style={{ vectorEffect: 'non-scaling-stroke' }}
            />
            <path
              d={layer.fill}
              fill={part.tone === 'light' ? '#e6e6ea' : '#121215'}
            />
            <path
              d={layer.ink}
              fill="none"
              stroke={
                part.tone === 'light' ? '#121215' : 'rgba(255,255,255,0.75)'
              }
              strokeWidth={0.7}
              style={{ vectorEffect: 'non-scaling-stroke' }}
            />
          </g>
        )),
      )}
    </svg>
  );
}

function PlugIcon({
  kind,
  small = false,
}: {
  kind: CableKind;
  small?: boolean;
}) {
  const drawing = plugDrawing(kind, [0.6, 0, 1]);
  const xs = drawing.points.map(([x]) => x);
  const ys = drawing.points.map(([, y]) => y);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  const size = Math.max(Math.max(...xs) - x0, Math.max(...ys) - y0) + 0.8;
  return (
    <svg
      viewBox={`${x0 - 0.4} ${y0 - 0.4} ${size} ${size}`}
      className={`${small ? 'size-6' : 'size-9'} shrink-0`}
      aria-hidden
    >
      <path
        d={drawing.outline}
        fill="none"
        stroke="rgba(255,255,255,0.8)"
        strokeWidth={CABLE_WIDTH[kind]}
        style={{ vectorEffect: 'non-scaling-stroke' }}
      />
      <path d={drawing.fill} fill="#121215" />
      <path
        d={drawing.ink}
        fill="none"
        stroke="rgba(255,255,255,0.8)"
        strokeWidth={0.8}
        style={{ vectorEffect: 'non-scaling-stroke' }}
      />
    </svg>
  );
}

// ── The chapter list ───────────────────────────────────────────────────────

const CHAPTER_GEAR: Readonly<
  Record<number, Pick<GearInstance, 'kind' | 'channels'>>
> = {
  1: { kind: 'speaker' },
  2: { kind: 'overdrive' },
  3: { kind: 'interface' },
  4: { kind: 'mixer', channels: 4 },
  5: { kind: 'drumKit' },
};

function ChapterList({
  cleared,
  onOpen,
}: {
  cleared: ReadonlySet<string>;
  onOpen: (mission: Mission) => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:p-6">
      <p className="max-w-2xl text-base text-white/80">
        Every sound you’ve ever heard from a speaker took a path to get there.
        Plug in real gear, listen anywhere along the wire, and learn what’s
        really going on.
      </p>
      {CHAPTERS.map((chapter) => {
        const accent = accentOf(chapter);
        const firstOpen = chapter.missions.findIndex(
          (mission) => !cleared.has(mission.id),
        );
        return (
          <section
            key={chapter.id}
            className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:flex-row sm:items-center"
          >
            <div className="flex items-center gap-4 sm:w-72 sm:shrink-0">
              <GearThumb
                visual={gearVisual(CHAPTER_GEAR[chapter.id])}
                className="size-20 shrink-0"
              />
              <div>
                <h2 className="text-lg text-white">{chapter.title}</h2>
                <p className="text-sm text-white/70">{chapter.blurb}</p>
              </div>
            </div>
            <ol className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
              {chapter.missions.map((mission, i) => {
                const done = cleared.has(mission.id);
                const open = firstOpen === -1 || i <= firstOpen;
                return (
                  <li key={mission.id}>
                    <button
                      type="button"
                      disabled={!open}
                      data-testid={`mission-${mission.id}`}
                      onClick={() => onOpen(mission)}
                      className="flex min-h-12 w-full items-center gap-3 rounded-lg border border-white/10 px-3 py-2 text-left transition-colors hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/10"
                    >
                      <span
                        className="w-11 shrink-0 text-xs uppercase tracking-wide"
                        style={{ color: accent }}
                      >
                        {ACTIVITY_NAME[mission.activity]}
                      </span>
                      <span className="flex-1 text-sm text-white">
                        {mission.title}
                      </span>
                      {done && (
                        <span
                          className="text-sm"
                          style={{ color: accent }}
                          aria-label="Cleared"
                        >
                          ✓
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

// ── The panel ──────────────────────────────────────────────────────────────

/** A channel's knob, named for what's plugged into that channel. */
const channelLabel = (
  id: string,
  inputList: readonly string[] | undefined,
): string | undefined => {
  const channel = /^(?:fader|gain)(\d+)$/.exec(id);
  if (!channel || !inputList) return undefined;
  const n = Number(channel[1]);
  return `${n} ${inputList[n - 1]}`;
};

function GearControls({
  gear,
  ids,
  accent,
  inputList,
  dispatch,
}: {
  gear: GearInstance;
  ids: readonly string[];
  accent: string;
  inputList?: readonly string[];
  dispatch: React.Dispatch<MissionAction>;
}) {
  const controls = ids
    .map((id) => gearDef(gear).controls.find((c) => c.id === id))
    .filter((c): c is ControlDef => !!c);
  const knobs = controls.filter((c) => c.type === 'knob');
  const switches = controls.filter((c) => c.type === 'switch');
  const set = (control: string, value: number | string) =>
    dispatch({ type: 'setControl', gear: gear.id, control, value });
  return (
    <div className="rounded-xl border border-white/10 p-3">
      <h3 className="mb-2 text-sm text-white">{gearName(gear)}</h3>
      <div className="flex flex-col gap-3">
        {switches.map((def) =>
          def.type === 'switch' ? (
            <Switch
              key={def.id}
              gear={gear.id}
              def={def}
              value={String(gear.controls[def.id])}
              accent={accent}
              onChange={(value) => set(def.id, value)}
            />
          ) : null,
        )}
        {knobs.length > 0 && (
          <div className="flex flex-wrap gap-x-1 gap-y-3">
            {knobs.map((def) =>
              def.type === 'knob' ? (
                <Knob
                  key={def.id}
                  gear={gear.id}
                  def={def}
                  label={channelLabel(def.id, inputList)}
                  value={Number(gear.controls[def.id])}
                  accent={accent}
                  onChange={(value) => set(def.id, value)}
                />
              ) : null,
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Where a cable runs, in words, and what's on it. */
function describeProbe(state: MissionState, cableId: string) {
  const { rig, trace } = state;
  const cable = rig.cables.find((c) => c.id === cableId);
  const info = trace.cables[cableId];
  if (!cable || !info) return { title: '', note: '' };
  const edge = cableEdges(rig, cable)[0];
  const from = rig.gear[edge?.fromGear ?? cable.a.gear];
  const to = rig.gear[edge?.toGear ?? cable.b.gear];
  const title = `${gearName(from)} to ${gearName(to)}`;
  if (info.dead) {
    const a = portOf(rig.gear[cable.a.gear], cable.a.port);
    const b = portOf(rig.gear[cable.b.gear], cable.b.port);
    const same = a?.dir === 'in' && b?.dir === 'in' ? 'inputs' : 'outputs';
    return {
      title: `${gearName(rig.gear[cable.a.gear])} to ${gearName(rig.gear[cable.b.gear])}`,
      note: `Silence. This cable joins two ${same}, so no signal can flow along it.`,
    };
  }
  if (info.notes) {
    return {
      title,
      note: 'No sound at all. The dots are notes: which key, how hard and when.',
    };
  }
  if (info.levelDb === -Infinity) {
    return { title, note: 'Silence. No signal has reached this point.' };
  }
  const hum = info.levels[HUM] !== undefined;
  const scale =
    info.levelDb < -30
      ? 'Mic level: quiet, and needs a preamp.'
      : info.levelDb < -21
        ? 'Instrument level: stronger than a mic, weaker than line.'
        : info.levelDb > -10
          ? 'Very hot. Close to clipping.'
          : 'Line level: strong and ready to be mixed.';
  return {
    title,
    note: hum ? `${scale} There’s mains hum on this cable too.` : scale,
  };
}

// ── The mission ────────────────────────────────────────────────────────────

function MissionScreen({
  state,
  dispatch,
  accent,
  audioHook,
  onExit,
  onNext,
  nextTitle,
  phoneDial,
}: {
  state: MissionState;
  dispatch: React.Dispatch<MissionAction>;
  accent: string;
  audioHook: ReturnType<typeof useRigAudio>;
  onExit: () => void;
  onNext: () => void;
  nextTitle: string | null;
  /** The volume, on a phone, where the header has no room for it. */
  phoneDial: React.ReactNode;
}) {
  const { audio, loading, failed, playing, setPlaying, noteTick, playKey } =
    audioHook;
  const { mission, rig, trace } = state;
  const narrow = useMediaQuery('(max-width: 1023px)');
  const step = mission.steps[state.step];
  const rack = useMemo(() => rackFor(state), [state]);

  const allGear = useMemo(() => Object.values(mission.rig().gear), [mission]);
  const layout: RigLayout = useMemo(
    () => (narrow ? stackLayout(allGear, mission.layout) : mission.layout),
    [narrow, allGear, mission],
  );

  const fits = useCallback(
    (port: PortRef) =>
      !!state.cable &&
      fitProblem(rig, state.cable, port, state.pending) === null,
    [rig, state.cable, state.pending],
  );
  const onPressPort = useCallback(
    (port: PortRef) => {
      const plugged = stateRef.current.rig.cables.find(
        (c) =>
          (c.a.gear === port.gear && c.a.port === port.port) ||
          (c.b.gear === port.gear && c.b.port === port.port),
      );
      // With no cable in hand, tapping a plug pulls it out.
      if (plugged && !stateRef.current.cable) {
        dispatch({ type: 'unplug', cable: plugged.id });
      } else {
        dispatch({ type: 'pressPort', port });
      }
    },
    [dispatch],
  );
  const stateRef = useRef(state);
  stateRef.current = state;
  const onPressCable = useCallback(
    (cable: string) =>
      dispatch({
        type: 'probe',
        cable: stateRef.current.probe === cable ? null : cable,
      }),
    [dispatch],
  );
  const onPressGear = useCallback(
    (gear: string) => dispatch({ type: 'pressGear', gear }),
    [dispatch],
  );

  const sink = useMemo(
    () => trace.sinks.find((s) => s.on)?.gear ?? null,
    [trace.sinks],
  );
  const probe = state.probe ? describeProbe(state, state.probe) : null;
  const shelf = allGear.filter((g) => !rig.gear[g.id]?.placed);
  const clipping = trace.clipped.length > 0;

  const bench = (
    <RigScene
      state={state}
      layout={layout}
      audio={audio}
      accent={accent}
      fits={fits}
      onPressPort={onPressPort}
      onPressCable={onPressCable}
      onPressGear={onPressGear}
      noteTick={noteTick}
      fill={!narrow}
    />
  );

  const promptCard = (
    <>
      {!state.won && (
        <div
          data-testid="prompt"
          className="rounded-xl border p-3"
          style={{ borderColor: accent }}
        >
          {mission.steps.length > 1 && (
            <p className="mb-1 text-xs text-white/60">
              Step {state.step + 1} of {mission.steps.length}
            </p>
          )}
          <p className="text-base text-white">{step.prompt}</p>
        </div>
      )}

      <div aria-live="polite" className="flex flex-col gap-2">
        {state.refusal && !state.won && (
          <p
            data-testid="refusal"
            className="rounded-lg border border-red-500/50 p-2.5 text-sm text-white"
          >
            {state.refusal.reason}
          </p>
        )}
        {state.thumped && !state.won && (
          <p className="rounded-lg border border-red-500/50 p-2.5 text-sm text-white">
            That thump was the mixer waking up through a live speaker. Switch
            both off, and start again in the other order.
          </p>
        )}
        {state.note && !state.won && (
          <p className="rounded-lg bg-white/[0.04] p-2.5 text-sm text-white/85">
            {state.note}
          </p>
        )}
        {state.showHint && !state.won && (
          <p className="rounded-lg bg-white/[0.04] p-2.5 text-sm text-white/85">
            {step.hint}
          </p>
        )}
        {failed.length > 0 && (
          <p className="rounded-lg border border-red-500/50 p-2.5 text-sm text-white">
            Some sounds didn’t load ({failed.join(', ')}). Check your connection
            and open the mission again.
          </p>
        )}
      </div>
    </>
  );
  const actions = (
    <>
      {!state.won && (
        <div
          className={
            narrow
              ? 'flex flex-wrap gap-2'
              : 'sticky bottom-0 -mx-4 -mb-4 mt-auto flex flex-wrap gap-2 border-t border-white/10 bg-[#101012] p-3'
          }
        >
          {step.confirm && (
            <button
              type="button"
              data-testid="confirm"
              onClick={() => dispatch({ type: 'confirm' })}
              className="min-h-11 flex-1 rounded-lg px-3 text-sm font-medium text-black"
              style={{ background: accent }}
            >
              {step.confirm}
            </button>
          )}
          <button
            type="button"
            data-testid="undo"
            disabled={state.history.length === 0}
            onClick={() => dispatch({ type: 'undo' })}
            className="min-h-11 rounded-lg border border-white/15 px-3 text-sm text-white/85 hover:border-white/40 disabled:opacity-40 disabled:hover:border-white/15"
          >
            Undo
          </button>
          <button
            type="button"
            data-testid="hint"
            disabled={state.showHint}
            onClick={() => dispatch({ type: 'hint' })}
            className="min-h-11 rounded-lg border border-white/15 px-3 text-sm text-white/85 hover:border-white/40 disabled:opacity-40 disabled:hover:border-white/15"
          >
            Hint
          </button>
          {!mission.handKeys && (
            <button
              type="button"
              data-testid="play"
              aria-pressed={playing}
              aria-label={playing ? 'Stop the music' : 'Play the music'}
              onClick={() => setPlaying(!playing)}
              className="min-h-11 rounded-lg border border-white/15 px-3 text-sm text-white/85 hover:border-white/40"
            >
              {narrow
                ? playing
                  ? 'Stop'
                  : 'Play'
                : playing
                  ? 'Stop the music'
                  : 'Play the music'}
            </button>
          )}
        </div>
      )}
    </>
  );
  const footer = (
    <>
      {(step.choose || rack.length > 0) && !state.won && (
        <div
          data-testid="dock"
          className="flex max-h-[30%] shrink-0 flex-col gap-2 overflow-y-auto border-t border-white/10 p-3"
        >
          {step.choose && (
            <ul className="flex flex-wrap gap-2" aria-label="The shelf">
              {shelf.map((gear) => (
                <li key={gear.id}>
                  <button
                    type="button"
                    data-testid={`shelf-${gear.id}`}
                    onClick={() =>
                      dispatch({ type: 'placeGear', gear: gear.id })
                    }
                    className="flex min-h-11 items-center gap-2 rounded-lg border border-white/15 px-2 py-1 text-sm text-white transition-colors hover:border-white/50"
                  >
                    <GearThumb
                      visual={gearVisual(gear)}
                      className="size-11 shrink-0"
                    />
                    {gearName(gear)}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!step.choose && rack.length > 0 && (
            <>
              <ul
                className="flex flex-wrap items-stretch gap-2"
                aria-label="The cable rack"
              >
                {rack.map((kind) => {
                  const inHand = state.cable === kind;
                  return (
                    <li key={kind}>
                      <button
                        type="button"
                        aria-pressed={inHand}
                        data-testid={`rack-${kind}`}
                        aria-label={CABLE_NAME[kind]}
                        onClick={() =>
                          dispatch({
                            type: 'pickCable',
                            cable: inHand ? null : kind,
                          })
                        }
                        className={`flex min-h-11 items-center gap-1 rounded-lg border px-2 text-sm text-white transition-colors ${inHand ? '' : 'border-white/15 hover:border-white/50'}`}
                        style={
                          inHand
                            ? {
                                borderColor: accent,
                                boxShadow: `inset 0 0 0 1px ${accent}`,
                              }
                            : undefined
                        }
                      >
                        <PlugIcon kind={kind} small={narrow} />
                        {narrow ? CABLE_SHORT_NAME[kind] : CABLE_NAME[kind]}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p
                className={`min-h-5 text-sm text-white/70 ${narrow ? 'line-clamp-2' : ''}`}
              >
                {state.cable
                  ? state.pending
                    ? 'One end is in. Now the other.'
                    : CABLE_BLURB[state.cable]
                  : 'Pick a cable. With no cable in your hand, tapping a plug pulls it out.'}
              </p>
            </>
          )}
        </div>
      )}

      {state.won && (
        <div
          data-testid="won"
          className="shrink-0 border-t border-white/10 p-4"
          style={{ borderTopColor: accent }}
        >
          <h3 className="text-lg text-white">
            {clearedCleanly(state)
              ? 'Cleared'
              : 'Cleared, with some help along the way'}
          </h3>
          {state.note && (
            <p className="mt-1 max-w-3xl text-sm text-white/75">{state.note}</p>
          )}
          <p className="mt-1 max-w-3xl text-base text-white">{mission.why}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {nextTitle && (
              <button
                type="button"
                data-testid="next"
                onClick={onNext}
                className="min-h-11 rounded-lg px-4 text-sm font-medium text-black"
                style={{ background: accent }}
              >
                Next: {nextTitle}
              </button>
            )}
            <button
              type="button"
              data-testid="back"
              onClick={onExit}
              className="min-h-11 rounded-lg border border-white/15 px-4 text-sm text-white/85 hover:border-white/40"
            >
              All missions
            </button>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      {narrow && (
        <div
          data-testid="phone-prompt"
          className="flex max-h-[26%] shrink-0 flex-col gap-2 overflow-y-auto border-b border-white/10 p-3"
        >
          {promptCard}
        </div>
      )}
      {/* On a phone, the words and the bench scroll together. */}
      <div className="min-h-0 flex-1 overflow-y-auto lg:contents">
        <aside className="flex shrink-0 flex-col gap-3 p-4 lg:w-[23rem] lg:overflow-y-auto lg:border-r lg:border-white/10">
          <div className="flex items-start justify-between">
            <button
              type="button"
              onClick={onExit}
              className="self-start text-sm text-white/70 hover:text-white"
            >
              ← {chapterOf(mission).title}
            </button>
            {phoneDial}
          </div>
          <div>
            <p
              className="text-xs uppercase tracking-wide"
              style={{ color: accent }}
            >
              {ACTIVITY_NAME[mission.activity]}
            </p>
            <h2 className="text-xl text-white">{mission.title}</h2>
            <p className="mt-1 text-sm text-white/70">{mission.brief}</p>
          </div>
          {!narrow && promptCard}

          {mission.inputList && (
            <div className="rounded-xl border border-white/10 p-3">
              <h3 className="mb-1 text-sm text-white">Input list</h3>
              <ol className="grid grid-cols-2 gap-x-3 text-sm text-white/80">
                {mission.inputList.map((name, i) => (
                  <li key={name}>
                    <span className="tabular-nums text-white/50">{i + 1}</span>{' '}
                    {name}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {state.probe && probe && (
            <ScopeCard
              audio={audio}
              cable={state.probe}
              accent={accent}
              title={probe.title}
              note={probe.note}
              onClose={() => dispatch({ type: 'probe', cable: null })}
            />
          )}

          {step.walkable && (
            <div
              role="radiogroup"
              aria-label="Where you’re standing"
              className="flex flex-col gap-1"
            >
              <span className="text-xs text-white/70">
                Where you’re standing
              </span>
              <div className="flex gap-1">
                {(
                  [
                    ['foh', 'At the desk'],
                    ['stage', 'On stage'],
                  ] as const
                ).map(([where, label]) => {
                  const here = (rig.env.listen ?? 'foh') === where;
                  return (
                    <button
                      key={where}
                      type="button"
                      role="radio"
                      aria-checked={here}
                      data-testid={`walk-${where}`}
                      onClick={() => dispatch({ type: 'walk', to: where })}
                      className={`min-h-9 flex-1 rounded-md border px-2.5 text-sm ${here ? 'text-black' : 'border-white/15 text-white/80 hover:border-white/40'}`}
                      style={
                        here
                          ? { background: accent, borderColor: accent }
                          : undefined
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step.controls?.map(({ gear, ids }) => {
            const instance = rig.gear[gear];
            return instance?.placed ? (
              <GearControls
                key={gear}
                gear={instance}
                ids={ids}
                accent={accent}
                inputList={mission.inputList}
                dispatch={dispatch}
              />
            ) : null;
          })}

          {step.keys && <PlayKeys onPlay={playKey} />}

          {sink && (step.controls?.length ?? 0) > 0 && (
            <div>
              <LiveMeter
                read={() => audio?.sinkLevel(sink) ?? -Infinity}
                label={`At the ${gearName(rig.gear[sink]).toLowerCase()}`}
                accent={accent}
              />
              {clipping && (
                <p className="mt-1 text-xs text-red-400">A stage is clipping</p>
              )}
            </div>
          )}

          {!narrow && actions}
          {loading && <p className="text-sm text-white/60">Loading sounds…</p>}
        </aside>

        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <div
            className={`p-2 ${narrow ? '' : 'min-h-0 flex-1 overflow-hidden'}`}
          >
            {bench}
          </div>
          {!narrow && footer}
        </main>
      </div>
      {narrow && (
        <div className="flex max-h-[32%] shrink-0 flex-col overflow-y-auto border-t border-white/10">
          {!state.won && <div className="p-3 pb-0">{actions}</div>}
          {footer}
        </div>
      )}
    </div>
  );
}

// ── The game ───────────────────────────────────────────────────────────────

const reducer = (
  state: MissionState | null,
  action:
    | MissionAction
    | { type: 'open'; mission: Mission }
    | { type: 'close' },
): MissionState | null => {
  if (action.type === 'open') return startMission(action.mission);
  if (action.type === 'close') return null;
  return state ? missionReducer(state, action) : state;
};

export interface SignalFlowProps {
  onCorrect?: () => void;
  onWrong?: () => void;
}

export default function SignalFlow({ onCorrect, onWrong }: SignalFlowProps) {
  const [state, dispatch] = useReducer(reducer, null);
  const [volume, setVolume] = useState(START_VOLUME);
  const audioHook = useRigAudio(state, volume);
  const { cleared, clearMission } = useSignalFlowProgress();
  const narrow = useMediaQuery('(max-width: 1023px)');
  const dial = <VolumeDial value={volume} onChange={setVolume} />;

  // A mission's result counts once, when it first clears.
  const scored = useRef<MissionState['mission'] | null>(null);
  useEffect(() => {
    if (!state?.won) {
      if (!state) scored.current = null;
      return;
    }
    if (scored.current === state.mission) return;
    scored.current = state.mission;
    clearMission(state.mission.id);
    if (clearedCleanly(state)) onCorrect?.();
    else onWrong?.();
  }, [state, clearMission, onCorrect, onWrong]);

  const open = useCallback((mission: Mission) => {
    scored.current = null;
    dispatch({ type: 'open', mission });
  }, []);

  const next = useMemo(() => {
    if (!state) return null;
    const i = ALL_MISSIONS.indexOf(state.mission);
    return ALL_MISSIONS[i + 1] ?? null;
  }, [state]);

  return (
    <div className="flex size-full flex-col overflow-hidden bg-[#101012]">
      <ArcadeGameHeader title="Signal Flow" right={narrow ? undefined : dial} />
      {state ? (
        <MissionScreen
          state={state}
          dispatch={dispatch}
          accent={accentOf(chapterOf(state.mission))}
          audioHook={audioHook}
          onExit={() => dispatch({ type: 'close' })}
          onNext={() => next && open(next)}
          nextTitle={next?.title ?? null}
          phoneDial={narrow ? dial : null}
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {narrow && <div className="flex justify-end px-4 pt-3">{dial}</div>}
          <ChapterList cleared={cleared} onOpen={open} />
        </div>
      )}
    </div>
  );
}
