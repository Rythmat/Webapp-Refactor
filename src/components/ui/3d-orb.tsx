import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import {
  alignDegrees,
  type Cell,
  CENTER,
  cellCenterPos,
  cellLabel,
  cellPath,
  DIATONIC_MODES,
  INNER_RADIUS,
  LONGITUDES,
  MODE_INTERVALS,
  modeName,
  moveCell,
  NOTE_TO_PC,
  noteLabel,
  OUTER_RADIUS,
  PC_NAMES,
  rimPos,
  ringRadii,
  rootOf,
  scaleOf,
  SIZE,
  smootherstep,
  SPIRALS,
  spiralPath,
  WEDGE_ANGLE,
  WEDGE_COUNT,
} from './modalSphereModel';

/**
 * The Modal Sphere: the 7 diatonic modes as rings (Lydian outside, Locrian
 * inside) and the 12 key signatures as wedges round the circle of fifths
 * (`modalSphereModel.ts` has the data and the geometry).
 *
 * - Click a cell (or focus it and press Enter) to read that mode on that
 *   root, and the wheel turns every ring so all 7 modes on that root line
 *   up: the parallel modes (C Lydian, C Ionian … C Locrian), one flat more
 *   each ring inward. Clicking another mode on the same root only moves the
 *   highlight; a note on another root turns the wheel to that root.
 * - Click a key signature on the rim for its 7 modes, or a mode in the
 *   column for that ring.
 * - Arrow keys move round a ring (← →) and between rings (↑ ↓); Escape
 *   clears.
 *
 * The spirals are drawn only: a click on a cell always means the cell. The
 * rings turn by one animation shared with the spirals, so both move together
 * in every browser; under reduced motion they jump.
 */

const TURN_MS = 600;
const UNTURNED: readonly number[] = new Array(DIATONIC_MODES.length).fill(0);
const SPIRAL_COLORS = ['#ffffff', '#dddddd'];

