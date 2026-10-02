import { toSlug } from '@/content/graph/slugs';
import type {
  ArtistRecord,
  LabelRecord,
  ReleaseRecord,
  StudioRecord,
} from '@/content/records/types';
import { suggestionId } from '@/content/suggestions/keys';
import type {
  RequiredRecord,
  Suggestion,
  SuggestionSource,
  SuggestionTier,
} from '@/content/suggestions/types';
import { getInstrument } from '@/curriculum/data/instruments';
import type { Credit } from '@/curriculum/types/songLibrary';
import { CITY_AREA_TYPES, type ResolvedArea } from './areas';
import { MB_ARTIST, WD_ITEM, type WikidataView } from './artistFields';
import type { PlaceArtifact } from './buildSuggestions';
import {
  EXISTING_RECORDS,
  type ExistingKind,
  type ExistingRecord,
  existingRecordFor,
  existingSlugs,
} from './existingRecords';
import {
  createPlaceBook,
  type PlaceBook,
  type PlaceFact,
  type PlaceMatch,
  type PlaceToCreate,
} from './placeMap';
import {
  assignRecordSlugs,
  assignReleaseSlugs,
  emptyLedger,
  mergeLedger,
  type SlugLedger,
} from './recordSlugs';
import {
  assignPersonSlugs,
  type CreditOffer,
  creditDisplay,
  creditOffers,
  isEnsembleType,
  makesRecord,
  type PersonSlug,
  type PersonToCreate,
  type RegistrySlot,
} from './songCredits';
import {
  recordedAt,
  type SongToFetch,
  type SongWalk,
  studiosOf,
} from './songFetch';
import {
  type ArtistPick,
  firstRelease,
  firstYearOf,
  LIKELY_CAP,
  type MatchTier,
} from './songMatch';
import {
  MB_LABEL,
  MB_PLACE,
  MB_RECORDING,
  MB_RELEASE,
  MB_RELEASE_GROUP,
  type MbLabel,
  type MbPlace,
  placeCoordinates,
  releaseLabels,
} from './songSources';
import { coordinatesOf } from './wikidataClaims';

/**
 * From the song walk to suggestion rows and the records they need made
 * (design §5.2, F2; the field map's Album, Label, Studio, Producer,
 * Composers, Credits and Year).
 *
 * | Field     | Suggestion                                                  | Needs made first |
 * |-----------|-------------------------------------------------------------|------------------|
 * | Album     | song `releases[]` + `{releaseId}` (with its track number)   | the release; billed artists not ours |
 * | Label     | release `labelId` (its own row, resting on the album's)     | the label; its town |
 * | Studio    | song `session.studioId`                                      | the studio; its town |
 * | Credits   | song `credits[]` + a credit (Composers: songwriter; Producer) | a person, per C30 |
 * | Year      | song `year`, for the songs whose year is looked for again   | — |
 *
 * Every song row rests on its lead act's identity (`dependsOn` the act's
 * `externalIds.mbid` row) and is no surer than its recording match: a
 * likely match makes only likely rows, an ambiguous one none. Weaker still,
 * and never sure: an album's producer standing in for the recording's, an
 * album's studio for the recording's, a credit linked to an artist of ours
 * whose identity is only likely, two studios or two labels where one is
 * wanted.
 *
 * Label is the release's, so the owner can take the album and refuse its
 * label. Its row targets the release, rests on the release's surest Album
 * row, and carries the release in its own `requires` too: accepting it
 * after the owner took another song's Album row for that release, or none,
 * still finds its target. A label is read from the album as first issued —
 * a release from the album's first year; one from a later issue (a
 * reissue's label, a deluxe edition's) is only ever likely, and its catalog
 * number is not the record's.
 *
 * Records are created unverified, each once however many rows need it, and
 * listed with the rows that need it. A studio's or a label's `source` is
 * its MusicBrainz page — neither kind has `externalIds`, and that URL is
 * how a later run knows it again. A label or studio the backend already has
 * (`existingRecords.ts`) is linked, never made again. Every slug handed out
 * is kept in the ledger (`recordSlugs.ts`), so the same MusicBrainz id gets
 * the same slug, and its rows the same ids, on every run. Nothing else is
 * imported: no genre tags, key, progressions, bio, and no display text but
 * credit names (a session's studio text is filled from the record when the
 * id is accepted, C20).
 */

export interface RecordArtifact<B> {
  slug: string;
  body: B;
  /** MusicBrainz's id for it (a release group's, for a release). */
  mbid: string;
  /** The rows that need it made. */
  neededBy: string[];
}

export interface CreatedArtist extends RecordArtifact<ArtistRecord> {
  /** Why it gets a record (C30): 'producer', 'songwriter', 'billed', 'member'. */
  because: string[];
}

export interface ReleaseArtifact extends RecordArtifact<ReleaseRecord> {
  /** The release its label and catalog number were read from. */
  release: string;
}

/** One song, and what it was matched to: the review's account, and the backend's. */
export interface SongMatchRow {
  songId: string;
  lead: string | null;
  leadTier: MatchTier | null;
  status: 'matched' | 'ambiguous' | 'none' | 'pending' | 'skipped' | 'error';
  tier?: MatchTier;
  /** How it was found: the old cache, a search by the act's id, or by name. */
  source: string;
  recording?: string;
  recordingTitle?: string;
  date?: string;
  works?: string[];
  releaseGroup?: string;
  release?: string;
  reasons: string[];
}

