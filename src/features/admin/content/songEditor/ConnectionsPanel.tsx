import { Plus, Trash2 } from 'lucide-react';
import { type FC, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminRoutes } from '@/constants/routes';
import { edgesForSong } from '@/content/graph/deriveEdges';
import { SUBGENRE_PARENT } from '@/content/graph/genreTags';
import { GENRES, SONG_TAG_TO_GENRE } from '@/content/graph/genres';
import { EDGE_LABELS, type Edge } from '@/content/graph/types';
import { SESSION_INSTRUMENTS } from '@/curriculum/data/instruments';
import type {
  Credit,
  CreditRole,
  RecordingSession,
  RelatedRecording,
  Song,
  SongRelease,
} from '@/curriculum/types/songLibrary';
import { useCapabilities } from '@/hooks/data/admin/useCapabilities';
import { CONSOLE_LABEL } from '../../ui/styles';
import { EntityMultiPicker } from '../entities/EntityMultiPicker';
import { EntityPicker } from '../entities/EntityPicker';
import { RefRow, type RefMetaValue } from '../entities/RefRow';
import { useEntityIndex } from '../entities/useEntityIndex';

/**
 * A song's connections: who made it, where, what else it is tied to, and
 * what it is — each a link to a record, not a line of text (design §3.4).
 *
 * The display text stays: the song page still reads "Toto", the credit
 * still reads "Jeff Porcaro". Beside each is the record it means, chosen
 * from the registry (an alias writes its canonical id), so the Atlas graph
 * links them instead of guessing from the name. A name with no record can be
 * created on the spot.
 *
 * The fields are schema v1 — the lead act, each credit's artist, a related
 * recording's artist and song — and, once the server validates song v2
 * (`songSchemaLevel` 2), the rest: the session's studio, label and city by
 * id beside their text, the records the song appears on, subgenres, and a
 * source on every credit, session and related recording. Below v2 those stay
 * hidden behind a note, since a v1 server refuses them; a song that
 * already holds some is offered a way to remove them, or its save would fail
 * on fields no one can see. Picking a studio, label or city fills its text
 * from the record's name while the text is the record's own: empty, or the
 * name of the record it was linked to before (design C20), so picking again
 * keeps the page and the link in step. Text someone wrote is never
 * overwritten, and clearing the link leaves the text, which the graph then
 * reads as a guess again. Below, the connections this draft states, as the
 * graph derives them, with guesses marked.
 *
 * Each part carries a `data-field` anchor naming the body paths it edits,
 * so the Table's row panel, which shows this panel in a song's Details, can
 * scroll to the one a cell or a refused save names.
 */

const ROLES: { value: CreditRole; label: string }[] = [
  { value: 'performer', label: 'Plays' },
  { value: 'vocals', label: 'Vocals' },
  { value: 'songwriter', label: 'Wrote' },
  { value: 'producer', label: 'Produced' },
  { value: 'engineer', label: 'Engineered' },
  { value: 'arranger', label: 'Arranged' },
  { value: 'conductor', label: 'Conducted' },
];

const RELATIONS: RelatedRecording['relation'][] = [
  'original',
  'cover',
  'sample',
  'interpolation',
  'collaboration',
];

const INSTRUMENTS_BY_SECTION = SESSION_INSTRUMENTS.reduce<
  Record<string, typeof SESSION_INSTRUMENTS>
>((acc, i) => {
  acc[i.section] = [...(acc[i.section] ?? []), i];
  return acc;
}, {});

/** The genres the song filter and the page's label read (genreTags). */
const TAUGHT = Object.keys(SONG_TAG_TO_GENRE);
const GENRE_NAME = new Map(GENRES.map((g) => [g.id, g.name]));

const inputClass =
  'min-w-0 rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-sm text-white/85 focus:border-white/40 focus:outline-none';

/**
 * One text field and the record it names, kept together when the row wraps.
 * `field` names the body paths it edits: its `data-field` anchor.
 */
const Pair: FC<{ children: React.ReactNode; field: string }> = ({
  children,
  field,
}) => (
  <span data-field={field} className="flex flex-wrap items-center gap-1.5">
    {children}
  </span>
);

/** The flags a RefRow edits, as a patch: `source` only where the level has it. */
const metaPatch = (meta: RefMetaValue, v2: boolean): RefMetaValue => ({
  unverified: meta.unverified,
  ...(v2 ? { source: meta.source } : {}),
});

