// ─────────────────────────────────────────────────────────────────────────
//  FROZEN — song body schema level v1. Do not edit, do not regenerate.
//
//  This is `songBodySchema.ts` exactly as generated on 2026-09-29, before any
//  graph id fields (releases, session ids, subgenreIds) were added to the Song
//  type. It is the file the content API is asked to adopt first
//  (docs/song-body-schema-gap.md): it accepts credits, session, composer and
//  relatedRecordings, which today's server rejects.
//
//  `songBodySchema.ts` keeps being regenerated from the type file and becomes
//  level v2 once the new fields land. Keeping v1 as its own file means the
//  level the API runs is a named file, not "whatever it was when copied".
//  manifest.json records this file's hash; a test fails if it changes.
// ─────────────────────────────────────────────────────────────────────────
import { z } from 'zod';

export const songModeSchema = z.enum([
  'major',
  'minor',
  'dorian',
  'mixolydian',
  'phrygian',
  'lydian',
  'locrian',
  'aeolian',
  'ionian',
]);

export const difficultyLevelSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);

export const audioProviderSchema = z.enum([
  'spotify',
  'youtube',
  'apple_music',
  'tidal',
]);

export const artistImageSourceSchema = z.enum([
  'spotify',
  'youtube',
  'commissioned',
  'wikipedia',
  'manual',
  'none',
]);

export const contentRefTypeSchema = z.enum([
  'key',
  'mode',
  'progression',
  'technique',
  'genre_overview',
  'globe_region',
  'globe_era',
  'globe_artist',
  'globe_scene',
  'studio_jam',
]);

/**
 * What someone did on the recording.
 * `performer` is the only role that carries an `instrument`; the rest are the
 * jobs a session credit names without one. Songwriters appear here AND in the
 * song's `composer` line — `composer` is the sentence a reader sees ("Written
 * by Ashford & Simpson"), these are the entities the constellation walks.
 */
export const creditRoleSchema = z.enum([
  'performer',
  'vocals',
  'producer',
  'engineer',
  'arranger',
  'conductor',
  'songwriter',
]);

export const roadmapJumpSchema = z.enum([
  'D.C.',
  'D.S.',
  'D.C. al Coda',
  'D.S. al Coda',
  'D.C. al Fine',
  'D.S. al Fine',
]);

export const chordHitSchema = z
  .object({
    /** Hybrid Number System — primary. e.g. '1 maj', '♭7 maj', '5 dom7' */
    degree: z.string(),
    /** Concrete chord name in the song's key — secondary. e.g. 'E', 'B/D♯' */
    chordName: z.string(),
    /** Beat position (1-indexed). Supports decimals for pickups (e.g. 1.5). */
    beat: z.number(),
    /** Duration in beats. 4 = full bar, 2 = half, 1 = quarter. */
    duration: z.number(),
    /** Voicing hint for piano roll + Studio export. Bottom-to-top stack. */
    voicingHint: z.string().optional(),
  })
  .strict();