/** The rings' turns, in degrees, gliding to `target` whenever it changes. */
function useRingTurns(target: readonly number[], instant: boolean): number[] {
  const key = target.join(',');
  const [turns, setTurns] = useState<number[]>(() => [...target]);
  const live = useRef<number[]>([...target]);

  useEffect(() => {
    const to = key.split(',').map(Number);
    const from = live.current;
    if (instant || typeof requestAnimationFrame === 'undefined') {
      live.current = to;
      setTurns(to);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = smootherstep((now - start) / TURN_MS);
      const next = from.map((f, i) => f + (to[i] - f) * t);
      live.current = next;
      setTurns(next);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [key, instant]);

  return turns;
}

const sameCell = (a: Cell | null, b: Cell) =>
  a !== null && a.w === b.w && a.m === b.m;

export default function ModalSphere() {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const narrow = useMediaQuery('(max-width: 519px)');

  const [cell, setCell] = useState<Cell | null>(null);
  const [wedge, setWedge] = useState<number | null>(null);
  const [mode, setMode] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');

  // One cell and one rim label take Tab at a time; arrows move between them.
  const [focusCell, setFocusCell] = useState<Cell>({ w: 0, m: 1 });
  const [rimFocus, setRimFocus] = useState(0);
  const [keyboard, setKeyboard] = useState(false);
  const [cellFocused, setCellFocused] = useState(false);
  const cellRefs = useRef(new Map<string, SVGPathElement>());
  const rimRefs = useRef<(SVGGElement | null)[]>([]);

  // The picked note's root: its 7 modes are lined up while it is picked.
  const spiral = cell ? NOTE_TO_PC[rootOf(cell.w, cell.m)] : null;
  const turns = useRingTurns(
    spiral === null ? UNTURNED : alignDegrees(SPIRALS[spiral]),
    reducedMotion,
  );

  const clearAll = useCallback(() => {
    setCell(null);
    setWedge(null);
    setMode(null);
    setAnnouncement('Selection cleared');
  }, []);

  const selectCell = useCallback(
    (next: Cell) => {
      setWedge(null);
      setMode(null);
      if (sameCell(cell, next)) {
        setCell(null);
        setAnnouncement('Selection cleared');
        return;
      }
      setCell(next);
      const pc = NOTE_TO_PC[rootOf(next.w, next.m)];
      setAnnouncement(
        `${cellLabel(next)}. Notes ${scaleOf(next.w, next.m).join(' ')}. The wheel lines up every mode on ${PC_NAMES[pc]}.`,
      );
    },
    [cell],
  );

  const selectWedge = useCallback(
    (w: number) => {
      setCell(null);
      setMode(null);
      const on = wedge !== w;
      setWedge(on ? w : null);
      setAnnouncement(
        on
          ? `Key signature ${LONGITUDES[w].spoken}: ${LONGITUDES[w].notes.map((n, m) => `${noteLabel(n)} ${modeName(m)}`).join(', ')}`
          : 'Selection cleared',
      );
    },
    [wedge],
  );

  const selectMode = useCallback(
    (m: number) => {
      setCell(null);
      setWedge(null);
      const on = mode !== m;
      setMode(on ? m : null);
      setAnnouncement(
        on ? `${modeName(m)}: ${MODE_INTERVALS[m]}` : 'Selection cleared',
      );
    },
    [mode],
  );

  // Keyboard focus follows the roving cell.
  useEffect(() => {
    if (!keyboard || !cellFocused) return;
    cellRefs.current.get(`${focusCell.w}:${focusCell.m}`)?.focus();
  }, [focusCell, keyboard, cellFocused]);

  const onCellKey = (event: KeyboardEvent, here: Cell) => {
    const next = moveCell(here, event.key);
    if (next) {
      event.preventDefault();
      setKeyboard(true);
      setFocusCell(next);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectCell(here);
    }
  };

  const onRimKey = (event: KeyboardEvent, w: number) => {
    let next: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown')
      next = (w + 1) % WEDGE_COUNT;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
      next = (w + WEDGE_COUNT - 1) % WEDGE_COUNT;
    if (next !== null) {
      event.preventDefault();
      setRimFocus(next);
      rimRefs.current[next]?.focus();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectWedge(w);
    }
  };

  const active = cell !== null || wedge !== null || mode !== null;
  const onSpiral = (w: number, m: number) =>
    spiral !== null && SPIRALS[spiral].wedges[m] === w;

  const noteSize = narrow ? 22 : 15;
  const tagSize = 9.5;

  return (
    <div
      className="w-full text-[hsl(var(--ui-foreground))]"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && active) {
          event.preventDefault();
          clearAll();
        }
      }}
      onPointerDown={() => setKeyboard(false)}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 py-6 lg:flex-row lg:items-center lg:justify-center lg:py-10">
        <nav
          aria-label="Modes, brightest first"
          className="flex flex-wrap justify-center gap-2 lg:w-36 lg:flex-col lg:items-stretch"
        >
          {DIATONIC_MODES.map((_, m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => selectMode(m)}
              className={
                mode === m
                  ? 'rounded-full bg-white px-4 py-1.5 text-sm font-bold text-[#101012]'
                  : 'rounded-full border border-white/15 px-4 py-1.5 text-sm text-white/75 hover:bg-white/10 hover:text-white'
              }
            >
              {modeName(m)}
            </button>
          ))}
        </nav>

        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="group"
          aria-label="Modal Sphere: rings are the modes, Lydian outside to Locrian inside; wedges are the key signatures round the circle of fifths"
          className="aspect-square w-full max-w-[760px] shrink-0 select-none"
          style={{ maxHeight: 'calc(100vh - 3rem)' }}
        >
          {/* The rings, each turned as a whole. */}
          {DIATONIC_MODES.map((_, m) => (
            <g
              key={`ring-${m}`}
              transform={`rotate(${turns[m]} ${CENTER} ${CENTER})`}
            >
              {LONGITUDES.map((lon, w) => {
                const here = { w, m };
                const selected = sameCell(cell, here);
                const lit =
                  selected || wedge === w || mode === m || onSpiral(w, m);
                const isFocusTarget = sameCell(focusCell, here);
                return (
                  <path
                    key={`cell-${w}-${m}`}
                    ref={(el) => {
                      if (el) cellRefs.current.set(`${w}:${m}`, el);
                      else cellRefs.current.delete(`${w}:${m}`);
                    }}
                    d={cellPath(m, w)}
                    fill={lon.hex}
                    stroke={
                      selected
                        ? '#ffffff'
                        : lit
                          ? 'rgba(255,255,255,0.75)'
                          : 'rgba(0,0,0,0.4)'
                    }
                    strokeWidth={selected ? 3 : lit ? 1.5 : 1}
                    opacity={active && !lit ? 0.25 : 1}
                    role="button"
                    tabIndex={isFocusTarget ? 0 : -1}
                    aria-label={cellLabel(here)}
                    aria-pressed={selected}
                    className="cursor-pointer outline-none transition-opacity duration-300 motion-reduce:transition-none"
                    onClick={() => {
                      setFocusCell(here);
                      selectCell(here);
                    }}
                    onKeyDown={(event) => onCellKey(event, here)}
                    onFocus={() => {
                      setFocusCell(here);
                      setCellFocused(true);
                    }}
                    onBlur={() => setCellFocused(false)}
                  />
                );
              })}
            </g>
          ))}

          {/* The selected mode's ring, outlined. */}
          {mode !== null ? (
            <g pointerEvents="none">
              <circle
                cx={CENTER}
                cy={CENTER}
                r={ringRadii(mode).r1}
                fill="none"
                stroke="#ffffff"
                strokeWidth={2.5}
              />
              <circle
                cx={CENTER}
                cy={CENTER}
                r={ringRadii(mode).r2}
                fill="none"
                stroke="#ffffff"
                strokeWidth={2.5}
              />
            </g>
          ) : null}

          {/* Ring and wedge separators (fixed). */}
          <g pointerEvents="none">
            {DIATONIC_MODES.map((_, m) => (
              <circle
                key={`sep-ring-${m}`}
                cx={CENTER}
                cy={CENTER}
                r={ringRadii(m).r1}
                fill="none"
                stroke="rgba(255,255,255,0.22)"
                strokeWidth={1}
              />
            ))}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={INNER_RADIUS}
              fill="none"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth={1}
            />
            {spiral === null
              ? LONGITUDES.map((_, w) => {
                  const a = w * WEDGE_ANGLE - Math.PI / 2;
                  return (
                    <line
                      key={`sep-wedge-${w}`}
                      x1={CENTER + INNER_RADIUS * Math.cos(a)}
                      y1={CENTER + INNER_RADIUS * Math.sin(a)}
                      x2={CENTER + OUTER_RADIUS * Math.cos(a)}
                      y2={CENTER + OUTER_RADIUS * Math.sin(a)}
                      stroke="rgba(255,255,255,0.15)"
                      strokeWidth={1}
                    />
                  );
                })
              : null}
          </g>

          {/* Note labels, kept upright as their rings turn. */}
          <g pointerEvents="none">
            {DIATONIC_MODES.map((_, m) =>
              LONGITUDES.map((lon, w) => {
                const { x, y } = cellCenterPos(m, w, turns[m]);
                const lit =
                  sameCell(cell, { w, m }) ||
                  wedge === w ||
                  mode === m ||
                  onSpiral(w, m);
                return (
                  <text
                    key={`note-${w}-${m}`}
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="fill-white font-bold transition-opacity duration-300 motion-reduce:transition-none"
                    fontSize={noteSize}
                    opacity={active && !lit ? 0.2 : 1}
                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
                  >
                    <tspan>{noteLabel(lon.notes[m])}</tspan>
                    {narrow ? null : (
                      <tspan
                        className="fill-white/70 font-normal"
                        fontSize={tagSize}
                      >{` ${modeName(m).slice(0, 3)}`}</tspan>
                    )}
                  </text>
                );
              }),
            )}
          </g>

          {/* Spirals: drawn only, never in the way of a click. */}
          <g pointerEvents="none">
            {SPIRALS.map((s) => (
              <path
                key={`spiral-${s.pc}`}
                d={spiralPath(s, turns)}
                fill="none"
                stroke={spiral === s.pc ? '#ffffff' : SPIRAL_COLORS[s.pc % 2]}
                strokeWidth={spiral === s.pc ? 3 : 1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={spiral === null ? 0.45 : spiral === s.pc ? 1 : 0.12}
              />
            ))}
          </g>

          {/* The keyboard's cell. */}
          {keyboard && cellFocused ? (
            <path
              d={cellPath(focusCell.m, focusCell.w)}
              transform={`rotate(${turns[focusCell.m]} ${CENTER} ${CENTER})`}
              fill="none"
              stroke="#ffffff"
              strokeWidth={4}
              strokeDasharray="6 4"
              pointerEvents="none"
            />
          ) : null}

          {/* Key signatures on the rim. */}
          {LONGITUDES.map((lon, w) => {
            const { x, y } = rimPos(w);
            const on = wedge === w;
            return (
              <g
                key={`rim-${w}`}
                ref={(el) => {
                  rimRefs.current[w] = el;
                }}
                role="button"
                tabIndex={rimFocus === w ? 0 : -1}
                aria-label={`Key signature ${lon.spoken}, the modes of ${noteLabel(lon.notes[1])} major`}
                aria-pressed={on}
                className="cursor-pointer outline-none"
                onClick={() => {
                  setRimFocus(w);
                  selectWedge(w);
                }}
                onKeyDown={(event) => onRimKey(event, w)}
                onFocus={() => setRimFocus(w)}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={narrow ? 26 : 22}
                  fill={on ? lon.hex : 'transparent'}
                  stroke={on ? '#ffffff' : 'transparent'}
                  strokeWidth={2}
                />
                <text
                  x={x}
                  y={y - 5}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-white font-bold"
                  fontSize={narrow ? 15 : 12}
                >
                  {noteLabel(lon.label)}
                </text>
                <text
                  x={x}
                  y={y + 9}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-white/60"
                  fontSize={narrow ? 13 : 10}
                >
                  {noteLabel(lon.notes[1])}
                </text>
              </g>
            );
          })}

          {/* What the centre names. */}
          <g pointerEvents="none">
            {cell !== null ? (
              <>
                <text
                  x={CENTER}
                  y={CENTER - 10}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-white font-bold"
                  fontSize={narrow ? 30 : 24}
                >
                  {noteLabel(rootOf(cell.w, cell.m))}
                </text>
                <text
                  x={CENTER}
                  y={CENTER + 16}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-white/75"
                  fontSize={narrow ? 17 : 13}
                >
                  {modeName(cell.m)}
                </text>
              </>
            ) : mode !== null ? (
              <text
                x={CENTER}
                y={CENTER}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-white font-bold"
                fontSize={narrow ? 22 : 18}
              >
                {modeName(mode)}
              </text>
            ) : wedge !== null ? (
              <text
                x={CENTER}
                y={CENTER}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-white font-bold"
                fontSize={narrow ? 26 : 22}
              >
                {noteLabel(LONGITUDES[wedge].label)}
              </text>
            ) : null}
          </g>
        </svg>

        <aside
          aria-label="Selection"
          className="w-full max-w-sm rounded-2xl border border-white/10 bg-[hsl(var(--ui-card))] p-5 lg:w-72"
        >
          {cell !== null ? (
            <>
              <h2 className="text-xl font-bold">
                {noteLabel(rootOf(cell.w, cell.m))} {modeName(cell.m)}
              </h2>
              <p className="mt-1 text-sm text-white/55">
                Key signature: {LONGITUDES[cell.w].spoken}
              </p>
              <p className="mt-4 text-lg tracking-wide">
                {scaleOf(cell.w, cell.m).join('  ')}
              </p>
              <p className="mt-1 text-sm text-white/55">
                {MODE_INTERVALS[cell.m]}
              </p>
              {spiral !== null ? (
                <>
                  <h3 className="mt-6 text-sm font-bold uppercase tracking-[0.12em] text-white/55">
                    All modes on {PC_NAMES[spiral]}
                  </h3>
                  <p className="mt-1 text-xs text-white/45">
                    Brightest to darkest: each ring inward has one flat more.
                  </p>
                  <ModeList
                    cells={SPIRALS[spiral].wedges.map((w, m) => ({ w, m }))}
                    note={(c) => LONGITUDES[c.w].spoken}
                    current={cell}
                    onPick={(c) => {
                      if (!sameCell(cell, c)) selectCell(c);
                    }}
                  />
                </>
              ) : null}
              <div className="mt-4">
                <ClearButton onClear={clearAll} />
              </div>
            </>
          ) : wedge !== null ? (
            <>
              <h2 className="text-xl font-bold">
                Key signature: {LONGITUDES[wedge].spoken}
              </h2>
              <p className="mt-1 text-sm text-white/55">
                The 7 modes of {noteLabel(LONGITUDES[wedge].notes[1])} major,
                brightest first.
              </p>
              <ModeList
                cells={DIATONIC_MODES.map((_, m) => ({ w: wedge, m }))}
                note={(c) => MODE_INTERVALS[c.m]}
                onPick={selectCell}
              />
              <div className="mt-4">
                <ClearButton onClear={clearAll} />
              </div>
            </>
          ) : mode !== null ? (
            <>
              <h2 className="text-xl font-bold">{modeName(mode)}</h2>
              <p className="mt-1 text-sm text-white/55">
                {MODE_INTERVALS[mode]}
              </p>
              <p className="mt-4 text-sm text-white/75">
                The ring shows {modeName(mode)} on every root. Pick a note to
                read its scale.
              </p>
              <div className="mt-4">
                <ClearButton onClear={clearAll} />
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold">Modal Sphere</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                Rings are the modes, Lydian outside to Locrian inside. Wedges
                are the key signatures round the circle of fifths.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                Pick a note: the wheel turns to line up every mode on that root
                (C Lydian, C Ionian … C Locrian). Or pick a key signature on the
                rim for its 7 modes, or a mode for its ring.
              </p>
            </>
          )}
        </aside>
      </div>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}