export type TierCounts = Record<SuggestionTier, number>;

export interface SongCounts {
  songs: number;
  matches: Record<SongMatchRow['status'], number>;
  matchTiers: Record<MatchTier, number>;
  suggestions: number;
  byTier: TierCounts;
  /** Per path, credits per role: 'releases[]', 'credits[] producer', …. */
  byField: Record<string, TierCounts>;
  records: {
    releases: number;
    labels: number;
    studios: number;
    artists: number;
    places: number;
  };
  /** Labels and studios linked to a record the backend already has. */
  existing: { labels: number; studios: number };
  /** Credits linked to one of our artists / to a person created / name only. */
  creditLinks: { ours: number; created: number; nameOnly: number };
  songsWithSuggestions: number;
}

export interface SongUnmapped {
  roles: [string, number][];
  instruments: [string, number][];
  places: [string, number][];
  /** Credited people named like an artist of ours whose identity isn't settled. */
  namesakes: [string, number][];
  /** Songs looked for again whose match has no dated record of the act's own: no year offered. */
  years: string[];
}

export interface BuiltSongSuggestions {
  suggestions: Suggestion[];
  matches: SongMatchRow[];
  releases: ReleaseArtifact[];
  labels: RecordArtifact<LabelRecord>[];
  studios: RecordArtifact<StudioRecord>[];
  artists: CreatedArtist[];
  places: PlaceArtifact[];
  counts: SongCounts;
  unmapped: SongUnmapped;
  /** The slug ledger with this run's records added (`recordSlugs.ts`). */
  ledger: SlugLedger;
}

export interface SongBuildInput {
  queue: readonly SongToFetch[];
  walk: SongWalk;
  /** Our artists' sure and likely MusicBrainz identities (F1), by slug. */
  picks: ReadonlyMap<string, ArtistPick>;
  /** Every registry slug, with the MBID settled for it (null when none is). */
  registry: readonly RegistrySlot[];
  /** The artist half's places: looked in, never added to. */
  artistPlaces: PlaceBook;
  wd: WikidataView;
  batch: string;
  /** The committed slug ledger: every MusicBrainz id keeps the slug it was given. */
  ledger?: SlugLedger;
  /** Labels and studios the backend has already; the pilot songs' by default. */
  existing?: readonly ExistingRecord[];
}

const SOURCE = 'musicbrainz';
const emptyTiers = (): TierCounts => ({ sure: 0, likely: 0, ambiguous: 0 });
const round2 = (n: number) => Math.round(n * 100) / 100;
const yearOf = (date: string | null | undefined): number | undefined => {
  const match = /^(\d{4})/.exec(date ?? '');
  return match ? Number(match[1]) : undefined;
};
const tally = (names: readonly string[]): [string, number][] => {
  const counts = new Map<string, number>();
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
};