export const chordBarSchema = z
  .object({
    /** Typically 1–2 chords per bar, max 4 (one per beat). */
    chords: z.array(chordHitSchema),
    /** If true, draw a fermata (hold) symbol above this bar. */
    fermata: z.boolean().optional(),
    /**
     * If set, this bar represents a multi-bar rest. Renders as a thick
     *  horizontal block with the number above. `chords` should be empty.
     */
    restBars: z.number().optional(),
    /** A start-repeat barline opens this bar. */
    repeatStart: z.boolean().optional(),
    /** An end-repeat barline closes this bar. */
    repeatEnd: z.boolean().optional(),
    /**
     * Times the repeated passage is played in all. Defaults to the highest
     *  ending number in the passage, or 2.
     */
    repeatTimes: z.number().optional(),
    /**
     * Volta bracket over this bar: the passes that play it (`[1]`, `[2]`,
     *  `[1, 2]`). Neighbouring bars with the same passes share one bracket.
     */
    ending: z.array(z.number()).optional(),
    /** The segno a D.S. jumps back to. */
    segno: z.boolean().optional(),
    /** The coda sign: where "To Coda" lands on the pass after an al Coda jump. */
    coda: z.boolean().optional(),
    /** "To Coda" at the end of this bar, taken on the pass after the jump. */
    toCoda: z.boolean().optional(),
    /** Jump written at the end of this bar. */
    jump: roadmapJumpSchema.optional(),
    /** Fine: the song ends here on the pass after an al Fine jump. */
    fine: z.boolean().optional(),
    /**
     * Performance cue above the bar: 'Riff', 'Drum Fill', 'Piano Solo',
     *  'Break', 'Repeat and Fade'. Never lyrics.
     */
    cue: z.string().optional(),
    /**
     * The key changes at this bar, e.g. 'A♭ major'. Degrees from here on
     *  count from the new tonic. The song's own `key` stays the home key.
     */
    keyChange: z.string().optional(),
    /**
     * The metre changes at this bar, e.g. `[5, 4]`. Bars from here on are read
     * in it until another bar says otherwise; the song's own `timeSignature`
     * stays the home metre, the way `key` stays the home key.
     * Read it with `writtenBarMeters` — never off a single bar, since most bars
     * in a mixed-metre song carry no mark and inherit the one before.
     */
    timeSignature: z.tuple([z.number(), z.number()]).optional(),
    /**
     * This bar starts a new system, whatever the row width would otherwise say.
     * Not a roadmap mark — it changes where the chart breaks lines, not how it
     * is played — which is why `clearRoadmap` leaves it alone.
     */
    systemBreak: z.boolean().optional(),
    /**
     * This bar starts a system of exactly this many bars: "fit these into one
     * line", however many they are and whatever the row width says.
     * A break cannot express this on its own. Two breaks around a six-bar
     * phrase still give 4 + 2, because the line fills up and breaks itself
     * halfway through — the run is what suspends that.
     */
    systemRun: z.number().optional(),
  })
  .strict();

export const songSectionSchema = z
  .object({
    /** Unique section identifier: 'verse_1', 'chorus_1', 'bridge' */
    id: z.string(),
    /**
     * Display label, one of SECTION_NAMES with an optional number: 'Verse',
     *  'Verse 2', 'Pre-Chorus', 'Chorus'. Never a rehearsal letter.
     */
    label: z.string(),
    /**
     * Played without vocals: a small "Instrumental" beside the label.
     *  'first-time' when only the first pass is instrumental (a D.S. back to a
     *  verse that is sung the second time).
     */
    instrumental: z.union([z.boolean(), z.literal('first-time')]).optional(),
    /** Ordered bars in this section. */
    bars: z.array(chordBarSchema),
    /** How many times to repeat. Defaults to 1 if omitted. */
    repeatCount: z.number().optional(),
    /** Pedagogical note shown to student. NEVER lyrics. */
    notes: z.string().optional(),
    /**
     * Override measures per row for this section. Defaults to 4; leave unset
     *  unless a phrase genuinely reads better another way.
     */
    measuresPerRow: z.number().optional(),
  })
  .strict();

export const globeOriginSchema = z
  .object({
    /** Geographic region: 'San Francisco Bay Area', 'Detroit', 'New Orleans' */
    region: z.string().optional(),
    /** Country: 'USA', 'UK', 'Jamaica' */
    country: z.string().optional(),
    /** Era: '1970s', 'late_1970s_arena_rock' */
    era: z.string().optional(),
    /** Scene/movement: 'arena_rock', 'motown', 'manchester_post_punk' */
    scene: z.string().optional(),
    /** Stable Globe artist ID if the artist exists in the Globe data. */
    artistGlobeId: z.string().optional(),
  })
  .strict();

export const contentRefSchema = z
  .object({
    /** Which Music Atlas module this points to. */
    module: z.union([
      z.literal('theory'),
      z.literal('genre'),
      z.literal('globe'),
      z.literal('studio'),
    ]),
    topicId: z.string().optional(),
    genre: z.string().optional(),
    level: difficultyLevelSchema.optional(),
    stepNumber: z.number().optional(),
    globeRegion: z.string().optional(),
    globeEra: z.string().optional(),
    globeArtistId: z.string().optional(),
    globeSceneId: z.string().optional(),
    studioPreset: z.string().optional(),
    /** Human-readable label: 'Learn E Major', 'Explore Detroit' */
    displayLabel: z.string(),
    /** Categorizes the chip for ordering and styling. */
    refType: contentRefTypeSchema,
  })
  .strict();

export const audioSourceSchema = z
  .object({
    provider: audioProviderSchema,
    /** 'spotify:track:abc123' or 'https://youtube.com/watch?v=xyz' */
    uri: z.string(),
    /** Seconds into the recording where bar 1 begins. Defaults to 0. */
    startOffsetSec: z.number().optional(),
  })
  .strict();

