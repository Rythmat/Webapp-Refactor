import { artistSlug, normalizeArtistName, toSlug } from '@/content/graph/slugs';
import type { CreditRole } from '@/curriculum/types/songLibrary';
import { MEMBERSHIP_ATTRIBUTES, mapInstrument } from './instrumentMap';
import type { MbArtistCredit } from './musicbrainz';
import {
  MB_RECORDING,
  MB_RELEASE,
  MB_WORK,
  type MbRecordingFull,
  type MbReleaseFull,
  type MbSongRelation,
  type MbWork,
} from './songSources';

/**
 * Who made a recording, as `song.credits[]` entries (design §5.2: Composers,
 * Producer, Credits).
 *
 * | MusicBrainz relationship                         | Credit                            |
 * |--------------------------------------------------|-----------------------------------|
 * | work: composer, lyricist, writer, librettist     | songwriter                        |
 * | recording: producer (not executive or assistant) | producer                          |
 * | release: producer (the album's, weaker)          | producer                          |
 * | recording: engineer, recording, mix, audio, sound | engineer (mix counts as engineer) |
 * | recording: instrument (with the instrument)      | performer + `instrument`          |
 * | recording: vocal — lead or unspecified           | vocals                            |
 * |            background or choir                   | performer, backing vocals         |
 * | recording: performer, performing orchestra       | performer (an orchestra: ensemble) |
 * | recording: arranger, orchestrator, …             | arranger                          |
 * | recording: conductor, chorus master              | conductor                         |
 * | the recording's artist credit, when it bills two or more | vocals (if they sang lead) or performer, `primary` |
 *
 * Mastering, programming, remixing, editing and executive production are not
 * credits here. The display name is always the artist's MusicBrainz name
 * (C20), so one person reads the same on every song.
 *
 * **Who gets a record (C30).** A credit links to one of our artists when the
 * MusicBrainz id is the one F1 found for them. Otherwise only billed
 * performers, members of the song's own group, songwriters and producers get
 * an artist record made for them (created unverified, with their MBID); the
 * rest stay a name, with their MusicBrainz page in `source`.
 *
 * Pure: the lookups are parameters.
 */

/** Where a credit was stated: the recording's own relationships are the strongest. */
export type CreditLevel = 'recording' | 'work' | 'release' | 'billing';

export interface CreditOffer {
  mbid: string;
  /** The artist's MusicBrainz name: the display name (C20). */
  name: string;
  disambiguation?: string;
  role: CreditRole;
  /** A SESSION_INSTRUMENTS id (performer only). */
  instrument?: string;
  /**
   * What the source calls the instruments that map to none of ours: the
   * credit is written without one, so the owner is shown which they were.
   * A person's several ("cymbal", "electronic drum set") are one credit.
   */
  instrumentNames?: string[];
  ensemble?: boolean;
  primary?: boolean;
  level: CreditLevel;
  /** The relationship, as MusicBrainz names it ('producer', 'instrument', 'artist credit'). */
  relation: string;
  /** The page stating it. */
  url: string;
}

/** Relationship types → roles, per level. */
const RECORDING_ROLES: Record<string, CreditRole> = {
  producer: 'producer',
  engineer: 'engineer',
  recording: 'engineer',
  mix: 'engineer',
  audio: 'engineer',
  sound: 'engineer',
  balance: 'engineer',
  instrument: 'performer',
  performer: 'performer',
  'performing orchestra': 'performer',
  vocal: 'vocals',
  arranger: 'arranger',
  'instrument arranger': 'arranger',
  'vocal arranger': 'arranger',
  orchestrator: 'arranger',
  conductor: 'conductor',
  'chorus master': 'conductor',
};
const WORK_ROLES: Record<string, CreditRole> = {
  composer: 'songwriter',
  lyricist: 'songwriter',
  writer: 'songwriter',
  librettist: 'songwriter',
};
const RELEASE_ROLES: Record<string, CreditRole> = { producer: 'producer' };

/** Attributes that make a producer or engineer credit not the one the owner means. */
const SKIPPED_ATTRIBUTES: ReadonlySet<string> = new Set([
  'executive',
  'assistant',
  'associate',
]);

/** Vocal attributes that are backing vocals, a performer's part. */
const BACKING_VOCALS = /\b(background|backing|choir)\b/i;

/**
 * Names MusicBrainz gives instruments that our session vocabulary names
 * otherwise, beyond the artist half's aliases (`instrumentMap.ts`, left as
 * it is so the artist rows don't move).
 */