/** The kinds a session links, for their names (a stable list for the hook). */
const SESSION_KINDS = ['studio', 'label', 'place'] as const;

const Heading: FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className={CONSOLE_LABEL}>{children}</span>
);

const AddButton: FC<{ onClick: () => void; children: React.ReactNode }> = ({
  onClick,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center gap-1 self-start rounded-full border border-dashed border-white/15 px-2.5 py-1 text-xs text-white/45 transition-colors hover:border-white/30 hover:bg-white/[0.04] hover:text-white/80"
  >
    <Plus size={12} /> {children}
  </button>
);

const RemoveButton: FC<{ onClick: () => void; title: string }> = ({
  onClick,
  title,
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-label={title}
    className="shrink-0 rounded p-1 text-white/25 transition-colors hover:bg-white/5 hover:text-white/70"
  >
    <Trash2 size={13} />
  </button>
);

/** Session keys song v2 adds (`session.source` rides with the flags). */
const SESSION_V2_KEYS = ['studioId', 'labelId', 'placeId', 'source'] as const;

/**
 * The song v2 fields a song holds, by name: what a server below v2 refuses.
 * Empty when there are none.
 */
export function v2FieldsIn(song: Song): string[] {
  const found: string[] = [];
  if (song.releases?.length) found.push('the records it appears on');
  if (song.subgenreIds?.length) found.push('subgenres');
  if (SESSION_V2_KEYS.some((key) => song.session?.[key] !== undefined))
    found.push('the session’s record links or source');
  if (song.credits?.some((c) => c.source !== undefined))
    found.push('credit sources');
  if (song.relatedRecordings?.some((r) => r.source !== undefined))
    found.push('recording sources');
  return found;
}

/** The song without its v2 fields, as a patch: the v1 body it was. */
export function withoutV2Fields(song: Song): Partial<Song> {
  const patch: Partial<Song> = { releases: undefined, subgenreIds: undefined };
  if (song.session) {
    const session = { ...song.session };
    for (const key of SESSION_V2_KEYS) delete session[key];
    patch.session = Object.keys(session).length ? session : undefined;
  }
  if (song.credits) {
    patch.credits = song.credits.map(
      ({ source: _source, ...credit }) => credit,
    );
  }
  if (song.relatedRecordings) {
    patch.relatedRecordings = song.relatedRecordings.map(
      ({ source: _source, ...recording }) => recording,
    );
  }
  return patch;
}

/** A track number: a whole number from 1, or nothing. */
const trackOf = (raw: string): number | undefined => {
  const n = Number(raw);
  return raw.trim() && Number.isInteger(n) && n >= 1 ? n : undefined;
};

export const ConnectionsPanel: FC<{
  song: Song;
  onPatch: (p: Partial<Song>) => void;
}> = ({ song, onPatch }) => {
  const caps = useCapabilities();
  const v2 = caps.songSchemaLevel >= 2;
  const credits = song.credits ?? [];
  const related = song.relatedRecordings ?? [];
  const session: RecordingSession = song.session ?? {};
  const origin = song.origin ?? {};
  const releases = song.releases ?? [];
  const subgenres = song.subgenreIds ?? [];
  // A record names its own label, so a song on one takes its label there.
  const onARecord = releases.some((r) => r.releaseId);
  const leftovers = v2 ? [] : v2FieldsIn(song);
  const [releaseNotice, setReleaseNotice] = useState<string | null>(null);
  // The linked records' names, for C20: text that is a record's own name
  // follows the link.
  const { entries: linked } = useEntityIndex(SESSION_KINDS);
  const nameOf = (kind: string, slug: string | undefined) =>
    slug
      ? linked.find((e) => e.kind === kind && e.slug === slug)?.name
      : undefined;

  // The song's other artists, lifted in every artist picker on the page.
  const context = useMemo(
    () =>
      new Set(
        [origin.artistGlobeId, ...credits.map((c) => c.artistGlobeId)]
          .filter(Boolean)
          .map((slug) => `artist:${slug}`),
      ),
    [origin.artistGlobeId, credits],
  );

  const setCredit = (i: number, p: Partial<Credit>) =>
    onPatch({
      credits: credits.map((c, n) => (n === i ? { ...c, ...p } : c)),
    });

  const setSession = (p: Partial<RecordingSession>) => {
    const next = { ...session, ...p };
    // Drop empties so a cleared field doesn't persist as ''.
    for (const k of Object.keys(next) as (keyof RecordingSession)[])
      if (next[k] === '' || next[k] === undefined) delete next[k];
    onPatch({ session: Object.keys(next).length ? next : undefined });
  };

  const setRelated = (i: number, p: Partial<RelatedRecording>) =>
    onPatch({
      relatedRecordings: related.map((r, n) => (n === i ? { ...r, ...p } : r)),
    });

  // A record row is never blank: picking adds one, clearing removes it.
  const setReleases = (next: SongRelease[]) =>
    onPatch({ releases: next.length ? next : undefined });
  const setRelease = (i: number, p: Partial<SongRelease>) =>
    setReleases(releases.map((r, n) => (n === i ? { ...r, ...p } : r)));
  // One row per record: a record listed twice would be two tracks on it.
  const listed = (slug: string, at?: number) =>
    releases.some((r, n) => n !== at && r.releaseId === slug);
  const addRelease = (slug: string | null) => {
    if (!slug) return;
    if (listed(slug)) return setReleaseNotice('That record is listed already.');
    setReleaseNotice(null);
    setReleases([...releases, { releaseId: slug }]);
  };
  const pickRelease = (i: number, slug: string | null) => {
    if (!slug) {
      setReleaseNotice(null);
      return setReleases(releases.filter((_, n) => n !== i));
    }
    if (listed(slug, i))
      return setReleaseNotice('That record is listed already.');
    setReleaseNotice(null);
    setRelease(i, { releaseId: slug });
  };

  /**
   * A session id, and its text from the record's name while the text is the
   * record's own: empty, or the name of the record linked before. Clearing
   * the link leaves the text.
   */
  const linkSession = (
    idKey: 'studioId' | 'labelId' | 'placeId',
    textKey: 'studio' | 'label' | 'city',
    kind: 'studio' | 'label' | 'place',
    slug: string | null,
    name?: string,
  ) => {
    const text = session[textKey]?.trim();
    const before = nameOf(kind, session[idKey]);
    const follows = !text || (before !== undefined && text === before.trim());
    setSession({
      [idKey]: slug ?? undefined,
      ...(slug && name && follows ? { [textKey]: name } : {}),
    });
  };

  // Subgenres under the song's own genres come first in the picker.
  const subgenreContext = useMemo(() => {
    const genres = new Set(
      song.genreTags.map((tag) => SONG_TAG_TO_GENRE[tag]).filter(Boolean),
    );
    return new Set(
      Object.entries(SUBGENRE_PARENT)
        .filter(([, parent]) => genres.has(parent))
        .map(([slug]) => `subgenre:${slug}`),
    );
  }, [song.genreTags]);

  const setLeadAct = (slug: string | null) => {
    const next = { ...origin };
    if (slug) next.artistGlobeId = slug;
    else delete next.artistGlobeId;
    onPatch({ origin: Object.keys(next).length ? next : undefined });
  };

  const toggleGenre = (tag: string) => {
    const tags = song.genreTags;
    onPatch({
      genreTags: tags.includes(tag)
        ? tags.filter((t) => t !== tag)
        : [...tags, tag],
    });
  };
  const offList = song.genreTags.filter((t) => !TAUGHT.includes(t));

  return (
    <section className="flex flex-col gap-6 border-t border-white/[0.08] pt-5">
      {/* ── Who it is by ── */}
      <div
        data-field="origin origin.artistGlobeId"
        className="flex flex-col gap-2"
      >
        <Heading>Artist</Heading>
        <div className="flex flex-wrap items-center gap-2 text-sm text-white/60">
          <span className="text-white/85">{song.artist || 'No artist'}</span>
          <span aria-hidden>→</span>
          <EntityPicker
            kind="artist"
            aria-label="Lead act's record"
            value={origin.artistGlobeId}
            suggestion={song.artist}
            onChange={setLeadAct}
            context={context}
            allowCreate
          />
        </div>
      </div>

      {/* ── Credits ── */}
      <div data-field="credits composer" className="flex flex-col gap-2">
        <Heading>Credits</Heading>
        {credits.map((credit, i) => (
          <RefRow
            key={i}
            trailing={
              <RemoveButton
                title={`Remove ${credit.name || 'credit'}`}
                onClick={() =>
                  onPatch({ credits: credits.filter((_, n) => n !== i) })
                }
              />
            }
            meta={{ unverified: credit.unverified, source: credit.source }}
            onMeta={(meta) => setCredit(i, metaPatch(meta, v2))}
            showSource={v2}
          >
            <input
              aria-label="Credited as"
              value={credit.name}
              onChange={(e) => setCredit(i, { name: e.target.value })}
              placeholder="Name, or an ensemble"
              className={`${inputClass} w-44`}
            />
            <EntityPicker
              kind="artist"
              aria-label={`${credit.name || 'Credit'}'s record`}
              value={credit.artistGlobeId}
              suggestion={credit.name}
              context={context}
              allowCreate
              onChange={(slug, entry) =>
                setCredit(i, {
                  artistGlobeId: slug ?? undefined,
                  // A credit picked before it was typed takes the name.
                  ...(!credit.name && entry ? { name: entry.name } : {}),
                })
              }
            />
            <select
              aria-label="Role"
              value={credit.role}
              onChange={(e) =>
                setCredit(i, {
                  role: e.target.value as CreditRole,
                  // Only a performer carries an instrument.
                  instrument:
                    e.target.value === 'performer'
                      ? credit.instrument
                      : undefined,
                })
              }
              className={inputClass}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            {credit.role === 'performer' && (
              <select
                aria-label="Instrument"
                value={credit.instrument ?? ''}
                onChange={(e) =>
                  setCredit(i, { instrument: e.target.value || undefined })
                }
                className={inputClass}
              >
                <option value="">— instrument —</option>
                {Object.entries(INSTRUMENTS_BY_SECTION).map(
                  ([section, list]) => (
                    <optgroup key={section} label={section}>
                      {list.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.name}
                        </option>
                      ))}
                    </optgroup>
                  ),
                )}
              </select>
            )}
            <label
              className="flex items-center gap-1 text-xs text-white/45"
              title="Billed on the label, not a sideman"
            >
              <input
                type="checkbox"
                className="accent-white"
                checked={!!credit.primary}
                onChange={(e) =>
                  setCredit(i, { primary: e.target.checked || undefined })
                }
              />
              Billed
            </label>
            <label
              className="flex items-center gap-1 text-xs text-white/45"
              title="A group rather than one person"
            >
              <input
                type="checkbox"
                className="accent-white"
                checked={!!credit.ensemble}
                onChange={(e) =>
                  setCredit(i, { ensemble: e.target.checked || undefined })
                }
              />
              Group
            </label>
          </RefRow>
        ))}
        <AddButton
          onClick={() =>
            onPatch({ credits: [...credits, { name: '', role: 'performer' }] })
          }
        >
          Add a credit
        </AddButton>
      </div>

      {/* ── Where it was made ── */}
      <div data-field="session" className="flex flex-col gap-2">
        <Heading>Recording</Heading>
        <RefRow
          meta={{ unverified: session.unverified, source: session.source }}
          onMeta={(meta) => setSession(metaPatch(meta, v2))}
          showSource={v2}
        >
          <Pair field="session.studio session.studioId">
            <input
              aria-label="Studio"
              value={session.studio ?? ''}
              onChange={(e) => setSession({ studio: e.target.value })}
              placeholder="Studio"
              className={inputClass}
            />
            {v2 && (
              <EntityPicker
                kind="studio"
                aria-label="Studio's record"
                value={session.studioId}
                suggestion={session.studio}
                allowCreate
                onChange={(slug, entry) =>
                  linkSession('studioId', 'studio', 'studio', slug, entry?.name)
                }
              />
            )}
          </Pair>
          <Pair field="session.city session.country session.placeId">
            <input
              aria-label="City"
              value={session.city ?? ''}
              onChange={(e) => setSession({ city: e.target.value })}
              placeholder="City"
              className={inputClass}
            />
            <input
              aria-label="Country"
              value={session.country ?? ''}
              onChange={(e) => setSession({ country: e.target.value })}
              placeholder="Country"
              className={inputClass}
            />
            {v2 && (
              <EntityPicker
                kind="place"
                aria-label="Where it was recorded"
                value={session.placeId}
                suggestion={session.city}
                allowCreate
                onChange={(slug, entry) =>
                  linkSession('placeId', 'city', 'place', slug, entry?.name)
                }
                newPlacePin={false}
              />
            )}
          </Pair>
          <Pair field="session.label session.labelId">
            <input
              aria-label="Label"
              value={session.label ?? ''}
              onChange={(e) => setSession({ label: e.target.value })}
              placeholder="Label"
              className={inputClass}
            />
            {v2 && (
              <EntityPicker
                kind="label"
                aria-label="Label's record"
                value={session.labelId}
                suggestion={session.label}
                allowCreate
                onChange={(slug, entry) =>
                  linkSession('labelId', 'label', 'label', slug, entry?.name)
                }
              />
            )}
          </Pair>
          <input
            aria-label="Recorded"
            data-field="session.recordedYear"
            type="number"
            value={session.recordedYear ?? ''}
            onChange={(e) =>
              setSession({
                recordedYear: e.target.value
                  ? Number(e.target.value)
                  : undefined,
              })
            }
            placeholder="Recorded"
            title="Recording year, when it differs from the release year"
            className={`${inputClass} w-24`}
          />
        </RefRow>
        {!v2 && (
          <p className="text-xs text-white/40">
            Linking the studio, label and city to their records, and the records
            this song appears on, comes with song schema v2.
          </p>
        )}
        {leftovers.length > 0 && (
          <div
            role="status"
            className="flex flex-wrap items-center gap-2 text-xs text-amber-300/80"
          >
            <span>
              This song holds song schema v2 fields this server refuses (
              {leftovers.join(', ')}), so saving it will fail until they are
              removed.
            </span>
            <button
              type="button"
              onClick={() => onPatch(withoutV2Fields(song))}
              className="underline underline-offset-2 hover:text-amber-200"
            >
              Remove the v2 fields
            </button>
          </div>
        )}
        {v2 && onARecord && (
          <p className="text-xs text-white/40">
            On a record, the song's label is the record's: the label record here
            is not read. Set the label on the record instead.
          </p>
        )}
      </div>

      {/* ── The records it is on (song v2) ── */}
      {v2 && (
        <div data-field="releases" className="flex flex-col gap-2">
          <Heading>Appears on</Heading>
          {releases.map((release, i) => (
            <RefRow
              key={`${release.releaseId}|${i}`}
              trailing={
                <RemoveButton
                  title={`Remove ${release.releaseId || 'record'}`}
                  onClick={() =>
                    setReleases(releases.filter((_, n) => n !== i))
                  }
                />
              }
              meta={{ unverified: release.unverified, source: release.source }}
              onMeta={(meta) => setRelease(i, metaPatch(meta, v2))}
            >
              <EntityPicker
                kind="release"
                aria-label={`Record ${i + 1}`}
                value={release.releaseId}
                allowCreate
                onChange={(slug) => pickRelease(i, slug)}
              />
              <input
                aria-label={`Track on record ${i + 1}`}
                type="number"
                min={1}
                step={1}
                value={release.track ?? ''}
                onChange={(e) =>
                  setRelease(i, { track: trackOf(e.target.value) })
                }
                placeholder="Track"
                className={`${inputClass} w-20`}
              />
            </RefRow>
          ))}
          <EntityPicker
            kind="release"
            aria-label="Add a record"
            placeholder="Add a record…"
            value={null}
            allowCreate
            onChange={addRelease}
            className="self-start"
          />
          <div role="status">
            {releaseNotice && (
              <p className="text-xs text-amber-300/80">{releaseNotice}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Other recordings ── */}
      <div data-field="relatedRecordings" className="flex flex-col gap-2">
        <Heading>Also recorded by</Heading>
        {related.map((rel, i) => (
          <RefRow
            key={i}
            trailing={
              <RemoveButton
                title={`Remove ${rel.artist || 'recording'}`}
                onClick={() =>
                  onPatch({
                    relatedRecordings: related.filter((_, n) => n !== i),
                  })
                }
              />
            }
            meta={{ unverified: rel.unverified, source: rel.source }}
            onMeta={(meta) => setRelated(i, metaPatch(meta, v2))}
            showSource={v2}
          >
            <select
              aria-label="Relation"
              value={rel.relation}
              onChange={(e) =>
                setRelated(i, {
                  relation: e.target.value as RelatedRecording['relation'],
                })
              }
              className={inputClass}
            >
              {RELATIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <input
              aria-label="Artist, as credited"
              value={rel.artist}
              onChange={(e) => setRelated(i, { artist: e.target.value })}
              placeholder="Artist"
              className={`${inputClass} w-40`}
            />
            <EntityPicker
              kind="artist"
              aria-label={`${rel.artist || 'Recording'}'s artist record`}
              value={rel.artistGlobeId}
              suggestion={rel.artist}
              allowCreate
              onChange={(slug, entry) =>
                setRelated(i, {
                  artistGlobeId: slug ?? undefined,
                  ...(!rel.artist && entry ? { artist: entry.name } : {}),
                })
              }
            />
            <EntityPicker
              kind="song"
              aria-label="The recording, if charted here"
              placeholder="Charted here?"
              value={rel.songId}
              onChange={(slug) => setRelated(i, { songId: slug ?? undefined })}
            />
            <input
              aria-label="Year"
              type="number"
              value={rel.year ?? ''}
              onChange={(e) =>
                setRelated(i, {
                  year: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              placeholder="Year"
              className={`${inputClass} w-20`}
            />
          </RefRow>
        ))}
        <AddButton
          onClick={() =>
            onPatch({
              relatedRecordings: [
                ...related,
                { artist: '', relation: 'cover' },
              ],
            })
          }
        >
          Add a recording
        </AddButton>
      </div>

      {/* ── What it is ── */}
      <div data-field="genreTags subgenreIds" className="flex flex-col gap-2">
        <Heading>Genres</Heading>
        <div
          role="group"
          aria-label="Genres"
          className="flex flex-wrap gap-1.5"
        >
          {TAUGHT.map((tag) => {
            const on = song.genreTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={on}
                onClick={() => toggleGenre(tag)}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  on
                    ? 'border-white/30 bg-white/10 text-white'
                    : 'border-white/[0.08] text-white/50 hover:text-white/80'
                }`}
              >
                {GENRE_NAME.get(SONG_TAG_TO_GENRE[tag]) ?? tag}
                {on && song.genreTags[0] === tag && (
                  <span className="ml-1 text-white/45">· shown</span>
                )}
              </button>
            );
          })}
        </div>
        {offList.length > 0 && (
          <p className="text-xs text-amber-300/80">
            Not one of the twelve the song filter knows: {offList.join(', ')}.
            {v2
              ? ' Finer genres go under Subgenres.'
              : ' Subgenres get their own field with song schema v2.'}
          </p>
        )}
        {v2 && (
          <EntityMultiPicker
            kind="subgenre"
            aria-label="Subgenres"
            value={subgenres}
            context={subgenreContext}
            onChange={(next) =>
              onPatch({ subgenreIds: next.length ? next : undefined })
            }
          />
        )}
      </div>

      <LiveConnections song={song} />
    </section>
  );
};

/** What this draft states, as the graph derives it — guesses marked. */
const LiveConnections: FC<{ song: Song }> = ({ song }) => {
  const edges = useMemo(() => safeEdges(song), [song]);
  const guessed = edges.filter((e) => e.inferred).length;
  if (!song.id) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <Heading>Connections</Heading>
        <span className="text-xs text-white/45">
          {edges.length} stated
          {guessed ? `, ${guessed} guessed from a name` : ''}
        </span>
        <Link
          to={AdminRoutes.cortex(undefined, { focus: `song:${song.id}` })}
          className="ml-auto text-xs text-white/55 underline-offset-2 hover:text-white hover:underline"
        >
          Open in Cortex
        </Link>
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {edges.map((edge, i) => (
          <li
            key={`${edge.kind}|${edge.to}|${edge.on ?? ''}|${i}`}
            title={edge.via ? `from ${edge.via.path}` : undefined}
            className={`rounded-full border px-2.5 py-1 text-xs ${
              edge.inferred
                ? 'border-dashed border-white/15 text-white/45'
                : 'border-white/[0.12] text-white/80'
            }`}
          >
            <span className="text-white/45">
              {EDGE_LABELS[edge.kind].forward}{' '}
            </span>
            {edge.to.slice(edge.to.indexOf(':') + 1)}
            {edge.inferred && <span className="text-white/35"> (guess)</span>}
          </li>
        ))}
      </ul>
    </div>
  );
};

/** A half-typed draft can hold anything; a bad field must not blank the page. */
function safeEdges(song: Song): Edge[] {
  try {
    return edgesForSong(song);
  } catch {
    return [];
  }
}
