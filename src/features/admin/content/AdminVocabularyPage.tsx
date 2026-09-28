import { useMemo, useState } from 'react';
import {
  IGNORED_GENRE_TAGS,
  INSTRUMENT_TAGS,
  SUBGENRE_PARENT,
  TAG_TO_SUBGENRE,
  UNPLACED_GENRE_TAGS,
} from '@/content/graph/genreTags';
import { GENRES } from '@/content/graph/genres';
import {
  INSTRUMENT_SECTIONS,
  SESSION_INSTRUMENTS,
} from '@/curriculum/data/instruments';

/**
 * The Atlas's vocabularies, and what it hasn't placed yet.
 *
 * Read-only on purpose. Genres and instruments are small, slow-moving lists
 * that live in code, where the type checker and the guard tests hold them
 * honest; moving them into editable records to save editing a short list would
 * trade that away for very little. Songs and progressions are content and are
 * edited in the console; these are the vocabulary those editors pick FROM.
 *
 * The page earns its place through the third panel: the tags the globe carries
 * that nothing has placed. That is a worklist, and it is invisible anywhere
 * else.
 */

const Panel: React.FC<{
  title: string;
  count: number;
  hint?: string;
  children: React.ReactNode;
}> = ({ title, count, hint, children }) => (
  <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
    <header className="mb-3 flex items-baseline gap-2">
      <h2 className="font-medium text-white/85">{title}</h2>
      <span className="text-sm text-white/35">{count}</span>
      {hint && <span className="ml-auto text-xs text-white/30">{hint}</span>}
    </header>
    {children}
  </section>
);

const Chip: React.FC<{ children: React.ReactNode; muted?: boolean }> = ({
  children,
  muted,
}) => (
  <span
    className={`rounded-full border px-2 py-0.5 text-xs ${
      muted ? 'border-white/8 text-white/30' : 'border-white/15 text-white/70'
    }`}
  >
    {children}
  </span>
);

export const AdminVocabularyPage = () => {
  const [filter, setFilter] = useState('');

  const subgenresByGenre = useMemo(() => {
    const byGenre = new Map<string, string[]>();
    for (const [tag, sub] of Object.entries(TAG_TO_SUBGENRE)) {
      const parent = SUBGENRE_PARENT[sub];
      if (!parent) continue;
      byGenre.set(parent, [...(byGenre.get(parent) ?? []), tag]);
    }
    for (const list of byGenre.values()) list.sort();
    return byGenre;
  }, []);

  const q = filter.trim().toLowerCase();
  const match = (s: string) => !q || s.toLowerCase().includes(q);

  const unplaced = UNPLACED_GENRE_TAGS.filter(match);
  const instrumentTags = INSTRUMENT_TAGS.filter(match);
  const ignored = IGNORED_GENRE_TAGS.filter(match);

  return (
    <div className="flex flex-col gap-5 p-6">
      <header className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-lg font-medium text-white/90">Vocabulary</h1>
        <p className="text-sm text-white/40">
          What the Atlas can say, and what it hasn&rsquo;t placed yet. Edited in
          code — songs and progressions pick from these.
        </p>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter…"
          className="ml-auto min-w-0 rounded border border-white/10 bg-white/5 px-2 py-1 text-sm text-white/85 focus:border-white/30 focus:outline-none"
        />
      </header>

      {/* ── The unplaced queue: the reason this page exists ── */}
      <Panel
        title="Unplaced genre tags"
        count={unplaced.length}
        hint="Each resolves to “unknown” until someone places it"
      >
        {unplaced.length === 0 ? (
          <p className="text-sm text-white/35">Nothing matches.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {unplaced.map((t) => (
              <Chip key={t} muted>
                {t}
              </Chip>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-white/30">
          Mostly one globe event each. Guessing would put Armenian duduk music
          in the wrong hemisphere, so they stay unplaced until someone decides.
        </p>
      </Panel>

      {/* ── Genres ── */}
      <Panel
        title="Genres"
        count={GENRES.length}
        hint={`${Object.keys(SUBGENRE_PARENT).length} subgenres beneath them`}
      >
        <div className="flex flex-col gap-3">
          {GENRES.filter(
            (g) =>
              match(g.name) || (subgenresByGenre.get(g.id) ?? []).some(match),
          ).map((g) => {
            const subs = (subgenresByGenre.get(g.id) ?? []).filter(match);
            return (
              <div key={g.id}>
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm text-white/80">{g.name}</span>
                  <code className="text-xs text-white/25">genre:{g.id}</code>
                  {!g.taught && (
                    <span
                      className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white/35"
                      title={
                        g.note ??
                        'On the globe, but not a lesson family or a charted genre'
                      }
                    >
                      not taught
                    </span>
                  )}
                  <span className="text-xs text-white/25">
                    {subs.length || ''}
                  </span>
                </div>
                {subs.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {subs.slice(0, 40).map((t) => (
                      <Chip key={t}>{t}</Chip>
                    ))}
                    {subs.length > 40 && (
                      <span className="self-center text-xs text-white/25">
                        +{subs.length - 40} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      {/* ── Instruments ── */}
      <Panel
        title="Instruments"
        count={SESSION_INSTRUMENTS.length}
        hint="What a credit can name"
      >
        <div className="flex flex-col gap-3">
          {INSTRUMENT_SECTIONS.map(({ section, blurb }) => {
            const list = SESSION_INSTRUMENTS.filter(
              (i) => i.section === section && match(i.name),
            );
            if (!list.length) return null;
            return (
              <div key={section}>
                <div className="mb-1 flex items-baseline gap-2">
                  <span className="text-sm capitalize text-white/80">
                    {section}
                  </span>
                  <span className="text-xs text-white/30">{blurb}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {list.map((i) => (
                    <Chip key={i.id}>
                      {i.name}
                      {i.worldInstrumentId && (
                        <span
                          className="ml-1 text-[#7ecfcf]"
                          title="Also in Instruments of the World on the globe"
                        >
                          ◆
                        </span>
                      )}
                    </Chip>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* ── Things that aren't genres ── */}
      <Panel
        title="Tags that aren’t genres"
        count={instrumentTags.length + ignored.length}
        hint="Kept out of genre space deliberately"
      >
        <div className="flex flex-col gap-3">
          <div>
            <p className="mb-1 text-xs text-white/40">
              Instruments wearing a genre tag — these belong on the instrument
              graph, where they say more.
            </p>
            <div className="flex flex-wrap gap-1">
              {instrumentTags.map((t) => (
                <Chip key={t} muted>
                  {t}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs text-white/40">
              Reach or format, not music. Every event using one also carries a
              real tag, so nothing is lost by ignoring them.
            </p>
            <div className="flex flex-wrap gap-1">
              {ignored.map((t) => (
                <Chip key={t} muted>
                  {t}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
};