const CREDIT_INSTRUMENTS: Record<string, string> = {
  strings: 'string-section',
  'string section': 'string-section',
  'string ensemble': 'string-section',
  brass: 'horn-section',
  'horn section': 'horn-section',
  horns: 'horn-section',
  'hand clapping': 'handclaps',
  clapping: 'handclaps',
  'electric bass': 'electric-bass',
  'fender bass': 'electric-bass',
  'drum machine': 'drum-machine',
  minimoog: 'synthesizer',
  moog: 'synthesizer',
  'analog synthesizer': 'synthesizer',
  'synth bass': 'synth-bass',
  'hammond b3': 'hammond-organ',
  'hammond organ': 'hammond-organ',
  'lap steel guitar': 'slide-guitar',
  'slide guitar': 'slide-guitar',
  'fender rhodes': 'fender-rhodes',
  'rhodes piano': 'fender-rhodes',
  'electric piano': 'electric-piano',
  'acoustic guitar': 'acoustic-guitar',
  '12 string guitar': 'acoustic-guitar',
  'lead vocals': 'lead-vocals',
  'background vocals': 'backing-vocals',
};

/** The session instrument a MusicBrainz instrument name means, or null. */
export const mapCreditInstrument = (name: string): string | null =>
  CREDIT_INSTRUMENTS[normalizeArtistName(name)] ?? mapInstrument(name);

export const isEnsembleType = (type: string | null | undefined): boolean =>
  !!type && ['Group', 'Orchestra', 'Choir'].includes(type);

export interface CreditReport {
  /** Relationship types that are no credit of ours, e.g. 'recording: mastering'. */
  roles: string[];
  /** Instruments that map to none of ours ('guitar'): the credit is kept, without one. */
  instruments: string[];
}

function fromRelation(
  relation: MbSongRelation,
  level: 'recording' | 'work' | 'release',
  url: string,
  report: CreditReport,
): CreditOffer[] {
  const artist = relation.artist;
  if (!artist || relation['target-type'] === 'url') return [];
  const table =
    level === 'recording'
      ? RECORDING_ROLES
      : level === 'work'
        ? WORK_ROLES
        : RELEASE_ROLES;
  const role = Object.prototype.hasOwnProperty.call(table, relation.type)
    ? table[relation.type]
    : undefined;
  if (!role) {
    report.roles.push(`${level}: ${relation.type}`);
    return [];
  }
  const attributes = relation.attributes ?? [];
  if (
    (role === 'producer' || role === 'engineer') &&
    attributes.some((a) => SKIPPED_ATTRIBUTES.has(a))
  ) {
    report.roles.push(
      `${level}: ${relation.type} (${attributes.filter((a) => SKIPPED_ATTRIBUTES.has(a)).join(', ')})`,
    );
    return [];
  }
  const base = {
    mbid: artist.id,
    name: artist.name,
    ...(artist.disambiguation ? { disambiguation: artist.disambiguation } : {}),
    level,
    relation: relation.type,
    url,
    ...(isEnsembleType(artist.type) || relation.type === 'performing orchestra'
      ? { ensemble: true }
      : {}),
  };

  if (relation.type === 'vocal') {
    const backing = attributes.some((a) => BACKING_VOCALS.test(a));
    return [
      backing
        ? { ...base, role: 'performer', instrument: 'backing-vocals' }
        : { ...base, role: 'vocals' },
    ];
  }
  if (relation.type === 'instrument') {
    const names = attributes.filter((a) => !MEMBERSHIP_ATTRIBUTES.has(a));
    if (!names.length) return [{ ...base, role: 'performer' }];
    return names.map((name) => {
      const id = mapCreditInstrument(name);
      if (!id) report.instruments.push(name);
      return id
        ? { ...base, role: 'performer' as const, instrument: id }
        : { ...base, role: 'performer' as const, instrumentNames: [name] };
    });
  }
  return [{ ...base, role }];
}

/** A credit's identity in the list: role (and a performer's instrument) and who. */
export const creditKey = (
  offer: Pick<CreditOffer, 'role' | 'instrument' | 'name'>,
) =>
  `${offer.role === 'performer' ? `performer:${offer.instrument ?? ''}` : offer.role}|${artistSlug(offer.name)}`;

/** Which statement speaks for a credit stated twice: the recording's own first. */
const LEVEL_RANK: Record<CreditLevel, number> = {
  recording: 0,
  billing: 1,
  work: 2,
  release: 3,
};

const ROLE_ORDER: readonly CreditRole[] = [
  'vocals',
  'performer',
  'songwriter',
  'producer',
  'arranger',
  'conductor',
  'engineer',
];

export interface CreditInput {
  recording: MbRecordingFull;
  /** The works the recording performs (usually one). */
  works: readonly MbWork[];
  /** The album's release, for its producers; null when there is none. */
  release: MbReleaseFull | null;
}

/**
 * Every credit the lookups state, one per person and role (and instrument):
 * the recording's own word first, then the work's, then the album's.
 */
