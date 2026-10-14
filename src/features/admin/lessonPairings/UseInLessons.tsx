/**
 * "Use in lessons" (ledger D-084, D-087): pairs the open drum groove, bass
 * line or chord comping pattern with lesson styles — a genre · level · style
 * group of steps, not one step at a time. A pairing wins over the steps' own
 * parts, and covers that level's Practice Track too. Each style holds one of
 * each kind, so picking a style that's taken replaces what was there.
 *
 * Pairings are repo files (src/curriculum/data/lessonPairings/), written by
 * the dev server like grooves and lines; commit them to ship.
 */

import { X } from 'lucide-react';
import { useEffect, useMemo, useState, type FC } from 'react';
import {
  LESSON_STYLES,
  lessonStyleLabel,
  type LessonStyle,
} from '@/curriculum/data/lessonStyles';
import { listBassLines } from '@/curriculum/engine/bassLines/registry';
import { listCompings } from '@/curriculum/engine/chordComping/registry';
import {
  listDesignedGrooves,
  loadStudioGrooves,
} from '@/curriculum/engine/drumGrooves/registry';
import {
  getPairing,
  rememberPairing,
  stylesUsing,
  type LessonPairing,
  type PairingKind,
} from '@/curriculum/engine/lessonPairings/registry';
import { CAN_WRITE_FILES } from '../drumGrooves/devFiles';
import { CONSOLE_LABEL } from '../ui/styles';

const control =
  'rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-[#60a5fa]';

async function writePairing(pairing: LessonPairing) {
  const empty = !pairing.drums && !pairing.bass && !pairing.comping;
  const res = await fetch(`/__dev/lesson-pairings/${pairing.id}`, {
    method: empty ? 'DELETE' : 'PUT',
    // The writer's transport check wants every write marked JSON, deletes too.
    headers: { 'Content-Type': 'application/json' },
    body: empty ? undefined : JSON.stringify(pairing),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `${res.status} ${res.statusText}`);
  }
  rememberPairing(pairing);
}

/** Names for whatever a style is paired with now, to say what a pick replaces. */
function useItemNames(kind: PairingKind): Map<string, string> {
  const [names, setNames] = useState<Map<string, string>>(() =>
    kind === 'bass'
      ? new Map(listBassLines().map((l) => [l.id, l.name]))
      : kind === 'comping'
        ? new Map(listCompings().map((c) => [c.id, c.name]))
        : new Map(listDesignedGrooves().map((g) => [g.id, g.name])),
  );
  useEffect(() => {
    if (kind !== 'drums') return;
    let alive = true;
    void loadStudioGrooves().then((studio) => {
      if (!alive) return;
      setNames((prev) => {
        const next = new Map(prev);
        studio.forEach((g) => next.set(g.id, g.name));
        return next;
      });
    });
    return () => {
      alive = false;
    };
  }, [kind]);
  return names;
}

const GENRES = [...new Set(LESSON_STYLES.map((s) => s.genreName))];

export const UseInLessons: FC<{
  kind: PairingKind;
  itemId: string;
  /** Only a published item reaches students. */
  live: boolean;
}> = ({ kind, itemId, live }) => {
  const names = useItemNames(kind);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // `version` re-reads the registry after a write.
  const using = useMemo(
    () => stylesUsing(kind, itemId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kind, itemId, version],
  );
  const occupant = (style: LessonStyle) => {
    const id = getPairing(style.id)?.[kind];
    return id && id !== itemId ? (names.get(id) ?? id) : null;
  };

  const change = async (style: LessonStyle, pair: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const prev = getPairing(style.id) ?? { id: style.id };
      await writePairing({ ...prev, [kind]: pair ? itemId : undefined });
      setVersion((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const noun =
    kind === 'drums' ? 'groove' : kind === 'bass' ? 'line' : 'pattern';
  return (
    <div className="flex min-w-64 flex-1 flex-col gap-1">
      <span className={CONSOLE_LABEL}>Use in lessons</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {using.map((style) => (
          <span
            key={style.id}
            className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 py-0.5 pl-2.5 pr-1 text-xs"
          >
            {lessonStyleLabel(style)}
            {CAN_WRITE_FILES && (
              <button
                type="button"
                aria-label={`Stop using in ${lessonStyleLabel(style)}`}
                className="rounded-full p-0.5 text-white/50 hover:text-white disabled:opacity-40"
                disabled={busy}
                onClick={() => void change(style, false)}
              >
                <X className="size-3" />
              </button>
            )}
          </span>
        ))}
        {CAN_WRITE_FILES ? (
          <select
            className={control}
            value=""
            disabled={busy}
            aria-label={`Use this ${noun} in a lesson style`}
            onChange={(e) => {
              const style = LESSON_STYLES.find((s) => s.id === e.target.value);
              if (style) void change(style, true);
            }}
          >
            <option value="">+ Add a lesson style…</option>
            {GENRES.map((genre) => (
              <optgroup key={genre} label={genre}>
                {LESSON_STYLES.filter(
                  (s) => s.genreName === genre && !using.includes(s),
                ).map((s) => {
                  const now = occupant(s);
                  return (
                    <option key={s.id} value={s.id}>
                      {`L${s.level} · ${s.name}${now ? ` — replaces ${now}` : ''}`}
                    </option>
                  );
                })}
              </optgroup>
            ))}
          </select>
        ) : (
          !using.length && (
            <span className="text-xs text-white/40">
              Not used in lessons. Pairing works on the local dev server.
            </span>
          )
        )}
      </div>
      {using.length > 0 && !live && (
        <span className="text-xs text-amber-300/80">
          Draft: students hear this {noun} once it&apos;s published.
        </span>
      )}
      {error && <span className="text-xs text-rose-300">{error}</span>}
    </div>
  );
};