const ClearButton = ({ onClear }: { onClear: () => void }) => (
  <button
    type="button"
    onClick={onClear}
    className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-white/80 hover:bg-white/10"
  >
    Clear
  </button>
);

/** A list of cells as buttons: "C Lydian", with a note ("1 sharp") below. */
const ModeList = ({
  cells,
  note,
  current = null,
  onPick,
}: {
  cells: Cell[];
  note: (cell: Cell) => string;
  /** The picked cell, marked in the list. */
  current?: Cell | null;
  onPick: (cell: Cell) => void;
}) => (
  <ul className="mt-3 space-y-0.5">
    {cells.map((c) => (
      <li key={`${c.w}:${c.m}`}>
        <button
          type="button"
          aria-current={sameCell(current, c) ? 'true' : undefined}
          onClick={() => onPick(c)}
          className={
            sameCell(current, c)
              ? 'flex w-full items-start gap-3 rounded-lg bg-white/10 px-2 py-1.5 text-left ring-1 ring-white/60'
              : 'flex w-full items-start gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-white/10'
          }
        >
          <span
            aria-hidden
            className="mt-1.5 size-3 shrink-0 rounded-full"
            style={{ background: LONGITUDES[c.w].hex }}
          />
          <span className="flex min-w-0 flex-col">
            <span className="whitespace-nowrap font-bold">
              {noteLabel(rootOf(c.w, c.m))} {modeName(c.m)}
            </span>
            <span className="text-xs text-white/50">{note(c)}</span>
          </span>
        </button>
      </li>
    ))}
  </ul>
);