/**
 * One name on the recording.
 * An ensemble is a credit like any other: session records routinely name the
 * group and not its players ("The Funk Brothers", "Detroit Symphony
 * Orchestra"), and inventing a roster to fill the gap would be worse than
 * saying what the label said.
 */
export const creditSchema = z
  .object({
    /** Display name: 'James Jamerson', 'The Funk Brothers'. */
    name: z.string(),
    role: creditRoleSchema,
    /** A `SESSION_INSTRUMENTS` id. Only meaningful for `performer`. */
    instrument: z.string().optional(),
    /** True when the name is a group rather than one person. */
    ensemble: z.boolean().optional(),
    /**
     * A billed artist on the record, not a sideman. `Song.artist` is the
     *  display line ("Marvin Gaye"); this marks everyone the label actually
     *  credited, which is how a duet gets both names into the constellation.
     */
    primary: z.boolean().optional(),
    /** Globe artist slug, when this name exists in the Globe's artist index. */
    artistGlobeId: z.string().optional(),
    /**
     * Set when this could not be pinned to a reliable source — renders muted
     *  and is excluded from the constellation until someone confirms it.
     */
    unverified: z.boolean().optional(),
  })
  .strict();

/**
 * Where, when and for whom the recording was made.
 * This is what "Motown in Detroit" actually decomposes into: a label, a studio
 * and a city, each of which is its own pill and its own point on the globe.
 */
export const recordingSessionSchema = z
  .object({
    /** Studio: 'Hitsville U.S.A.', 'Van Gelder Studio', 'Abbey Road'. */
    studio: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    /** Issuing label: 'Motown', 'Blue Note', 'Stax', 'Daptone'. */
    label: z.string().optional(),
    /** Recording year, when it differs from the release `year`. */
    recordedYear: z.number().optional(),
    unverified: z.boolean().optional(),
  })
  .strict();

/**
 * Another recording this one is tied to — a cover, an original, a sample.
 */
export const relatedRecordingSchema = z
  .object({
    /** This library's song id, when that recording is charted here too. */
    songId: z.string().optional(),
    artist: z.string(),
    year: z.number().optional(),
    relation: z.union([
      z.literal('original'),
      z.literal('cover'),
      z.literal('sample'),
      z.literal('interpolation'),
      z.literal('collaboration'),
    ]),
    artistGlobeId: z.string().optional(),
    unverified: z.boolean().optional(),
  })
  .strict();

export const songSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    artist: z.string(),
    /**
     * Songwriter credit when it isn't the performing artist ('Prince' for
     *  Sinéad O'Connor's Nothing Compares 2 U).
     */
    composer: z.string().optional(),
    year: z.number().optional(),
    key: z.string(),
    keyRoot: z.number(),
    mode: songModeSchema,
    tempo: z.number(),
    timeSignature: z.tuple([z.number(), z.number()]),
    difficulty: difficultyLevelSchema,
    genreTags: z.array(z.string()),
    techniques: z.array(z.string()),
    origin: globeOriginSchema.optional(),
    /**
     * Curated 2-3 sentence narrative for the Globe event card. Auto-generated
     *  by enrichSongDescriptions.mjs and round-tripped through this file so
     *  buildGlobeData.mjs can pick it up on regeneration.
     */
    historicalDescription: z.string().optional(),
    /** Everyone credited on this recording, players and non-players alike. */
    credits: z.array(creditSchema).optional(),
    /** Where it was cut, and on whose label. */
    session: recordingSessionSchema.optional(),
    /** Other recordings of this song, and records this one is tied to. */
    relatedRecordings: z.array(relatedRecordingSchema).optional(),
    /** Explicit overrides; resolver fills in the rest from metadata. */
    contentRefs: z.array(contentRefSchema).optional(),
    sections: z.array(songSectionSchema),
    audioSources: z.array(audioSourceSchema),
    artistImageSource: artistImageSourceSchema,
    artistImageRef: z.string().optional(),
    /** 0-100, optional. Manually set per song. Higher = more prominent in browse. */
    popularity: z.number().optional(),
  })
  .strict();

/** What a song body must satisfy. */
export const songBodySchema = songSchema;

export type SongBody = z.infer<typeof songBodySchema>;