export function creditOffers({ recording, works, release }: CreditInput): {
  offers: CreditOffer[];
  report: CreditReport;
} {
  const report: CreditReport = { roles: [], instruments: [] };
  const recordingUrl = `${MB_RECORDING}${recording.id}`;
  const all: CreditOffer[] = [];

  for (const relation of recording.relations ?? [])
    if (relation.artist)
      all.push(...fromRelation(relation, 'recording', recordingUrl, report));

  // A duet, a feature: everyone the label billed is a credit of the record.
  const billed: MbArtistCredit[] = recording['artist-credit'] ?? [];
  if (billed.length > 1) {
    const leadSingers = new Set(
      all.filter((o) => o.role === 'vocals').map((o) => o.mbid),
    );
    for (const { artist } of billed) {
      const type = (artist as { type?: string | null }).type;
      all.push({
        mbid: artist.id,
        name: artist.name,
        ...(artist.disambiguation
          ? { disambiguation: artist.disambiguation }
          : {}),
        role: leadSingers.has(artist.id) ? 'vocals' : 'performer',
        primary: true,
        ...(isEnsembleType(type) ? { ensemble: true } : {}),
        level: 'billing',
        relation: 'artist credit',
        url: recordingUrl,
      });
    }
  }

  for (const work of works)
    for (const relation of work.relations ?? [])
      if (relation.artist)
        all.push(
          ...fromRelation(relation, 'work', `${MB_WORK}${work.id}`, report),
        );

  // The album's producer stands in only for a recording that names none.
  if (release && !all.some((o) => o.role === 'producer'))
    for (const relation of release.relations ?? [])
      if (relation.artist)
        all.push(
          ...fromRelation(
            relation,
            'release',
            `${MB_RELEASE}${release.id}`,
            report,
          ),
        );

  const byKey = new Map<string, CreditOffer>();
  for (const offer of all) {
    const key = creditKey(offer);
    const seen = byKey.get(key);
    if (!seen) {
      byKey.set(key, offer);
      continue;
    }
    // One credit: the strongest level speaks; billing marks it primary;
    // every unmapped instrument it was stated with is kept, never dropped.
    const [keep, other] =
      LEVEL_RANK[offer.level] < LEVEL_RANK[seen.level]
        ? [offer, seen]
        : [seen, offer];
    const names = [
      ...new Set([
        ...(keep.instrumentNames ?? []),
        ...(other.instrumentNames ?? []),
      ]),
    ].sort();
    byKey.set(key, {
      ...keep,
      ...(keep.primary || other.primary ? { primary: true } : {}),
      ...(keep.ensemble || other.ensemble ? { ensemble: true } : {}),
      ...(names.length ? { instrumentNames: names } : {}),
    });
  }
  const offers = [...byKey.values()].sort(
    (a, b) =>
      ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) ||
      creditKey(a).localeCompare(creditKey(b)),
  );
  return { offers, report };
}

/**
 * The works a recording performs that are our song: those with its title, or
 * the only one. A medley's several works, none named like the song, are
 * nobody's composers here.
 */
export function songWorks(
  recording: MbRecordingFull,
  titleKeyOf: (title: string) => string,
  wanted: string,
): { ids: string[]; reason?: string } {
  const works = (recording.relations ?? [])
    .filter((r) => r.type === 'performance' && r.work)
    .map((r) => r.work!);
  const unique = [...new Map(works.map((w) => [w.id, w])).values()];
  if (!unique.length) return { ids: [], reason: 'the recording links no work' };
  const named = unique.filter((w) => titleKeyOf(w.title) === wanted);
  if (named.length) return { ids: named.map((w) => w.id).sort() };
  if (unique.length === 1) return { ids: [unique[0].id] };
  return {
    ids: [],
    reason: `the recording performs ${unique.length} works, none titled like the song`,
  };
}

// ── C30 and C33: who gets a record, and under which slug ────────────────

/** Gets an artist record made when not one of ours (C30). */
export const makesRecord = (
  offer: Pick<CreditOffer, 'primary' | 'role' | 'mbid'>,
  groupMembers: ReadonlySet<string>,
): boolean =>
  !!offer.primary ||
  offer.role === 'songwriter' ||
  offer.role === 'producer' ||
  groupMembers.has(offer.mbid);

/** A person a credit needs created. */
export interface PersonToCreate {
  mbid: string;
  name: string;
  disambiguation?: string;
  ensemble: boolean;
}

/** One of our registry artists, and whether its MusicBrainz identity is settled. */
export interface RegistrySlot {
  slug: string;
  /** The MusicBrainz id F1 picked (sure or likely); null when none is settled. */
  mbid: string | null;
}

