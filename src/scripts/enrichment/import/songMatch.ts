import { artistSlug } from '@/content/graph/slugs';
import {
  isAlternateTake,
  nameKey,
  type RegistryArtist,
  titleKey,
} from './cacheStage';
import type { MbArtistCredit, MbRelation } from './musicbrainz';
import type { MbSearchRecording, MbSearchRelease } from './songSources';

/**
 * Which recording a library song is, and which album it came out on
 * (design §5.2, F2). Pure: the song, our artists' MusicBrainz identities
 * (F1) and the recordings a search found are parameters.
 *
 * **The lead act.** The song's billing names the act ("Marvin Gaye"), or
 * several ("Kenny Loggins / Nathan East", "Rihanna, Kanye West and Paul
 * McCartney"). The whole billing is tried first — "Sly and the Family
 * Stone" is one act — then its first part, split at the strongest
 * separator first. The act must have a sure or likely MusicBrainz identity:
 * every song suggestion rests on it.
 *
 * **The recording.** Of the recordings credited to that act (by id, never
 * by name) — or to a band named after it that it was a member of ("Chuck
 * Brown & The Soul Searchers", `actBands`) — with the song's title (accents,
 * case, punctuation, "&"/"and" and a trailing "(Remastered 2009)", "- Single
 * Version" or "[feat. X]" folded), the earliest dated one that is the
 * record itself: never a live take, a remix, a demo, a karaoke or
 * instrumental version, an acoustic re-do, another mix, edit or version
 * ("Dolby Atmos mix", "extended jam", "film version", a DJ-mix's copy), a
 * later remaster, re-recording or "1975 version", a video, or a recording
 * found only on live albums. Same year, the one on the most official
 * releases (the canonical take, not an edit issued once).
 *
 * **Ambiguous** means the recordings say more than one thing about which
 * one our song is — then no field is suggested for it:
 *  - our year (typed by hand, not copied from MusicBrainz) is two or more
 *    years from the earliest take, and another take matches it: the
 *    library may chart the later one;
 *  - the take on the act's own record is two or more years later than one
 *    found only on compilations: it may be a re-recording, and the
 *    original's own record is missing from the answer — unless our year,
 *    typed by hand, is the later take's;
 *  - no take is within a year of ours, and the one chosen is on
 *    compilations only, or from three or more years after ours: nothing
 *    says it is the record we chart;
 *  - found by name only (no id for the act), and the name is credited to
 *    two different MusicBrainz artists.
 *
 * **The album** is the earliest official release group of primary type
 * Album — plain, or a soundtrack (Purple Rain) — that carries the recording
 * and is credited to the act and nobody the recording doesn't credit: never
 * a compilation, a live album, a remix album, or a Various Artists set.
 */

/** One of our artists and the MusicBrainz artist F1 found it is. */
export interface ArtistPick {
  slug: string;
  name: string;
  mbid: string;
  tier: 'sure' | 'likely';
  confidence: number;
  /** The id of the `externalIds.mbid` suggestion every song suggestion rests on. */
  identityId: string;
  /** Other ids MusicBrainz answered with this artist (merged since). */
  askedAs?: readonly string[];
  /** The act's country, when known: which of a same-day pair of releases is the home one. */
  countryCode?: string | null;
  /**
   * Bands named after the act that it was a member of ("Chuck Brown & The
   * Soul Searchers"): its records under that name are its own (`actBands`).
   */
  bands?: readonly ActBand[];
}

/** A band an act recorded under, named after it. */
export interface ActBand {
  id: string;
  name: string;
  /**
   * The name reads as the act's own backing band ("& The Soul Searchers",
   * "and His Orchestra", "Trio"): its records are the act's, surely. Else
   * ("Johnny Cash & June Carter Cash", "Rick Astley & Blossoms") the group
   * may be a partnership, and a record of it only likely the one we chart.
   */
  backing: boolean;
}

/** Every MusicBrainz id the act's records may be credited to: its own first. */
export const actIds = (
  pick: Pick<ArtistPick, 'mbid' | 'askedAs' | 'bands'>,
): string[] => [
  ...new Set([
    pick.mbid,
    ...(pick.askedAs ?? []),
    ...(pick.bands ?? []).map((b) => b.id),
  ]),
];

/** Words that join the act to the rest of a band's name. */
const JOINS = /^(?:and|with|featuring|feat|vs|x)\s+/;