export function buildSongSuggestions(
  input: SongBuildInput,
): BuiltSongSuggestions {
  const { walk, batch, wd } = input;
  const ledger = input.ledger ?? emptyLedger();
  const existing = input.existing ?? EXISTING_RECORDS;
  const queue = new Map(input.queue.map((s) => [s.id, s]));
  const unmapped = {
    roles: [] as string[],
    instruments: [] as string[],
    places: [] as string[],
    namesakes: [] as string[],
    years: [] as string[],
  };

  // Our artists by MusicBrainz id (merged ids too); a pick two of ours share
  // links to the first slug, and never surely.
  const ours = new Map<string, ArtistPick[]>();
  for (const pick of [...input.picks.values()].sort((a, b) =>
    a.slug.localeCompare(b.slug),
  ))
    for (const id of [pick.mbid, ...(pick.askedAs ?? [])])
      ours.set(id, [...(ours.get(id) ?? []), pick]);

  // ── Matched songs, and what their lookups credit ──────────────────────
  const matched = walk.rows.filter(
    (r) =>
      r.match?.status === 'matched' && r.recording && queue.get(r.songId)?.lead,
  );
  const offersBySong = new Map<string, CreditOffer[]>();
  for (const row of matched) {
    const album = row.album ? walk.albums.get(row.album.groupId) : undefined;
    const { offers, report } = creditOffers({
      recording: row.recording!,
      works: (row.workIds ?? [])
        .map((id) => walk.works.get(id))
        .filter((w) => !!w),
      release: album?.full ?? null,
    });
    unmapped.roles.push(...report.roles);
    unmapped.instruments.push(...report.instruments);
    offersBySong.set(row.songId, offers);
  }

  // ── People (C30), slugs (C33) ─────────────────────────────────────────
  const people = new Map<string, PersonToCreate & { because: Set<string> }>();
  const wantPerson = (
    who: { id: string; name: string; disambiguation?: string },
    ensemble: boolean,
    because: string,
  ) => {
    if (ours.has(who.id)) return;
    const seen = people.get(who.id) ?? {
      mbid: who.id,
      name: who.name,
      ...(who.disambiguation ? { disambiguation: who.disambiguation } : {}),
      ensemble,
      because: new Set<string>(),
    };
    seen.because.add(because);
    seen.ensemble ||= ensemble;
    people.set(who.id, seen);
  };
  for (const row of matched) {
    const lead = queue.get(row.songId)!.lead!;
    const members = walk.members.get(lead.mbid) ?? new Set<string>();
    for (const offer of offersBySong.get(row.songId) ?? [])
      if (makesRecord(offer, members))
        wantPerson(
          {
            id: offer.mbid,
            name: offer.name,
            disambiguation: offer.disambiguation,
          },
          !!offer.ensemble,
          offer.primary
            ? 'billed'
            : offer.role === 'songwriter' || offer.role === 'producer'
              ? offer.role
              : 'member',
        );
  }
  const albumsUsed = new Map<string, string[]>();
  for (const row of matched)
    if (row.album && walk.albums.has(row.album.groupId))
      albumsUsed.set(row.album.groupId, [
        ...(albumsUsed.get(row.album.groupId) ?? []),
        row.songId,
      ]);
  for (const groupId of albumsUsed.keys()) {
    const album = matched.find((r) => r.album?.groupId === groupId)!.album!;
    for (const { artist } of album.credit)
      wantPerson(
        {
          id: artist.id,
          name: artist.name,
          disambiguation: artist.disambiguation,
        },
        isEnsembleType((artist as { type?: string | null }).type),
        'billed',
      );
  }
  const personSlugs = assignPersonSlugs(
    [...people.values()],
    input.registry,
    ledger.artist,
  );

  /** Who an MBID is to us: one of ours, a person to create, or a name. */
  const who = (mbid: string) => {
    const mine = ours.get(mbid);
    if (mine?.length)
      return { kind: 'ours' as const, pick: mine[0], shared: mine.length > 1 };
    const person = people.get(mbid);
    const slug: PersonSlug | undefined = person && personSlugs.get(mbid);
    if (person && slug?.kind === 'slug')
      return { kind: 'created' as const, slug: slug.slug, person };
    if (person && slug?.kind === 'blocked') {
      unmapped.namesakes.push(`${person.name} → ${slug.registrySlug}?`);
      return { kind: 'namesake' as const, registrySlug: slug.registrySlug };
    }
    return { kind: 'name' as const };
  };
  const personRecord = (mbid: string, slug: string): RequiredRecord => {
    const person = people.get(mbid)!;
    return {
      kind: 'artist',
      slug,
      body: {
        slug,
        name: person.name,
        ...(person.ensemble ? { group: true } : {}),
        externalIds: { mbid },
        unverified: true,
        source: SOURCE,
      } satisfies ArtistRecord,
    };
  };

  // ── Places for labels and studios ─────────────────────────────────────
  const recordPlaces = createPlaceBook({
    reserved: new Set(input.artistPlaces.created().map((p) => p.slug)),
  });
  const placeFor = (
    area: ResolvedArea | undefined,
    own: [number, number] | null,
  ): PlaceMatch => {
    if (!area) return { kind: 'none', reason: 'no area' };
    if (area.isCountry)
      return { kind: 'none', reason: `${area.name}: a country, not a town` };
    const country = area.countryName ?? area.countryCode;
    const item = area.wikidata ? wd.place(area.wikidata) : undefined;
    const itemAt = item ? coordinatesOf(item) : null;
    const at = own ?? itemAt;
    // The area, then — where we know where it is, to check the distance —
    // the areas it is part of: a studio in Hollywood is in Los Angeles, one
    // of ours. Never a parent by name alone: "New York" the state is not the
    // city. The artist half's places count as ours too.
    for (const name of at ? area.chain : [area.name]) {
      const found = input.artistPlaces.find({ name, country, coordinates: at });
      if (found.kind !== 'none') return found;
    }
    if (!area.type || !CITY_AREA_TYPES.includes(area.type))
      return {
        kind: 'none',
        reason: `${area.name}: a ${area.type?.toLowerCase() ?? 'place of unknown kind'}, not a town`,
      };
    const fact: PlaceFact = {
      name: area.name,
      country,
      coordinates: itemAt ?? at,
      wikidata: area.wikidata,
      mbArea: area.id,
    };
    return recordPlaces.place(fact);
  };
  // The studios: a room's building, else the place when it is a studio.
  const studioPlaces = studiosOf(walk, [...walk.places.keys()]).map(
    (id) => walk.places.get(id)!,
  );
  const labelArea = (label: MbLabel) =>
    label.area?.id ? walk.areas.get(label.area.id) : undefined;
  const studioArea = (place: MbPlace) =>
    place.area?.id ? walk.areas.get(place.area.id) : undefined;
  // Twice, as the artist half does: the second pass hands out the slugs the
  // whole set gives (`placeMap.ts`).
  const placeAll = () => ({
    labels: new Map(
      [...walk.labels.values()].map((l) => [
        l.id,
        placeFor(labelArea(l), null),
      ]),
    ),
    studios: new Map(
      studioPlaces.map((p) => [
        p.id,
        placeFor(studioArea(p), placeCoordinates(p)),
      ]),
    ),
  });
  placeAll();
  const placed = placeAll();
  const placeRequires = (match: PlaceMatch | undefined): RequiredRecord[] =>
    match?.kind === 'create'
      ? [{ kind: 'globe_city', slug: match.placeId, body: match.place.body }]
      : [];
  const placeId = (match: PlaceMatch | undefined) =>
    match && match.kind !== 'none' ? match.placeId : undefined;
  for (const match of [...placed.labels.values(), ...placed.studios.values()])
    if (match.kind === 'none') unmapped.places.push(match.reason);

  // ── Labels and studios ────────────────────────────────────────────────
  // One the backend already has is linked; the rest get a slug no record
  // has — the ledger's when an earlier emit gave one.
  const existingFor = (
    kind: ExistingKind,
    name: string,
    match: PlaceMatch | undefined,
    country: string | null | undefined,
  ) =>
    existingRecordFor(
      kind,
      { name, placeId: placeId(match), country: country ?? null },
      existing,
    );
  const labelCountry = (l: MbLabel) => l.country ?? labelArea(l)?.countryCode;
  const existingLabels = new Map<string, ExistingRecord>();
  for (const l of walk.labels.values()) {
    const found = existingFor(
      'label',
      l.name,
      placed.labels.get(l.id),
      labelCountry(l),
    );
    if (found) existingLabels.set(l.id, found);
  }
  const existingStudios = new Map<string, ExistingRecord>();
  for (const p of studioPlaces) {
    const found = existingFor(
      'studio',
      p.name,
      placed.studios.get(p.id),
      studioArea(p)?.countryCode,
    );
    if (found) existingStudios.set(p.id, found);
  }
  const labelSlugs = assignRecordSlugs(
    [...walk.labels.values()]
      .filter((l) => !existingLabels.has(l.id))
      .map((l) => ({ mbid: l.id, name: l.name, country: labelCountry(l) })),
    { known: ledger.label, taken: existingSlugs('label', existing) },
  );
  /** A label's slug, and the record to make — none for one we have. */
  const labelRecord = (
    label: MbLabel,
  ): { slug: string; record: RequiredRecord | null } => {
    const have = existingLabels.get(label.id);
    if (have) return { slug: have.slug, record: null };
    const slug = labelSlugs.get(label.id)!;
    const founded = yearOf(label['life-span']?.begin);
    const defunct = label['life-span']?.ended
      ? yearOf(label['life-span']?.end)
      : undefined;
    const at = placeId(placed.labels.get(label.id));
    return {
      slug,
      record: {
        kind: 'label',
        slug,
        body: {
          slug,
          name: label.name,
          ...(at ? { placeId: at } : {}),
          ...(founded ? { foundedYear: founded } : {}),
          ...(defunct ? { defunctYear: defunct } : {}),
          unverified: true,
          source: `${MB_LABEL}${label.id}`,
        } satisfies LabelRecord,
      },
    };
  };
  const studioSlugs = assignRecordSlugs(
    studioPlaces
      .filter((p) => !existingStudios.has(p.id))
      .map((p) => ({
        mbid: p.id,
        name: p.name,
        country: studioArea(p)?.countryCode,
      })),
    { known: ledger.studio, taken: existingSlugs('studio', existing) },
  );
  /** A studio's slug, and the record to make — none for one we have. */
  const studioRecord = (
    place: MbPlace,
  ): { slug: string; record: RequiredRecord | null } => {
    const have = existingStudios.get(place.id);
    if (have) return { slug: have.slug, record: null };
    const slug = studioSlugs.get(place.id)!;
    const opened = yearOf(place['life-span']?.begin);
    const closed = place['life-span']?.ended
      ? yearOf(place['life-span']?.end)
      : undefined;
    const at = placeId(placed.studios.get(place.id));
    const coordinates = placeCoordinates(place);
    return {
      slug,
      record: {
        kind: 'studio',
        slug,
        body: {
          slug,
          name: place.name,
          ...(at ? { placeId: at } : {}),
          ...(opened ? { openedYear: opened } : {}),
          ...(closed ? { closedYear: closed } : {}),
          ...(coordinates
            ? {
                coordinates: [
                  Math.round(coordinates[0] * 1e4) / 1e4,
                  Math.round(coordinates[1] * 1e4) / 1e4,
                ] as [number, number],
              }
            : {}),
          unverified: true,
          source: `${MB_PLACE}${place.id}`,
        } satisfies StudioRecord,
      },
    };
  };

  // ── Releases ──────────────────────────────────────────────────────────
  const releaseInfo = new Map<
    string,
    {
      title: string;
      format: ReleaseRecord['format'];
      year?: number;
      artistIds: string[];
      requires: RequiredRecord[];
      labels: { id: string; catalog?: string }[];
      releaseId: string;
      /** The release the label is read from, as the owner reads it. */
      releaseSaid: string;
      /**
       * That release came out in the album's first year: its label and
       * catalog number are the record's, not a reissue's.
       */
      issuedFirst: boolean;
      /** The year the release group first came out, from its lookup. */
      groupYear?: number;
      notes: string[];
    }
  >();
  for (const groupId of albumsUsed.keys()) {
    const album = walk.albums.get(groupId)!;
    const choice = matched.find((r) => r.album?.groupId === groupId)!.album!;
    const artistIds: string[] = [];
    const requires: RequiredRecord[] = [];
    const notes: string[] = [];
    for (const { artist } of choice.credit) {
      const it = who(artist.id);
      if (it.kind === 'ours') artistIds.push(it.pick.slug);
      else if (it.kind === 'created') {
        artistIds.push(it.slug);
        requires.push(personRecord(artist.id, it.slug));
      } else
        notes.push(`${artist.name} is billed on the album but has no record`);
    }
    if (!artistIds.length) continue;
    const groupYear = yearOf(
      album.full?.['release-group']?.['first-release-date'],
    );
    const releaseYear = yearOf(album.release.date);
    releaseInfo.set(groupId, {
      title: choice.title,
      format: choice.format,
      year: groupYear ?? yearOf(choice.date),
      artistIds: [...new Set(artistIds)],
      requires,
      labels: releaseLabels(album.full?.['label-info']).filter((l) =>
        walk.labels.has(l.id),
      ),
      releaseId: album.release.id,
      releaseSaid: `release ${album.release.id}, ${[album.release.date ?? 'undated', album.release.country].filter(Boolean).join(', ')}`,
      issuedFirst:
        album.release.firstIssue &&
        (groupYear === undefined ||
          (releaseYear !== undefined && releaseYear <= groupYear)),
      ...(groupYear !== undefined ? { groupYear } : {}),
      notes,
    });
  }
  const releaseSlugs = assignReleaseSlugs(
    [...releaseInfo].map(([mbid, r]) => ({
      mbid,
      base: `${r.artistIds[0]}-${toSlug(r.title)}`,
      year: r.year,
    })),
    { known: ledger.release },
  );
  const releaseRecord = (groupId: string): RequiredRecord => {
    const r = releaseInfo.get(groupId)!;
    const slug = releaseSlugs.get(groupId)!;
    const [first] = r.labels;
    // A reissue's catalog number is not the record's.
    const catalog = r.issuedFirst ? first?.catalog : undefined;
    return {
      kind: 'release',
      slug,
      body: {
        slug,
        title: r.title,
        artistIds: r.artistIds,
        format: r.format,
        ...(r.year ? { year: r.year } : {}),
        ...(catalog ? { catalogNumber: catalog } : {}),
        externalIds: { mbid: groupId },
        unverified: true,
        source: SOURCE,
      } satisfies ReleaseRecord,
    };
  };

  // ── Suggestions ───────────────────────────────────────────────────────
  const suggestions: Suggestion[] = [];
  const make = (s: Omit<Suggestion, 'id' | 'batch'>): Suggestion => {
    const made: Suggestion = {
      id: suggestionId({
        target: s.target,
        path: s.path,
        op: s.op,
        value: s.value,
      }),
      ...s,
      batch,
    };
    suggestions.push(made);
    return made;
  };
  const tiered = (sure: boolean, confidence: number) => ({
    tier: (sure ? 'sure' : 'likely') as SuggestionTier,
    confidence: round2(sure ? confidence : Math.min(confidence, LIKELY_CAP)),
  });
  const mbSource = (
    url: string,
    label: string,
    externalId?: string,
  ): SuggestionSource => ({
    provider: 'musicbrainz',
    url,
    label,
    ...(externalId ? { externalId } : {}),
  });
  const albumRows = new Map<string, Suggestion[]>();
  const creditLinks = { ours: 0, created: 0, nameOnly: 0 };

  for (const row of [...matched].sort((a, b) =>
    a.songId.localeCompare(b.songId),
  )) {
    const song = queue.get(row.songId)!;
    const lead = song.lead!;
    const match = row.match!;
    if (match.status !== 'matched') continue;
    const target = { kind: 'song', slug: song.id };
    const sure = match.tier === 'sure';
    const base = {
      target,
      dependsOn: lead.identityId,
    };
    const why = [...match.reasons, ...match.notes];
    // Credits and studios repeat only the recording and what weakens it: a
    // song's credits are many rows, and its album row has the whole story.
    const brief = [match.reasons[0], ...match.notes];
    const recordingSource = mbSource(
      `${MB_RECORDING}${match.take.recording.id}`,
      'recording',
      match.take.recording.id,
    );

    // Album.
    const groupId = row.album?.groupId;
    if (groupId && releaseInfo.has(groupId)) {
      const r = releaseInfo.get(groupId)!;
      const slug = releaseSlugs.get(groupId)!;
      const track = row.album!.releases.find(
        (x) => x.id === r.releaseId,
      )?.track;
      // An album issued well after the recording first came out is the
      // song's album only if it was never on one before: worth a look. So
      // is a recording found only on issues years after the album's first
      // (a bonus track of a deluxe edition), whatever its own date says.
      const carried = firstYearOf(row.album!.releases);
      const late = [
        ...(r.year !== undefined && r.year - match.take.year > 1
          ? [
              `the album came out in ${r.year}, ${r.year - match.take.year} years after the recording`,
            ]
          : []),
        ...(r.groupYear !== undefined &&
        carried !== undefined &&
        carried - r.groupYear > 1
          ? [
              `the album first came out in ${r.groupYear}, but the recording is only on its issues from ${carried} on: a bonus track?`,
            ]
          : []),
      ];
      const made = make({
        ...base,
        path: 'releases[]',
        op: 'add',
        value: {
          releaseId: slug,
          ...(track !== undefined ? { track } : {}),
          unverified: true,
          source: SOURCE,
        },
        display: `Album: ${r.title}${r.year ? ` (${r.year})` : ''}`,
        sources: [
          mbSource(`${MB_RELEASE_GROUP}${groupId}`, 'release group', groupId),
          recordingSource,
        ],
        evidence: [
          ...why,
          `"${r.title}"${row.album!.date ? ` (${row.album!.date})` : ''}: the earliest official ${r.format} carrying the recording, credited to ${r.artistIds.join(', ')}`,
          ...r.notes,
          ...late,
        ],
        ...tiered(sure && !late.length, match.confidence),
        requires: [...r.requires, releaseRecord(groupId)],
      });
      albumRows.set(groupId, [...(albumRows.get(groupId) ?? []), made]);
    }

    // Studio: the recording's own, else the album's (weaker). A room
    // ("Abbey Road Studios: Studio 2") is its building's.
    const ownPlaces = row.placeIds ?? [];
    const own = studiosOf(walk, ownPlaces);
    const albumFull = groupId ? walk.albums.get(groupId)?.full : undefined;
    const statedAt = own.length ? ownPlaces : recordedAt(albumFull?.relations);
    const studios = own.length ? own : studiosOf(walk, statedAt);
    for (const id of studios) {
      const place = walk.places.get(id)!;
      const { slug, record } = studioRecord(place);
      const rooms = statedAt
        .filter((p) => walk.wholes.get(p) === id)
        .map((p) => walk.places.get(p)?.name ?? p);
      const have = existingStudios.get(id);
      make({
        ...base,
        path: 'session.studioId',
        op: 'set',
        value: slug,
        display: `Studio: ${place.name}`,
        sources: [
          mbSource(`${MB_PLACE}${id}`, 'place, Studio', id),
          own.length
            ? recordingSource
            : mbSource(`${MB_RELEASE}${albumFull?.id}`, 'release'),
        ],
        evidence: [
          ...brief,
          own.length
            ? `the recording was recorded at ${place.name}`
            : `the album was recorded at ${place.name} (the recording names no studio)`,
          ...(rooms.length
            ? [`in ${rooms.join(' and ')}, part of ${place.name}`]
            : []),
          ...(have ? [`the studio we already have as ${have.slug}`] : []),
          ...(studios.length > 1
            ? [`${studios.length} studios are named`]
            : []),
        ],
        ...tiered(
          sure && own.length > 0 && studios.length === 1,
          match.confidence,
        ),
        ...(record
          ? { requires: [...placeRequires(placed.studios.get(id)), record] }
          : {}),
      });
    }

    // Credits.
    for (const offer of offersBySong.get(row.songId) ?? []) {
      const it = who(offer.mbid);
      const credit: Credit = {
        name: offer.name,
        role: offer.role,
        ...(offer.instrument ? { instrument: offer.instrument } : {}),
        ...(offer.ensemble ? { ensemble: true } : {}),
        ...(offer.primary ? { primary: true } : {}),
        ...(it.kind === 'ours'
          ? { artistGlobeId: it.pick.slug }
          : it.kind === 'created'
            ? { artistGlobeId: it.slug }
            : {}),
        unverified: true,
        source: `${MB_ARTIST}${offer.mbid}`,
      };
      if (it.kind === 'ours') creditLinks.ours++;
      else if (it.kind === 'created') creditLinks.created++;
      else creditLinks.nameOnly++;
      const weaker: string[] = [];
      if (offer.level === 'release')
        weaker.push("the album's producer; the recording names none");
      if (offer.instrumentNames?.length)
        weaker.push(
          `MusicBrainz's ${offer.instrumentNames.join(', ')} ${offer.instrumentNames.length > 1 ? 'are' : 'is'} not in our instrument list: written as a performer credit without an instrument`,
        );
      // The row rests on the lead act's identity; a link to another of our
      // artists rests on theirs too, which bulk accept cannot see.
      if (it.kind === 'ours' && it.pick.slug !== lead.slug)
        weaker.push(
          `links our ${it.pick.slug}: accept ${it.pick.slug}'s MusicBrainz identity (row ${it.pick.identityId}) first`,
        );
      if (it.kind === 'ours' && it.pick.tier !== 'sure')
        weaker.push(`${it.pick.slug}'s MusicBrainz identity is only likely`);
      if (it.kind === 'ours' && it.shared)
        weaker.push('two of our artists share this MusicBrainz artist');
      if (it.kind === 'namesake')
        weaker.push(
          `named like our ${it.registrySlug}, whose MusicBrainz identity isn't settled: link by hand if it is them`,
        );
      const instrument = offer.instrument
        ? (getInstrument(offer.instrument)?.name ?? offer.instrument)
        : null;
      make({
        ...base,
        path: 'credits[]',
        op: 'add',
        value: credit,
        display: creditDisplay(offer, instrument),
        sources: [mbSource(offer.url, offer.relation)],
        evidence: [
          `MusicBrainz ${offer.level === 'billing' ? 'artist credit' : `${offer.level} relationship "${offer.relation}"`}${offer.instrumentNames?.length ? ` (${offer.instrumentNames.join(', ')})` : ''}`,
          ...(it.kind === 'ours'
            ? [`the same MusicBrainz artist as our ${it.pick.slug}`]
            : it.kind === 'created'
              ? [
                  `a new artist record, ${it.slug} (${[...it.person.because].sort().join(', ')})`,
                ]
              : []),
          ...brief,
          ...weaker,
        ],
        ...tiered(sure && !weaker.length, match.confidence),
        ...(it.kind === 'created'
          ? { requires: [personRecord(offer.mbid, it.slug)] }
          : {}),
      });
    }
  }

  // Year: only the songs whose year is looked for again, by id or by name.
  for (const row of [...walk.rows].sort((a, b) =>
    a.songId.localeCompare(b.songId),
  )) {
    const song = queue.get(row.songId);
    const match = row.match;
    if (
      !song?.requery ||
      song.year !== undefined ||
      match?.status !== 'matched'
    )
      continue;
    // A year only from the act's own dated record: a date that only a
    // compilation or a re-issue carries is when it came out again.
    const first = firstRelease(match.take);
    if (!first) {
      unmapped.years.push(song.id);
      continue;
    }
    const year = first.year;
    make({
      target: { kind: 'song', slug: song.id },
      ...(song.lead ? { dependsOn: song.lead.identityId } : {}),
      path: 'year',
      op: 'set',
      value: year,
      display: `Year: ${year}`,
      sources: [
        mbSource(
          `${MB_RECORDING}${match.take.recording.id}`,
          'first release',
          match.take.recording.id,
        ),
      ],
      evidence: [
        ...match.reasons,
        ...match.notes,
        `first issued ${first.date} on "${first.title}"${first.type ? ` (${first.type})` : ''}`,
        ...(first.agrees
          ? []
          : [`MusicBrainz dates the recording itself ${match.take.date}`]),
      ],
      ...tiered(match.tier === 'sure' && first.agrees, match.confidence),
    });
  }

  // Label: the release's, one row per label of the release. It rests on
  // the release's surest Album row — the one its tier comes from — and
  // carries the release (and the people it bills) in its own `requires`,
  // so it finds its target whichever song's Album row the owner took.
  for (const [groupId, r] of [...releaseInfo].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const rows = [...(albumRows.get(groupId) ?? [])].sort(
      (a, b) =>
        Number(b.tier === 'sure') - Number(a.tier === 'sure') ||
        b.confidence - a.confidence ||
        a.target.slug.localeCompare(b.target.slug),
    );
    if (!rows.length || !r.labels.length) continue;
    const [best] = rows;
    const slug = releaseSlugs.get(groupId)!;
    for (const { id, catalog } of r.labels) {
      const label = walk.labels.get(id)!;
      const { slug: value, record } = labelRecord(label);
      const have = existingLabels.get(id);
      const shownCatalog = r.issuedFirst ? catalog : undefined;
      make({
        target: { kind: 'release', slug },
        dependsOn: best.id,
        path: 'labelId',
        op: 'set',
        value,
        display: `Label: ${label.name}${shownCatalog ? ` (${shownCatalog})` : ''}`,
        sources: [
          mbSource(`${MB_LABEL}${id}`, 'label', id),
          mbSource(`${MB_RELEASE}${r.releaseId}`, 'release label', r.releaseId),
        ],
        evidence: [
          r.issuedFirst
            ? `the label of "${r.title}" as first issued (${r.releaseSaid})`
            : `the label of a later issue of "${r.title}" (${r.releaseSaid}): ` +
              `MusicBrainz has no issue${r.groupYear !== undefined ? ` from ${r.groupYear}, the album's first year,` : ' dated in the album’s first year'} carrying the song`,
          ...(have ? [`the label we already have as ${have.slug}`] : []),
          ...(r.labels.length > 1
            ? [`the release names ${r.labels.length} labels`]
            : []),
        ],
        ...tiered(
          best.tier === 'sure' && r.labels.length === 1 && r.issuedFirst,
          best.confidence,
        ),
        requires: [
          ...r.requires,
          releaseRecord(groupId),
          ...(record ? [...placeRequires(placed.labels.get(id)), record] : []),
        ],
      });
    }
  }

  suggestions.sort(
    (a, b) =>
      a.target.kind.localeCompare(b.target.kind) ||
      a.target.slug.localeCompare(b.target.slug) ||
      a.path.localeCompare(b.path) ||
      a.id.localeCompare(b.id),
  );

  // ── Records to make, each once, with the rows that need it ────────────
  const neededBy = new Map<string, string[]>();
  const bodies = new Map<string, RequiredRecord>();
  for (const s of suggestions)
    for (const r of s.requires ?? []) {
      const key = `${r.kind}:${r.slug}`;
      neededBy.set(key, [...(neededBy.get(key) ?? []), s.id]);
      bodies.set(key, r);
    }
  const of = (kind: string) =>
    [...bodies.entries()]
      .filter(([key]) => key.startsWith(`${kind}:`))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, r]) => ({
        r,
        neededBy: [...new Set(neededBy.get(key))].sort(),
      }));
  const mbidOfSource = (source: unknown) =>
    String(source ?? '')
      .split('/')
      .pop() ?? '';

  const releases: ReleaseArtifact[] = of('release').map(
    ({ r, neededBy: n }) => {
      const body = r.body as ReleaseRecord;
      const groupId = body.externalIds!.mbid!;
      return {
        slug: r.slug,
        body,
        mbid: groupId,
        release: releaseInfo.get(groupId)!.releaseId,
        neededBy: n,
      };
    },
  );
  const labels = of('label').map(({ r, neededBy: n }) => ({
    slug: r.slug,
    body: r.body as LabelRecord,
    mbid: mbidOfSource((r.body as LabelRecord).source),
    neededBy: n,
  }));
  const studios = of('studio').map(({ r, neededBy: n }) => ({
    slug: r.slug,
    body: r.body as StudioRecord,
    mbid: mbidOfSource((r.body as StudioRecord).source),
    neededBy: n,
  }));
  const artists: CreatedArtist[] = of('artist').map(({ r, neededBy: n }) => {
    const body = r.body as ArtistRecord;
    const mbid = body.externalIds!.mbid!;
    return {
      slug: r.slug,
      body,
      mbid,
      because: [...(people.get(mbid)?.because ?? [])].sort(),
      neededBy: n,
    };
  });
  const created = new Map(
    recordPlaces.created().map((p) => [p.slug, p] as [string, PlaceToCreate]),
  );
  const places: PlaceArtifact[] = of('globe_city')
    .filter(({ r }) => created.has(r.slug))
    .map(({ r, neededBy: n }) => {
      const p = created.get(r.slug)!;
      return {
        slug: r.slug,
        body: p.body,
        sources: [
          ...(p.wikidata
            ? [
                {
                  provider: 'wikidata' as const,
                  url: `${WD_ITEM}${p.wikidata}`,
                  label: 'P625',
                  externalId: p.wikidata,
                },
              ]
            : []),
          ...(p.mbArea
            ? [
                {
                  provider: 'musicbrainz' as const,
                  url: `https://musicbrainz.org/area/${p.mbArea}`,
                  label: 'area',
                  externalId: p.mbArea,
                },
              ]
            : []),
        ],
        neededBy: n,
      };
    });

  // ── The account ───────────────────────────────────────────────────────
  const matches: SongMatchRow[] = walk.rows.map((row) => {
    const song = queue.get(row.songId);
    const m = row.match;
    const status: SongMatchRow['status'] = row.error
      ? 'error'
      : row.skipped
        ? 'skipped'
        : row.pending === 'search' || !m
          ? 'pending'
          : m.status;
    return {
      songId: row.songId,
      lead: row.lead,
      leadTier: song?.lead?.tier ?? null,
      status,
      source: row.source,
      ...(m?.status === 'matched'
        ? {
            tier: m.tier,
            recording: m.take.recording.id,
            recordingTitle: m.take.recording.title,
            date: m.take.date,
          }
        : {}),
      ...(row.workIds?.length ? { works: row.workIds } : {}),
      ...(row.album ? { releaseGroup: row.album.groupId } : {}),
      ...(row.album && walk.albums.get(row.album.groupId)
        ? { release: walk.albums.get(row.album.groupId)!.release.id }
        : {}),
      reasons: [
        ...(row.skipped ? [row.skipped] : []),
        ...(row.error ? [row.error] : []),
        ...(m
          ? [...m.reasons, ...(m.status === 'matched' ? m.notes : [])]
          : []),
        ...(row.worksNote ? [row.worksNote] : []),
        ...(row.pending && row.pending !== 'search'
          ? [`${row.pending} not in the cache yet`]
          : []),
      ],
    };
  });

  /** Records the backend has that some row links to. */
  const linkedTo = (path: string, have: Map<string, ExistingRecord>) => {
    const slugs = new Set([...have.values()].map((e) => e.slug));
    return new Set(
      suggestions
        .filter((x) => x.path === path && slugs.has(String(x.value)))
        .map((x) => x.value),
    ).size;
  };
  const counts: SongCounts = {
    songs: walk.rows.length,
    matches: {
      matched: 0,
      ambiguous: 0,
      none: 0,
      pending: 0,
      skipped: 0,
      error: 0,
    },
    matchTiers: { sure: 0, likely: 0 },
    suggestions: suggestions.length,
    byTier: emptyTiers(),
    byField: {},
    records: {
      releases: releases.length,
      labels: labels.length,
      studios: studios.length,
      artists: artists.length,
      places: places.length,
    },
    existing: {
      labels: linkedTo('labelId', existingLabels),
      studios: linkedTo('session.studioId', existingStudios),
    },
    creditLinks,
    songsWithSuggestions: new Set(
      suggestions
        .filter((s) => s.target.kind === 'song')
        .map((s) => s.target.slug),
    ).size,
  };
  for (const m of matches) {
    counts.matches[m.status]++;
    if (m.tier) counts.matchTiers[m.tier]++;
  }
  const byField: Record<string, TierCounts> = {};
  for (const s of suggestions) {
    const field =
      s.path === 'credits[]' ? `credits[] ${(s.value as Credit).role}` : s.path;
    counts.byTier[s.tier]++;
    byField[field] ??= emptyTiers();
    byField[field][s.tier]++;
  }
  for (const field of Object.keys(byField).sort())
    counts.byField[field] = byField[field];

  return {
    suggestions,
    matches,
    releases,
    labels,
    studios,
    artists,
    places,
    counts,
    unmapped: {
      roles: tally(unmapped.roles),
      instruments: tally(unmapped.instruments),
      places: tally(unmapped.places),
      namesakes: tally(unmapped.namesakes),
      years: unmapped.years,
    },
    // Every slug handed out to a record some row needs made, kept for good.
    ledger: mergeLedger(ledger, {
      release: new Map(releases.map((r) => [r.mbid, r.slug])),
      label: new Map(labels.map((r) => [r.mbid, r.slug])),
      studio: new Map(studios.map((r) => [r.mbid, r.slug])),
      artist: new Map(artists.map((r) => [r.mbid, r.slug])),
    }),
  };
}
