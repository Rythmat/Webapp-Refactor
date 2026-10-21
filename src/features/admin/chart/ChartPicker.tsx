import type { FC } from 'react';
import {
  KEYS,
  keyPrefersFlats,
  pcName,
  PROGRESSIONS,
  type TimeSignature,
} from '@/curriculum/engine/bassLines/harmony';
import { CONSOLE_LABEL } from '../ui/styles';
import {
  chosenChart,
  guessedKey,
  OWN_CHORDS,
  type ChartChoice,
} from './chartChoice';

/** 'C major', 'F♯ minor': spelled as that key spells. */
const keyName = (pc: number, minor: boolean) =>
  `${pcName(pc, keyPrefersFlats(pc, minor))} ${minor ? 'minor' : 'major'}`;

const control =
  'rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm outline-none placeholder:italic placeholder:text-white/25 focus:ring-1 focus:ring-[#60a5fa] disabled:opacity-40';

interface Props {
  value: ChartChoice;
  onChange: (next: ChartChoice) => void;
  timeSignature: TimeSignature;
  /**
   * Offer "Its own chords" first: a part over the chords it was captured
   * over, as captured (the Parts editor).
   */
  ownChords?: boolean;
}

/**
 * What an editor plays over: a progression in a key, or a typed chart that
 * wins over it. The same fields in the Band, Parts, Bass line and Comping
 * editors; laid out to sit in an editor's row of settings. Parts follow the
 * chart in the key shown under a typed chart.
 */
export const ChartPicker: FC<Props> = ({
  value,
  onChange,
  timeSignature,
  ownChords = false,
}) => {
  const chart = chosenChart(value, timeSignature);
  const isTyped = Boolean(chart.typed?.bars.length);
  const auto = isTyped ? guessedKey(chart.bars) : null;
  const guess = {
    tonic: auto?.tonic ?? 0,
    minor: ['aeolian', 'dorian', 'phrygian'].includes(auto?.mode ?? ''),
  };
  return (
    <>
      <label className="flex flex-col gap-1">
        <span className={CONSOLE_LABEL}>Plays over</span>
        <select
          value={chart.own ? OWN_CHORDS : chart.progression.id}
          onChange={(e) =>
            onChange({
              ...value,
              progression: e.target.value,
              chart: undefined,
              chartKey: undefined,
            })
          }
          className={control}
          disabled={isTyped}
          aria-label="Progression"
        >
          {ownChords && <option value={OWN_CHORDS}>Its own chords</option>}
          {[...new Set(PROGRESSIONS.map((p) => p.group))].map((group) => (
            <optgroup key={group} label={group}>
              {PROGRESSIONS.filter((p) => p.group === group).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className={CONSOLE_LABEL}>Key</span>
        {isTyped ? (
          // A typed chart's key: guessed from its chords until it's set.
          <select
            value={
              value.chartKey
                ? `${value.chartKey.tonic}:${value.chartKey.minor ? 'm' : ''}`
                : 'auto'
            }
            onChange={(e) => {
              const [tonic, minor] = e.target.value.split(':');
              onChange({
                ...value,
                chartKey:
                  e.target.value === 'auto'
                    ? undefined
                    : { tonic: Number(tonic), minor: minor === 'm' },
              });
            }}
            className={control}
            aria-label="Key"
            title="The key parts play in over this chart: a hand that Stays in Key plays its notes. Auto is the key its first chord suggests."
          >
            <option value="auto">
              Auto: {keyName(guess.tonic, guess.minor)}
            </option>
            <optgroup label="Major">
              {KEYS.map((k) => (
                <option key={k.pc} value={`${k.pc}:`}>
                  {keyName(k.pc, false)}
                </option>
              ))}
            </optgroup>
            <optgroup label="Minor">
              {KEYS.map((k) => (
                <option key={k.pc} value={`${k.pc}:m`}>
                  {keyName(k.pc, true)}
                </option>
              ))}
            </optgroup>
          </select>
        ) : (
          <select
            value={chart.keyPc}
            onChange={(e) =>
              onChange({ ...value, key: Number(e.target.value) })
            }
            className={control}
            disabled={chart.own}
            aria-label="Key"
          >
            {KEYS.map((k) => (
              <option key={k.pc} value={k.pc}>
                {chart.progression.minor
                  ? `${pcName(k.pc, keyPrefersFlats(k.pc, true))} minor`
                  : k.name}
              </option>
            ))}
          </select>
        )}
      </label>
      <label className="flex min-w-64 flex-1 flex-col gap-1">
        <span className={CONSOLE_LABEL}>Or type a chart</span>
        <input
          value={value.chart ?? ''}
          onChange={(e) =>
            onChange({ ...value, chart: e.target.value || undefined })
          }
          className={control}
          placeholder="| Am | Dm | E7 | Am |"
          aria-label="Chart"
        />
        {chart.typed && chart.typed.bad.length > 0 ? (
          <span className="text-xs text-amber-300">
            Not chords: {chart.typed.bad.join(', ')}
          </span>
        ) : (
          isTyped && (
            <span className="text-xs text-white/45">
              In {pcName(chart.key.tonic, chart.flats)} {chart.key.mode}
            </span>
          )
        )}
      </label>
    </>
  );
};
