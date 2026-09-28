import { cn } from '@/components/utilities';

const WHITE_PCS = new Set([0, 2, 4, 5, 7, 9, 11]);
const BLACK_AFTER: Record<number, number> = { 0: 1, 2: 3, 5: 6, 7: 8, 9: 10 };

/** The white keys from `startMidi` through `endMidi` (both white keys). */
export const whiteKeysBetween = (startMidi: number, endMidi: number) => {
  const whites: number[] = [];
  for (let m = startMidi; m <= endMidi; m++)
    if (WHITE_PCS.has(m % 12)) whites.push(m);
  return whites;
};

/**
 * A key's horizontal center as a % of the keyboard's width (a black key sits
 * on the line after its white key) — for lining things up with the keys.
 */
export const keyCenterPct = (midi: number, whites: readonly number[]) => {
  const w = 100 / whites.length;
  const i = whites.indexOf(midi);
  return i >= 0 ? (i + 0.5) * w : (whites.indexOf(midi - 1) + 1) * w;
};

/**
 * Lightweight demo keyboard for the product tour. Unlike the app's
 * PianoKeyboard it is fluid-width and never touches the piano sampler (a click
 * only calls `onPress`). `lit` = keys being played (full color); `hint` = keys
 * tinted as a target (e.g. a scale, always in the key-center color).
 */
export const DemoKeys = ({
  startMidi = 48,
  octaves = 2,
  endMidi,
  lit,
  hint,
  onPress,
  className,
  label = 'Demo keyboard',
}: {
  startMidi?: number;
  octaves?: number;
  /** Last key (a white key); defaults to `octaves` above `startMidi`. */
  endMidi?: number;
  lit?: ReadonlyMap<number, string>;
  hint?: ReadonlyMap<number, string>;
  onPress?: (midi: number) => void;
  className?: string;
  label?: string;
}) => {
  const whites = whiteKeysBetween(
    startMidi,
    endMidi ?? startMidi + octaves * 12,
  );

  const whiteW = 100 / whites.length;

  const keyStyle = (midi: number, black: boolean) => {
    const litColor = lit?.get(midi);
    if (litColor) return { background: litColor };
    const hintColor = hint?.get(midi);
    if (hintColor)
      return {
        background: `color-mix(in srgb, ${hintColor} ${black ? 70 : 55}%, ${black ? '#18181b' : 'white'})`,
      };
    return undefined;
  };

  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'relative flex h-full w-full select-none overflow-hidden rounded-lg bg-black p-px',
        className,
      )}
    >
      {whites.map((midi) => (
        <button
          key={midi}
          type="button"
          tabIndex={-1}
          aria-label={`Note ${midi}`}
          onPointerDown={() => onPress?.(midi)}
          className={cn(
            'mr-px h-full flex-1 rounded-b-[4px] bg-white transition-[background-color,transform] duration-100 last:mr-0 active:translate-y-px',
            lit?.has(midi) && 'translate-y-px',
          )}
          style={keyStyle(midi, false)}
        />
      ))}
      {whites.slice(0, -1).map((midi, i) => {
        const black = BLACK_AFTER[midi % 12];
        if (black === undefined) return null;
        const bMidi = midi - (midi % 12) + black;
        return (
          <button
            key={bMidi}
            type="button"
            tabIndex={-1}
            aria-label={`Note ${bMidi}`}
            onPointerDown={() => onPress?.(bMidi)}
            className="absolute top-px z-10 h-3/5 rounded-b-[4px] border-b-[3px] border-b-zinc-700 bg-zinc-900 transition-[background-color] duration-100"
            style={{
              left: `calc(${(i + 1) * whiteW}% - ${whiteW * 0.3}%)`,
              width: `${whiteW * 0.6}%`,
              ...keyStyle(bMidi, true),
            }}
          />
        );
      })}
    </div>
  );
};