/** The rest of a band's name when it is the act's backing band. */
const BACKING =
  /^(the|his|her|their) |\b(band|trio|quartet|quintet|sextet|septet|octet|nonet|orchestra|group|combo|movement|experiment|all stars|allstars|regiment|system|ensemble|four|five|six|seven|eight|nine)$/;

/**
 * The bands an act recorded under that are named after it: from the act's
 * own lookup, the bands it was a member of whose name begins with the act's
 * name and goes on ("Chuck Brown & The Soul Searchers", "The Muddy Waters
 * Band", "Nat King Cole Trio") — never a duo or a joint group with another
 * of our artists ("Waylon Jennings & Willie Nelson", "Dizzy Gillespie – Stan
 * Getz Sextet"), whose records are theirs as much as the act's, nor a band
 * the act merely joined ("Ike & Tina Turner", "Team Usher").
 */
export function actBands(
  artist: { name: string; relations?: readonly MbRelation[] } | null,
  ourName: string,
  isOurs: (name: string) => boolean,
): ActBand[] {
  if (!artist) return [];
  const heads = [...new Set([nameKey(ourName), nameKey(artist.name)])].filter(
    Boolean,
  );
  const out = new Map<string, ActBand>();
  for (const relation of artist.relations ?? []) {
    const band = relation.artist;
    if (
      relation.type !== 'member of band' ||
      relation.direction !== 'forward' ||
      !band?.id
    )
      continue;
    const key = nameKey(band.name);
    const head = heads.find((h) => key.startsWith(`${h} `));
    if (!head) continue;
    // What follows the act's name, less the joining word: "the soul
    // searchers", "willie nelson", "stan getz sextet".
    const rest = key.slice(head.length + 1).replace(JOINS, '');
    const words = rest.split(' ').filter(Boolean);
    const another = words.some((_, n) =>
      isOurs(words.slice(0, n + 1).join(' ')),
    );
    if (!another)
      out.set(band.id, {
        id: band.id,
        name: band.name,
        backing: BACKING.test(rest),
      });
  }
  return [...out.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export interface LeadAct extends ArtistPick {
  /** The part of the billing it was found by, when the billing names several. */
  billedAs?: string;
}

export type LeadResolution =
  | { kind: 'pick'; lead: LeadAct }
  /** A registry artist without a sure or likely identity, or none at all. */
  | { kind: 'none'; name: string; slug: string | null; reason: string };

/**
 * Separators, strongest first: "X / Y" is this library's "X, with Y on
 * bass"; a comma lists several acts; "feat." and "with" add a guest; "and"
 * and "&" are last because they are also inside names ("Hall & Oates").
 */
const SEPARATORS: readonly RegExp[] = [
  /\s*\/\s*/,
  /\s*,\s*/,
  /\s+(?:feat\.?|ft\.?|featuring|with|x|vs\.?)\s+/i,
  /\s+(?:and|&)\s+/i,
];

/** The billing, then its first part at each separator in turn. */
export function billingNames(artist: string): string[] {
  const names = [artist.trim()];
  let rest = artist.trim();
  for (const separator of SEPARATORS) {
    const [first] = rest.split(separator);
    if (first && first !== rest) {
      names.push(first.trim());
      rest = first.trim();
    }
  }
  return [...new Set(names.filter(Boolean))];
}

/** Our artists by slug and by the slugs of their aliases. */
export function registryIndex(
  registry: readonly RegistryArtist[],
): Map<string, RegistryArtist> {
  const bySlug = new Map<string, RegistryArtist>();
  for (const artist of registry) bySlug.set(artist.slug, artist);
  for (const artist of registry)
    for (const alias of artist.aliases ?? []) {
      const slug = artistSlug(alias);
      if (!bySlug.has(slug)) bySlug.set(slug, artist);
    }
  return bySlug;
}

export function leadActOf(
  billing: string,
  registry: ReadonlyMap<string, RegistryArtist>,
  picks: ReadonlyMap<string, ArtistPick>,
): LeadResolution {
  const names = billingNames(billing);
  let first: RegistryArtist | null = null;
  for (const name of names) {
    const artist = registry.get(artistSlug(name));
    if (!artist) continue;
    first ??= artist;
    const pick = picks.get(artist.slug);
    if (pick)
      return {
        kind: 'pick',
        lead: {
          ...pick,
          ...(name !== billing.trim() ? { billedAs: name } : {}),
        },
      };
  }
  return {
    kind: 'none',
    name: first?.name ?? names[names.length - 1],
    slug: first?.slug ?? null,
    reason: first
      ? `${first.slug} has no sure or likely MusicBrainz identity`
      : 'no artist of ours is billed',
  };
}

// ── Recordings ───────────────────────────────────────────────────────────

/**
 * Remasters and re-recordings: a later pressing or a new take, never the
 * record. MusicBrainz hyphenates with U+2010 as often as with "-".
 */
const LATER_TAKE =
  /\b(remaster(ed)?|re[-\u2010]?record(ed|ing)?|re[-\u2010]?make|new version|taylor.?s version)\b/i;

/** "(1975 version)": a later version only when an earlier take is in the answer. */
const VERSION_YEAR = /\b((?:19|20)\d\d) version\b/i;

/** Mixes that are the record: its mono and stereo, its album and single mixes. */
const THE_RECORDS_MIX =
  /\b(original|mono|stereo|album|single|studio|lp|radio|7["″]?|45)\s+mix\b/i;
/** Edits that are the record: the radio or single edit, a clean one. */
const THE_RECORDS_EDIT =
  /\b(radio|single|7["″]?|album|clean|lp|short|promo|us|uk)\s+edit\b/i;
/** Versions that are the record. */
const THE_RECORDS_VERSION =
  /\b(single|album|lp|mono|stereo|original|radio|clean|explicit|dirty|full|length|us|uk|45|7["″]?)\s+version\b/i;

/**
 * Takes that are another cut of the song, which MusicBrainz tells apart
 * only in a note or a subtitle: a new mix (Dolby Atmos, 5.1, "2018 stereo
 * mix", a club mix), an edit by someone, an extended or dub version, a jam,
 * a film version, a DJ-mix's copy, a session, an outtake. The artist half's
 * `isAlternateTake` (live, remix, demo, karaoke, instrumental, acoustic) is
 * left as it is, so its rows don't move.
 */
const ANOTHER_CUT: readonly RegExp[] = [
  // A DJ-mix's copy, a megamix, a mixtape.
  /\bdj[\s\-\u2010]?mix|\bmix[\s\-\u2010]?tape|\bmega[\s\-\u2010]?mixx?\b|\b(hot|ulti|down)mix\b/i,
  // A new mix for another format.
  /\b(dolby|atmos|surround|binaural|quad(raphonic)?|360 reality|[45]\.[01])\b/i,
  // A new stereo or mono mix made years on ("2018 stereo mix"), a 12\u2033.
  /\b(19|20)\d\d\s+(stereo|mono)\s+mix\b|\b12["\u2033]/i,
  /\b(dub|extended|jam|mash[\s\-\u2010]?up|bootleg|nightcore|lo[\s\-\u2010]?fi|commentary|sing[\s\-\u2010]?a[\s\-\u2010]?long|reprise|redux|revision|megamix|medley|lullaby|outtakes?|alternate|alternative|unreleased|no rap|without|(film|movie) version|music video|sessions?|take \d+)\b/i,
];

function isAnotherCut(text: string): boolean {
  if (!text) return false;
  if (ANOTHER_CUT.some((pattern) => pattern.test(text))) return true;
  if (/\bmix\b/i.test(text) && !THE_RECORDS_MIX.test(text)) return true;
  // A bare "edit" is the single's; a named one is someone's re-edit.
  if (
    /\bedit\b/i.test(text) &&
    !THE_RECORDS_EDIT.test(text) &&
    text.trim().toLowerCase() !== 'edit'
  )
    return true;
  return (
    /\b[a-z]+\s+version\b/i.test(text) &&
    !THE_RECORDS_VERSION.test(text) &&
    !LATER_TAKE.test(text)
  );
}

/** Every trailing "(…)", "[…]" and " - …" of a title. */
const TRAILING_PARTS = /(\s*(\([^()]*\)|\[[^[\]]*\]|\s[-–—]\s[^-–—]*))+$/;
const partsOf = (title: string) =>
  [...title.matchAll(/\(([^()]*)\)|\[([^[\]]*)\]|\s[-–—]\s(.*)$/g)].map(
    (m) => m[1] ?? m[2] ?? m[3] ?? '',
  );

export const creditIds = (
  credit: readonly MbArtistCredit[] | undefined,
): string[] => (credit ?? []).map((c) => c.artist.id);

/** Every one of its releases is a live album: a live take whatever its title says. */
export function isLiveOnly(recording: MbSearchRecording): boolean {
  const releases = recording.releases ?? [];
  return (
    releases.length > 0 &&
    releases.every((r) =>
      (r['release-group']?.['secondary-types'] ?? []).includes('Live'),
    )
  );
}

/** Who a recording must be credited to: our act's ids, or (found by name) its names. */
export interface CreditedTo {
  ids?: ReadonlySet<string>;
  names?: ReadonlySet<string>;
}

/** One name of a credit is our act: by id, or (found by name) by name. */
const creditedAs = (
  { artist, name }: MbArtistCredit,
  who: CreditedTo,
): boolean =>
  who.ids
    ? who.ids.has(artist.id)
    : !!who.names &&
      [artist.name, name].some((n) => who.names!.has(nameKey(n)));

const credits = (recording: MbSearchRecording, who: CreditedTo): boolean =>
  (recording['artist-credit'] ?? []).some((c) => creditedAs(c, who));

const yearOf = (date: string | null | undefined): number | null => {
  const match = /^(\d{4})/.exec(date ?? '');
  return match ? Number(match[1]) : null;
};

const official = (release: MbSearchRelease) => release.status === 'Official';

/** The kinds of record that first issue a song: an album, a single, an EP. */
const ORIGINAL_TYPES: ReadonlySet<string> = new Set(['Album', 'Single', 'EP']);
/** Secondary types such a record may carry: a soundtrack is still the record (Purple Rain). */
const ORIGINAL_SECONDARY_OK: ReadonlySet<string> = new Set(['Soundtrack']);

/**
 * Why a release is not one of the act's own records carrying the song, or
 * null when it is: official; an album, single or EP, plain or a soundtrack
 * — never a compilation, a live album, a remix or DJ set; credited to our
 * act and to nobody the recording doesn't credit (no Various Artists).
 */
export function whyNotAnOriginal(
  release: MbSearchRelease,
  recording: Pick<MbSearchRecording, 'artist-credit'>,
  who: CreditedTo,
): string | null {
  const group = release['release-group'];
  if (!group) return 'no release group';
  if (release.status !== 'Official') return 'not an official release';
  const primary = group['primary-type'] ?? null;
  if (!primary || !ORIGINAL_TYPES.has(primary))
    return `a ${primary?.toLowerCase() ?? 'untyped'} release`;
  const secondary = group['secondary-types'] ?? [];
  if (secondary.some((type) => !ORIGINAL_SECONDARY_OK.has(type)))
    return `a ${secondary.join('/').toLowerCase()} ${primary.toLowerCase()}`;
  const credit = release['artist-credit'] ?? recording['artist-credit'] ?? [];
  const onRecording = new Set(creditIds(recording['artist-credit']));
  if (!credit.some((c) => creditedAs(c, who)))
    return 'not credited to our artist';
  if (credit.some((c) => !onRecording.has(c.artist.id)))
    return 'credited to someone the recording is not';
  return null;
}

/** A title without its trailing "(…)", "[…]" and " - …" parts, as a key. */
const bareKey = (title: string) => titleKey(title.replace(TRAILING_PARTS, ''));

/**
 * How a recording's title meets ours: `exact` (folded as `titleKey` folds),
 * `loose` when one of the two only adds a subtitle ("Sweet Dreams" and
 * "Sweet Dreams (Are Made of This)"), else null.
 */
export function titleMatch(
  theirs: string,
  ours: string,
): 'exact' | 'loose' | null {
  const a = titleKey(theirs);
  const b = titleKey(ours);
  if (a === b) return 'exact';
  const bareA = bareKey(theirs);
  const bareB = bareKey(ours);
  return [bareA === b, a === bareB, bareA === bareB && bareA !== a].some(
    Boolean,
  ) && Math.min(bareA.length, bareB.length) >= 3
    ? 'loose'
    : null;
}

/**
 * The notes a recording is told apart by: its disambiguation, and the
 * subtitles of its title that ours doesn't have ("(Dub)" is a note on
 * "Rock Lobster", not on a song called "Rock Lobster (Dub)").
 */
function notesOf(recording: MbSearchRecording, title: string): string[] {
  const ours = new Set(partsOf(title).map((p) => p.trim().toLowerCase()));
  return [
    recording.disambiguation ?? '',
    ...partsOf(recording.title).filter(
      (part) => !ours.has(part.trim().toLowerCase()),
    ),
  ].filter(Boolean);
}

/** The year of a "(1975 version)" note, when it has one. */
function versionYearOf(
  recording: MbSearchRecording,
  title: string,
): number | undefined {
  for (const note of notesOf(recording, title)) {
    const match = VERSION_YEAR.exec(note);
    if (match) return Number(match[1]);
  }
  return undefined;
}

/** Why a recording is not a take of our song, or null when it is one. */
export function whyNotTheSong(
  recording: MbSearchRecording,
  title: string,
  who: CreditedTo,
): string | null {
  // "Let's Get It On (Live)" is our song, as a take we pass over.
  if (!titleMatch(recording.title, title)) return 'another title';
  if (!credits(recording, who)) return 'not credited to our artist';
  if (recording.video) return 'a video';
  const notes = notesOf(recording, title);
  if (isAlternateTake(recording))
    return 'a live, remixed, demo, karaoke, instrumental or acoustic take';
  if (notes.some((note) => LATER_TAKE.test(note)))
    return 'a remaster or re-recording';
  if (notes.some((note) => isAnotherCut(note.replace(VERSION_YEAR, ''))))
    return 'another mix, edit or version';
  if (isLiveOnly(recording)) return 'only on live albums';
  if (!yearOf(recording['first-release-date'])) return 'no release date';
  return null;
}

export interface Take {
  recording: MbSearchRecording;
  date: string;
  year: number;
  officialReleases: number;
  /**
   * The act's own records carrying it (`whyNotAnOriginal`). A take found only
   * on compilations and re-issues may be a later re-recording — or credited
   * to a later name of the act — never the record that first came out.
   */
  originals: MbSearchRelease[];
  /** Titled like our song only with a subtitle added or dropped. */
  loose: boolean;
}

export interface Examined {
  /** The takes the recording is chosen from: exact titles, where there are any. */
  takes: Take[];
  /**
   * Takes titled only loosely ("Do Your Thing (vocal)"), set aside because
   * a take's title meets ours exactly: never the recording chosen, but
   * where the album is looked for all the same — the exact one may be a
   * single edit, and the album take the loose one.
   */
  loose: Take[];
  /** Why each other recording of the answer was passed over, counted. */
  passedOver: Record<string, number>;
}

/** The act's own records first, then the earliest, then the most issued. */
const byTake = (a: Take, b: Take) =>
  Number(b.originals.length > 0) - Number(a.originals.length > 0) ||
  a.year - b.year ||
  b.officialReleases - a.officialReleases ||
  a.date.localeCompare(b.date) ||
  a.recording.id.localeCompare(b.recording.id);

/** The recordings that are our song, earliest (and most issued) first. */
export function takesOf(
  recordings: readonly MbSearchRecording[],
  title: string,
  who: CreditedTo,
): Examined {
  let takes: Take[] = [];
  const versionYears = new Map<Take, number>();
  const passedOver: Record<string, number> = {};
  const pass = (why: string, n = 1) => {
    passedOver[why] = (passedOver[why] ?? 0) + n;
  };
  const seen = new Set<string>();
  for (const recording of recordings) {
    if (seen.has(recording.id)) continue;
    seen.add(recording.id);
    const why = whyNotTheSong(recording, title, who);
    if (why) {
      pass(why);
      continue;
    }
    const date = recording['first-release-date']!;
    const take: Take = {
      recording,
      date,
      year: yearOf(date)!,
      officialReleases: (recording.releases ?? []).filter(official).length,
      originals: (recording.releases ?? []).filter(
        (r) => !whyNotAnOriginal(r, recording, who),
      ),
      loose: titleMatch(recording.title, title) === 'loose',
    };
    takes.push(take);
    const versionYear = versionYearOf(recording, title);
    if (versionYear) versionYears.set(take, versionYear);
  }
  // "(1975 version)" beside a take of 1965 is the later one; alone, it may
  // be how MusicBrainz tells the original from a re-do not in the answer.
  const earliest = Math.min(...takes.map((t) => t.year));
  const later = takes.filter((t) => (versionYears.get(t) ?? 0) > earliest + 1);
  if (later.length) {
    pass('a later version ("1975 version")', later.length);
    takes = takes.filter((t) => !later.includes(t));
  }
  // A title met only loosely is chosen only where none is met exactly.
  const exact = takes.filter((t) => !t.loose);
  const chosenFrom = exact.length ? exact : takes;
  const loose = exact.length ? takes.filter((t) => t.loose) : [];
  if (loose.length) pass('titled with another subtitle', loose.length);
  // The act's own records first: a compilation-only take is a re-issue,
  // however early MusicBrainz dates it.
  return {
    takes: chosenFrom.sort(byTake),
    loose: loose.sort(byTake),
    passedOver,
  };
}

/** The song as the matcher reads it. */
export interface SongFacts {
  id: string;
  title: string;
  artist: string;
  year?: number;
  /** `enrichSongYears.mjs` copied the year from MusicBrainz: its agreeing proves nothing. */
  yearFromMusicBrainz: boolean;
}

export type MatchTier = 'sure' | 'likely';

export type SongMatch =
  | {
      status: 'matched';
      tier: MatchTier;
      confidence: number;
      take: Take;
      /** Takes of the song credited to the act (the chosen one first). */
      takes: number;
      /**
       * Every take counted, the chosen one first, and the takes titled only
       * loosely beside them: where the album is looked for.
       */
      all: Take[];
      /** Why it is this recording, in words the owner reads. */
      reasons: string[];
      /** Why it is only likely, when it is. */
      notes: string[];
    }
  | { status: 'ambiguous'; reasons: string[] }
  | { status: 'none'; reasons: string[] };

/** The most confidence a likely match can carry: just under sure. */
export const LIKELY_CAP = 0.84;
/** Found by name, not id: its year is worth a look, never more. */
export const BY_NAME_CONFIDENCE = 0.6;

const describePassed = (passed: Record<string, number>) =>
  Object.entries(passed)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([why, n]) => `${n} ${why}`)
    .join('; ');

const round2 = (n: number) => Math.round(n * 100) / 100;

/** A search cut short: MusicBrainz had more recordings than were read. */
export interface CutOff {
  count: number;
  read: number;
}

/**
 * Match a song to its recording. `lead` is our act with its MusicBrainz id;
 * without one (`byName`), the recordings were found by the billed name and
 * only the year may be read from the match. `cutOff` says the search was
 * read only in part: the original may be in the part never read.
 */
export function matchSong(
  song: SongFacts,
  recordings: readonly MbSearchRecording[],
  who: { lead: LeadAct } | { byName: string },
  { cutOff }: { cutOff?: CutOff | null } = {},
): SongMatch {
  const lead = 'lead' in who ? who.lead : null;
  const credited: CreditedTo = lead
    ? { ids: new Set(actIds(lead)) }
    : { names: new Set([nameKey((who as { byName: string }).byName)]) };
  const { takes, loose, passedOver } = takesOf(
    recordings,
    song.title,
    credited,
  );
  const passed = describePassed(passedOver);
  if (!takes.length)
    return {
      status: 'none',
      reasons: [
        `no studio recording titled "${song.title}" credited to ${lead ? lead.name : (who as { byName: string }).byName}` +
          (passed ? ` (passed over: ${passed})` : ''),
        ...(cutOff ? [cutOffNote(cutOff)] : []),
      ],
    };

  const [take] = takes;
  const band = lead ? bandOf(take, lead) : null;
  const reasons = [
    `recording "${take.recording.title}" (${take.date}) credited to ${lead ? `${band ? band.name : lead.name}, by id` : 'the billed name'}`,
  ];
  if (band?.backing)
    reasons.push(
      `${band.name} is ${lead!.name}'s band, named after them (MusicBrainz: member of band)`,
    );
  if (takes.length > 1)
    reasons.push(`the earliest of ${takes.length} studio takes`);
  const notes: string[] = [];
  if (!take.originals.length)
    notes.push(
      'found only on compilations and re-issues: it may be a later re-recording',
    );
  if (take.loose) notes.push(`titled "${take.recording.title}" on MusicBrainz`);
  if (band && !band.backing)
    notes.push(
      `credited to ${band.name}, a group ${lead!.name} was in: it may be theirs as much as the act's`,
    );
  if (cutOff) notes.push(cutOffNote(cutOff));

  if (!lead) {
    const acts = new Set(
      takes.flatMap((t) =>
        (t.recording['artist-credit'] ?? [])
          .filter((c) => credited.names!.has(nameKey(c.artist.name)))
          .map((c) => c.artist.id),
      ),
    );
    if (acts.size > 1)
      return {
        status: 'ambiguous',
        reasons: [
          `"${(who as { byName: string }).byName}" is credited to ${acts.size} different MusicBrainz artists on this title`,
        ],
      };
    notes.push('found by the billed name, not a MusicBrainz id');
  }

  const ambiguous = (why: string): SongMatch => ({
    status: 'ambiguous',
    reasons: [...reasons, why],
  });
  const handTyped = song.year !== undefined && !song.yearFromMusicBrainz;
  const near = (t: Take) =>
    song.year !== undefined && Math.abs(t.year - song.year) <= 1;

  // The take on the act's own record came out years after one found only
  // on compilations: a re-recording (a "1975 version"), or the original's
  // record credited to a name MusicBrainz keeps apart. Unless our year,
  // typed by hand, says it is the later one we chart.
  const earlier = takes
    .filter((t) => t.year < take.year - 1)
    .sort((a, b) => a.year - b.year || byTake(a, b))[0];
  if (take.originals.length && earlier && !(handTyped && near(take)))
    return ambiguous(
      `an earlier take ("${earlier.recording.title}", ${earlier.date}) is found only on compilations; ` +
        `this one (${take.date}), on the act's own record, may be a re-recording`,
    );

  if (song.year !== undefined) {
    const off = Math.abs(take.year - song.year);
    if (off > 1 && handTyped) {
      const later = takes.find((t) => t !== take && near(t));
      if (later)
        return ambiguous(
          `our year ${song.year} matches a later take ("${later.recording.title}", ${later.date}), not the earliest (${take.date})`,
        );
    }
    // Nothing the act recorded is from our year, and what was found is on
    // compilations only: nothing says it is the record we chart.
    if (off > 1 && !take.originals.length && !takes.some(near))
      return ambiguous(
        `our year ${song.year}: no take of the act's is from within a year of it, ` +
          `and the one found (${take.date}) is on compilations only`,
      );
    // Years later than ours, and nothing from our year: a re-recording, a
    // reissue or a live single — the record we chart is not in the answer.
    // (Years earlier is our year being a reissue's or a chart run's.)
    if (take.year - song.year > 2 && !takes.some(near))
      return ambiguous(
        `our year ${song.year}: the earliest take of the act's MusicBrainz lists is from ${take.year}, ` +
          'and none is from within a year of ours',
      );
    if (off > 1)
      notes.push(`our year ${song.year} and MusicBrainz's ${take.year} differ`);
    else if (!song.yearFromMusicBrainz)
      reasons.push(`its year agrees with ours (${song.year})`);
  }

  if (lead) {
    const [first] = take.recording['artist-credit'] ?? [];
    if (first && !credited.ids!.has(first.artist.id))
      notes.push(`${lead.name} is not the first artist credited`);
    if (lead.tier !== 'sure')
      notes.push(`${lead.name}'s MusicBrainz identity is only likely`);
  }

  const base = lead ? lead.confidence : BY_NAME_CONFIDENCE;
  const tier: MatchTier = notes.length ? 'likely' : 'sure';
  return {
    status: 'matched',
    tier,
    confidence: round2(tier === 'sure' ? base : Math.min(base, LIKELY_CAP)),
    take,
    takes: takes.length,
    all: [take, ...[...takes.slice(1), ...loose].sort(byTake)],
    reasons,
    notes,
  };
}

const cutOffNote = ({ count, read }: CutOff) =>
  `MusicBrainz has ${count} recordings of this title by the act and only the first ${read} were read: the original may be among the rest`;

/** The band a take is credited to instead of the act, when it is. */
function bandOf(take: Take, lead: LeadAct): ActBand | null {
  const own = new Set([lead.mbid, ...(lead.askedAs ?? [])]);
  const credit = take.recording['artist-credit'] ?? [];
  if (credit.some((c) => own.has(c.artist.id))) return null;
  return (
    (lead.bands ?? []).find((b) => credit.some((c) => c.artist.id === b.id)) ??
    null
  );
}

// ── The album ────────────────────────────────────────────────────────────

export interface AlbumRelease {
  id: string;
  title: string;
  date?: string;
  country?: string | null;
  /** The recording's track number there, when it is a plain number. */
  track?: number;
}

export interface AlbumChoice {
  groupId: string;
  title: string;
  format: 'album' | 'soundtrack';
  /** The earliest date among its releases that carry the recording. */
  date?: string;
  /** The billed artists of the album, as its releases credit them. */
  credit: MbArtistCredit[];
  /** Its official releases carrying the recording, earliest first. */
  releases: AlbumRelease[];
}

const byDate = (a?: string, b?: string) =>
  (a ?? '9999').localeCompare(b ?? '9999');

/** Why a release is not the song's album, or null when it could be: an original that is an album. */
export function whyNotTheAlbum(
  release: MbSearchRelease,
  recording: Pick<MbSearchRecording, 'artist-credit'>,
  leadIds: ReadonlySet<string>,
): string | null {
  return (
    whyNotAnOriginal(release, recording, { ids: leadIds }) ??
    (release['release-group']?.['primary-type'] === 'Album'
      ? null
      : 'not an album')
  );
}

const trackOn = (release: MbSearchRelease): number | undefined => {
  const number = release.media?.[0]?.track?.[0]?.number;
  return number && /^\d+$/.test(number) ? Number(number) : undefined;
};

/**
 * The song's album: the earliest release group that passes
 * `whyNotTheAlbum`, over every studio take of the song — the single edit
 * matched may be on a 2019 deluxe edition only, while the album take is on
 * the 1982 original — with its releases that carry one of them.
 */
export function chooseAlbum(
  takes: readonly MbSearchRecording[],
  leadIds: ReadonlySet<string>,
): AlbumChoice | null {
  const groups = new Map<string, AlbumChoice>();
  for (const recording of takes)
    for (const release of recording.releases ?? []) {
      if (whyNotTheAlbum(release, recording, leadIds)) continue;
      const group = release['release-group']!;
      const choice = groups.get(group.id) ?? {
        groupId: group.id,
        title: group.title,
        format: (group['secondary-types'] ?? []).includes('Soundtrack')
          ? ('soundtrack' as const)
          : ('album' as const),
        credit: release['artist-credit'] ?? recording['artist-credit'] ?? [],
        releases: [],
      };
      groups.set(group.id, choice);
      if (choice.releases.some((r) => r.id === release.id)) continue;
      const track = trackOn(release);
      choice.releases.push({
        id: release.id,
        title: release.title,
        ...(release.date ? { date: release.date } : {}),
        country: release.country ?? null,
        ...(track !== undefined ? { track } : {}),
      });
      if (release.date && byDate(release.date, choice.date) < 0)
        choice.date = release.date;
    }
  const ordered = [...groups.values()].sort(
    (a, b) =>
      byDate(a.date, b.date) ||
      a.title.localeCompare(b.title) ||
      a.groupId.localeCompare(b.groupId),
  );
  const [album] = ordered;
  if (!album) return null;
  album.releases.sort(
    (a, b) => byDate(a.date, b.date) || a.id.localeCompare(b.id),
  );
  return album;
}

/** The year of the earliest dated release, when one is dated. */
export const firstYearOf = (
  releases: readonly Pick<AlbumRelease, 'date'>[],
): number | undefined => {
  const years = releases
    .map((r) => yearOf(r.date))
    .filter((y): y is number => y !== null);
  return years.length ? Math.min(...years) : undefined;
};

/**
 * The release an album's label is read from: one issued in the album's
 * first year (`firstYear`, else the earliest year among them) — the home
 * country's first, then any other country's, a worldwide (digital) one
 * last; then an undated one; a later reissue only when there is nothing
 * else. `firstIssue` says whether it came out in that first year: a
 * reissue's label and catalog number are not the record's.
 */
export function chooseRelease(
  releases: readonly AlbumRelease[],
  countryCode?: string | null,
  firstYear: number | undefined = firstYearOf(releases),
): (AlbumRelease & { firstIssue: boolean }) | null {
  const when = (r: AlbumRelease) => {
    const year = yearOf(r.date);
    if (year === null) return 1;
    return firstYear === undefined || year <= firstYear ? 0 : 2;
  };
  const where = (r: AlbumRelease) =>
    countryCode && r.country === countryCode ? 0 : r.country === 'XW' ? 2 : 1;
  const [chosen] = [...releases].sort(
    (a, b) =>
      when(a) - when(b) ||
      where(a) - where(b) ||
      byDate(a.date, b.date) ||
      a.id.localeCompare(b.id),
  );
  return chosen ? { ...chosen, firstIssue: when(chosen) === 0 } : null;
}

// ── The year ─────────────────────────────────────────────────────────────

export interface FirstRelease {
  year: number;
  date: string;
  title: string;
  /** Album, Single or EP — its release group's primary type. */
  type: string | null;
  /** MusicBrainz's own first-release date for the recording agrees on the year. */
  agrees: boolean;
}

/**
 * When the song first came out: the earliest dated of the act's own records
 * carrying it (an official album, single or EP — a compilation, a promotion
 * or a bootleg is not when a song came out), set beside the recording's own
 * first-release date, which counts every release. Null when no such record
 * is dated: then there is no year to offer.
 */
export function firstRelease(take: Take): FirstRelease | null {
  const dated = take.originals
    .filter((r) => yearOf(r.date) !== null)
    .sort((a, b) => byDate(a.date, b.date) || a.id.localeCompare(b.id));
  const [first] = dated;
  if (!first) return null;
  const year = yearOf(first.date)!;
  return {
    year,
    date: first.date!,
    title: first.title,
    type: first['release-group']?.['primary-type'] ?? null,
    agrees: year === take.year,
  };
}
