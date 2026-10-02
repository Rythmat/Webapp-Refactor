import type { MbArtistCredit } from '../musicbrainz';
import type { ArtistPick, LeadAct, SongFacts } from '../songMatch';
import type {
  MbRecordingFull,
  MbSearchRecording,
  MbSearchRelease,
  MbSongRelation,
} from '../songSources';

/** Builders for the song half's tests: MusicBrainz answers in their own shapes. */

export const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

export const MARVIN = id(1);
export const TAMMI = id(2);

export const credit = (
  artistId: string,
  name: string,
  more: { type?: string; disambiguation?: string; joinphrase?: string } = {},
): MbArtistCredit => ({
  name,
  ...(more.joinphrase ? { joinphrase: more.joinphrase } : {}),
  artist: {
    id: artistId,
    name,
    ...(more.disambiguation ? { disambiguation: more.disambiguation } : {}),
    ...(more.type ? { type: more.type } : {}),
  } as MbArtistCredit['artist'],
});

export const release = (
  n: number,
  more: {
    title?: string;
    date?: string;
    country?: string;
    status?: string;
    group?: number;
    type?: string;
    secondary?: string[];
    credit?: MbArtistCredit[];
    track?: string;
  } = {},
): MbSearchRelease => ({
  id: id(1000 + n),
  title: more.title ?? `Release ${n}`,
  status: more.status ?? 'Official',
  ...(more.date ? { date: more.date } : {}),
  country: more.country ?? 'US',
  ...(more.credit ? { 'artist-credit': more.credit } : {}),
  'release-group': {
    id: id(2000 + (more.group ?? n)),
    title: more.title ?? `Release ${n}`,
    'primary-type': more.type ?? 'Album',
    'secondary-types': more.secondary ?? [],
  },
  ...(more.track
    ? {
        media: [
          { position: 1, track: [{ id: id(9000 + n), number: more.track }] },
        ],
      }
    : {}),
});

export const recording = (
  n: number,
  more: {
    title?: string;
    date?: string;
    disambiguation?: string;
    credit?: MbArtistCredit[];
    releases?: MbSearchRelease[];
    video?: boolean;
  } = {},
): MbSearchRecording => ({
  id: id(3000 + n),
  title: more.title ?? "Let's Get It On",
  ...(more.disambiguation ? { disambiguation: more.disambiguation } : {}),
  ...(more.date !== undefined
    ? { 'first-release-date': more.date }
    : { 'first-release-date': '1973-06-15' }),
  'artist-credit': more.credit ?? [credit(MARVIN, 'Marvin Gaye')],
  releases: more.releases ?? [
    release(n, { title: "Let's Get It On", date: more.date ?? '1973-06-15' }),
  ],
  ...(more.video ? { video: true } : {}),
});

export const pick = (more: Partial<ArtistPick> = {}): ArtistPick => ({
  slug: 'marvin-gaye',
  name: 'Marvin Gaye',
  mbid: MARVIN,
  tier: 'sure',
  confidence: 1,
  identityId: 'identity-marvin',
  countryCode: 'US',
  ...more,
});

export const lead = (more: Partial<LeadAct> = {}): LeadAct => pick(more);

export const song = (more: Partial<SongFacts> = {}): SongFacts => ({
  id: 'lets_get_it_on',
  title: "Let's Get It On",
  artist: 'Marvin Gaye',
  yearFromMusicBrainz: false,
  ...more,
});

export const artistRel = (
  type: string,
  artistId: string,
  name: string,
  attributes: string[] = [],
  more: { type?: string; disambiguation?: string } = {},
): MbSongRelation => ({
  type,
  'target-type': 'artist',
  direction: 'backward',
  attributes,
  artist: {
    id: artistId,
    name,
    ...(more.type ? { type: more.type } : {}),
    ...(more.disambiguation ? { disambiguation: more.disambiguation } : {}),
  },
});

export const fullRecording = (
  n: number,
  relations: MbSongRelation[],
  artistCredit: MbArtistCredit[] = [credit(MARVIN, 'Marvin Gaye')],
): MbRecordingFull => ({
  id: id(3000 + n),
  title: "Let's Get It On",
  'first-release-date': '1973-06-15',
  'artist-credit': artistCredit,
  relations,
});