export type PersonSlug =
  | { kind: 'slug'; slug: string; disambiguated: boolean }
  /**
   * Our artist of that name has no settled identity: it may be this very
   * person, so nothing is created (C33 "stop for review") — the credit keeps
   * the name, and the owner links it by hand.
   */
  | { kind: 'blocked'; registrySlug: string };

/**
 * Slugs for the people to create, from the whole set at once so no slug
 * depends on the order they were met (C33):
 *  - a namesake of one of our artists whose identity is not settled is
 *    blocked: it may be them;
 *  - a person an earlier emit gave a slug (`known`, the committed
 *    `record-slugs.json`) keeps it, so a namesake met later never renames
 *    them — unless the registry has since taken it;
 *  - else `artistSlug(name)` when nobody else — ours, created, or known —
 *    has it;
 *  - a namesake of one of our settled artists, or of another person
 *    (two Bill Evanses), takes `-<disambiguation>` ('bill-evans-saxophonist'),
 *    or `-<first 8 of its MBID>` when MusicBrainz gives none or that is
 *    taken too.
 */
export function assignPersonSlugs(
  people: readonly PersonToCreate[],
  registry: readonly RegistrySlot[],
  known: Readonly<Record<string, string>> = {},
): Map<string, PersonSlug> {
  const ours = new Map(registry.map((r) => [r.slug, r]));
  const out = new Map<string, PersonSlug>();
  const byBase = new Map<string, PersonToCreate[]>();
  const kept = new Map<string, string>();
  for (const person of [...people].sort((a, b) =>
    a.mbid.localeCompare(b.mbid),
  )) {
    const base = artistSlug(person.name);
    const registered = ours.get(base);
    if (registered && !registered.mbid) {
      out.set(person.mbid, { kind: 'blocked', registrySlug: base });
      continue;
    }
    const slug = Object.prototype.hasOwnProperty.call(known, person.mbid)
      ? known[person.mbid]
      : undefined;
    if (slug && !ours.has(slug)) {
      kept.set(person.mbid, slug);
      out.set(person.mbid, {
        kind: 'slug',
        slug,
        disambiguated: slug !== base,
      });
      continue;
    }
    byBase.set(base, [...(byBase.get(base) ?? []), person]);
  }
  // Every slug in use: ours, and every one an earlier emit handed out.
  const taken = new Set([
    ...registry.map((r) => r.slug),
    ...Object.values(known),
    ...kept.values(),
  ]);
  const pending: [PersonToCreate, string][] = [];
  for (const [base, group] of byBase) {
    if (!taken.has(base) && group.length === 1) {
      out.set(group[0].mbid, {
        kind: 'slug',
        slug: base,
        disambiguated: false,
      });
      taken.add(base);
      continue;
    }
    for (const person of group) pending.push([person, base]);
  }
  // Disambiguated: by MusicBrainz's own words when they are unique, else by id.
  const wanted = new Map<string, string>();
  const count = new Map<string, number>();
  for (const [person, base] of pending) {
    const words = person.disambiguation ? toSlug(person.disambiguation) : '';
    const slug = words
      ? `${base}-${words}`
      : `${base}-${person.mbid.slice(0, 8)}`;
    wanted.set(person.mbid, slug);
    count.set(slug, (count.get(slug) ?? 0) + 1);
  }
  for (const [person, base] of pending) {
    let slug = wanted.get(person.mbid)!;
    if ((count.get(slug) ?? 0) > 1 || taken.has(slug))
      slug = `${base}-${person.mbid.slice(0, 8)}`;
    taken.add(slug);
    out.set(person.mbid, { kind: 'slug', slug, disambiguated: true });
  }
  return out;
}

/**
 * What a credit reads as, for the owner: 'Electric Bass: James Jamerson'.
 * An instrument of MusicBrainz's that we have no id for is written as a
 * plain performer credit, and the line says so: 'Performer (guitar, not
 * in our list): Robert White'.
 */
export function creditDisplay(
  offer: Pick<CreditOffer, 'role' | 'name' | 'instrumentNames' | 'primary'>,
  instrumentName: string | null,
): string {
  const unmapped = offer.instrumentNames?.length
    ? `Performer (${offer.instrumentNames.join(', ')}, not in our list)`
    : null;
  const role =
    offer.role === 'performer'
      ? (instrumentName ?? unmapped ?? 'Performer')
      : ROLE_WORDS[offer.role];
  return `${role}${offer.primary ? ' (billed)' : ''}: ${offer.name}`;
}

const ROLE_WORDS: Record<CreditRole, string> = {
  performer: 'Performer',
  vocals: 'Vocals',
  producer: 'Producer',
  engineer: 'Engineer',
  arranger: 'Arranger',
  conductor: 'Conductor',
  songwriter: 'Songwriter',
};
