import type { LearnInstrument } from '@/features/learn/useInstrumentStore';

/**
 * Where a Home prompt goes. Placeholder for now: the bar only records the
 * target; routing into Studio / Learn / Globe / Arcade comes later, and each
 * suggestion already names the place in the app it opens (`route`).
 */
export type PromptTarget = 'studio' | 'learn' | 'globe' | 'arcade';

export interface PromptTargetInfo {
  id: PromptTarget;
  label: string;
  /** Same glyphs as the side rail. */
  iconSrc: string;
}

export const PROMPT_TARGETS: PromptTargetInfo[] = [
  {
    id: 'studio',
    label: 'Studio',
    iconSrc: '/icons/studio-icon.svg',
  },
  {
    id: 'learn',
    label: 'Learn',
    iconSrc: '/icons/learn-icon.svg',
  },
  {
    id: 'globe',
    label: 'Globe',
    iconSrc: '/icons/globe-icon.svg',
  },
  {
    id: 'arcade',
    label: 'Arcade',
    iconSrc: '/icons/arcade-icon.svg',
  },
];

export interface PromptSuggestion {
  text: string;
  target: PromptTarget;
  /**
   * The in-app path the suggestion opens once prompts are routed: a real
   * template, tutorial, song, lesson, globe view or game (the ids are checked
   * against the app's data in promptSuggestions.test.ts). The text can ask
   * for more than the place does (a key, a tempo); the route is where the
   * prompt lands, the text what it asks there.
   */
  route: string;
  /** What the app still lacks to do everything the text asks (PROMPT_NEEDS);
   *  absent when the route already does. */
  needs?: readonly PromptNeed[];
}

/**
 * What the app still has to build before the prompts that need it can be
 * shown. Since the 2026-10-23 audit (owner) the bar shows only prompts that
 * fully work, so no suggestion names a need today; this is the backlog of the
 * prompts held back. When a need ships, add its prompts back; a prompt that
 * still lands a little short can name its need here meanwhile.
 */
export const PROMPT_NEEDS = {
  'vocal-range': {
    area: 'Studio',
    build:
      'Find the singer’s comfortable range (sing a few notes), then open the song transposed. The `transpose` param already exists.',
  },
  'song-stems': {
    area: 'Studio',
    build:
      'Remixing the recording needs licensed stems. A song link builds its chord chart, not the record.',
  },
  'harmony-lessons': {
    area: 'Learn',
    build:
      'Chord-function lessons (ii–V–I, cadences, why a chord “resolves”). Theory covers modes and scales only.',
  },
  'song-breakdown': {
    area: 'Learn',
    build:
      'A song page breakdown of the groove: drums, bass line and how the parts lock. The page shows the chords.',
  },
  'songs-by-artist': {
    area: 'Learn',
    build:
      'The Songs tab filtered by artist from a link (`/learn?tab=Songs&artist=…`). Today the prompt opens one fixed song.',
  },
  'song-recommendations': {
    area: 'Learn',
    build:
      'Songs matched to the student’s level and progress (“this week”). The Songs tab lists everything.',
  },
  'game-presets': {
    area: 'Arcade',
    build:
      'Games that open with settings from the link (a scale, a chord set). No game reads its URL yet.',
  },
  'interval-game': {
    area: 'Arcade',
    build:
      'An interval ear-training mode. Constellations traces melodies; no game drills intervals.',
  },
  'circle-of-fifths-game': {
    area: 'Arcade',
    build:
      'A circle-of-fifths mode. Chord Connection builds progressions, not key-to-key moves.',
  },
  'song-analysis': {
    area: 'Studio',
    build:
      'Bring in the student’s own song (upload or record) and analyze it, for “make a lead sheet / sheet music / a better mix of my song”.',
  },
  'studio-lessons': {
    area: 'Studio',
    build:
      'The Studio lessons (`tutorial=`) re-anchored to the new Studio, for “make my first track”, “make a hip-hop beat from the kick up” and the rest.',
  },
} as const satisfies Record<string, { area: string; build: string }>;

export type PromptNeed = keyof typeof PROMPT_NEEDS;

const studio = (
  text: string,
  query: string,
  needs?: PromptNeed[],
): PromptSuggestion => ({
  text,
  target: 'studio',
  route: `/studio?${query}`,
  ...(needs && { needs }),
});
const learn = (
  text: string,
  route: string,
  needs?: PromptNeed[],
): PromptSuggestion => ({
  text,
  target: 'learn',
  route,
  ...(needs && { needs }),
});
const globe = (text: string, query: string): PromptSuggestion => ({
  text,
  target: 'globe',
  route: `/atlas/globe?${query}`,
});
const arcade = (
  text: string,
  game: string,
  needs?: PromptNeed[],
): PromptSuggestion => ({
  text,
  target: 'arcade',
  route: `/arcade/${game}`,
  ...(needs && { needs }),
});

/** A song idea the Studio builds from the suggestion's own words
 *  (features/promptSong): a console band over a progression for it. */
const songIdea = (text: string, needs?: PromptNeed[]) =>
  studio(text, `prompt=${encodeURIComponent(text)}`, needs);

/**
 * Only prompts that start something new (owner, 2026-10-23): a song idea the
 * Studio builds from the words, a starter template or a blank project. No
 * prompts about the student's own song (mixing it, scoring it, a lead sheet)
 * until a song can be brought in and analyzed, and none into the Studio
 * lessons until they're re-anchored to the new Studio.
 */
const STUDIO_SUGGESTIONS: PromptSuggestion[] = [
  songIdea('Make me a lo-fi beat in D minor'),
  songIdea('Make a funk groove at 100 BPM'),
  songIdea('Make a sad chord progression in A minor'),
  songIdea('Make a boom-bap hip-hop beat at 90 BPM'),
  songIdea('Make a trap beat in C minor'),
  songIdea('Make a house track at 124 BPM'),
  songIdea('Make a dark drum and bass track at 174 BPM'),
  songIdea('Make an energetic dance track at 128 BPM'),
  songIdea('Make a chill electronic track'),
  songIdea('Make a happy pop song in G major'),
  songIdea('Make a moody rock song in E minor'),
  songIdea('Make a fast punk song'),
  songIdea('Make a soulful R&B ballad'),
  songIdea('Make an uplifting gospel song'),
  songIdea('Make a neo-soul groove'),
  songIdea('Make a mellow jazz tune in F'),
  songIdea('Make a 12-bar blues'),
  songIdea('Make a dreamy folk song in D'),
  songIdea('Make a reggae one-drop groove'),
  songIdea('Make a bossa nova in A minor'),
  songIdea('Make a salsa groove in C'),
  songIdea('Make a reggaeton beat'),
  songIdea('Make an Afrobeat groove'),
  songIdea('Make a lo-fi study beat at 75 BPM'),
  songIdea('Make a trap beat at 140 BPM'),
  songIdea('Make a jazzy hip-hop beat'),
  songIdea('Make a confident hip-hop track in F minor'),
  songIdea('Make a disco track at 120 BPM'),
  songIdea('Make a spooky electronic track in F minor'),
  songIdea('Make a summer pop song at 110 BPM'),
  songIdea('Make a hopeful pop anthem'),
  songIdea('Make a sad piano ballad in C minor'),
  songIdea('Make an angry rock song in D minor'),
  songIdea('Make a rock jam in A Mixolydian'),
  songIdea('Make a melancholy indie song'),
  songIdea('Make a romantic R&B slow jam in E flat'),
  songIdea('Make a gospel ballad in A flat'),
  songIdea('Make a smooth neo-soul jam in D flat'),
  songIdea('Make a funk jam in E Dorian'),
  songIdea('Make a swing jazz tune'),
  songIdea('Make a slow blues in E'),
  songIdea('Make a bluesy shuffle in G'),
  songIdea('Make a peaceful folk song in G'),
  songIdea('Make a country song in G'),
  songIdea('Make a dub reggae groove'),
  songIdea('Make a bouncy reggae song in A'),
  songIdea('Make a cumbia track'),
  songIdea('Make a merengue groove'),
  songIdea('Make a laid-back jam band groove'),
  studio(
    'Make a rock song with drums, bass and guitar',
    'template=project-rock',
  ),
  studio('Make a slow R&B jam', 'template=project-rnb'),
  studio('Make a pop song from scratch', 'template=project-pop'),
  studio('Make an indie track with a driving beat', 'template=project-indie'),
  studio('Make a new song from a blank project', 'new=1'),
];

const LEARN_SUGGESTIONS: PromptSuggestion[] = [
  learn('Teach me the chords to a Beatles song', '/songs/come_together'),
  learn('Teach me the Aeolian mode', '/learn/keyboard/aeolian'),
  learn('Teach me a C major scale on guitar', '/learn/guitar/ionian/c'),
  learn('Teach me Here Comes the Sun', '/songs/here_comes_the_sun'),
  learn('Teach me the chords to Lean On Me', '/songs/lean_on_me'),
  learn('Teach me Three Little Birds on piano', '/songs/three_little_birds'),
  learn('Teach me how Ain’t No Sunshine works', '/songs/aint_no_sunshine'),
  learn('Teach me the chords to Billie Jean', '/songs/billie_jean'),
  learn('Teach me Dreams by Fleetwood Mac', '/songs/dreams'),
  learn('Teach me a Taylor Swift song', '/songs/shake_it_off'),
  learn('Teach me Let’s Stay Together', '/songs/lets_stay_together'),
  learn('Teach me why Dorian sounds so cool', '/learn/keyboard/dorian'),
  learn('Teach me the Mixolydian mode', '/learn/keyboard/mixolydian'),
  learn(
    'Teach me the minor pentatonic scale',
    '/learn/keyboard/minorpentatonic',
  ),
  learn('Teach me the blues scale', '/learn/keyboard/minorblues'),
  learn('Teach me the Lydian mode in G', '/learn/keyboard/lydian/g'),
  learn('Teach me how harmonic minor sounds', '/learn/keyboard/harmonicminor'),
  learn(
    'Teach me the Phrygian dominant scale',
    '/learn/keyboard/phrygiandominant',
  ),
  learn('Teach me relative major and minor', '/learn/keyboard/relative/c'),
  learn('Teach me about parallel keys', '/learn/keyboard/parallel/c'),
  learn('Teach me to read music', '/curriculum/music-literacy'),
  learn('Teach me how to play funk guitar', '/learn/keyboard/genre/funk'),
  learn('Teach me reggae rhythms', '/learn/keyboard/genre/reggae'),
  learn('Teach me the basics of hip-hop', '/learn/keyboard/genre/hip-hop'),
  learn('Teach me piano from the very beginning', '/learn?tab=StartHere'),
  learn('Teach me a song from the song library', '/learn?tab=Songs'),
  learn('Teach me scales from around the world', '/learn?tab=WorldHarmony'),
  learn('Teach me Hey Jude', '/songs/hey_jude'),
  learn('Teach me Isn’t She Lovely', '/songs/isnt_she_lovely'),
  learn('Teach me Jolene', '/songs/jolene'),
  learn('Teach me Dancing Queen', '/songs/dancing_queen'),
  learn('Teach me Africa by Toto', '/songs/africa'),
  learn('Teach me Blackbird', '/songs/blackbird'),
  learn(
    'Teach me Can’t Help Falling in Love',
    '/songs/cant_help_falling_in_love',
  ),
  learn('Teach me Hit the Road Jack', '/songs/hit_the_road_jack'),
  learn('Teach me Just the Two of Us', '/songs/just_the_two_of_us'),
  learn('Teach me I’m Yours', '/songs/im_yours'),
  learn('Teach me Brown Eyed Girl', '/songs/brown_eyed_girl'),
  learn('Teach me Don’t Stop Believin’', '/songs/dont_stop_believin'),
  learn('Teach me Killing Me Softly', '/songs/killing_me_softly_flack'),
  learn('Teach me I Will Survive', '/songs/i_will_survive'),
  learn('Teach me the major scale', '/learn/keyboard/ionian'),
  learn('Teach me the Phrygian mode', '/learn/keyboard/phrygian'),
  learn('Teach me the Locrian mode', '/learn/keyboard/locrian'),
  learn(
    'Teach me the major pentatonic scale',
    '/learn/keyboard/majorpentatonic',
  ),
  learn('Teach me the melodic minor scale', '/learn/keyboard/melodicminor'),
  learn('Teach me the major blues scale', '/learn/keyboard/majorblues'),
  learn('Teach me Dorian in D', '/learn/keyboard/dorian/d'),
  learn('Teach me relative keys in G', '/learn/keyboard/relative/g'),
  learn('Teach me a G major scale on guitar', '/learn/guitar/ionian/g'),
  learn(
    'Teach me an E minor pentatonic on guitar',
    '/learn/guitar/minorpentatonic/e',
  ),
  learn('Teach me jazz', '/learn/keyboard/genre/jazz'),
  learn('Teach me the blues', '/learn/keyboard/genre/blues'),
  learn('Teach me how to play R&B', '/learn/keyboard/genre/rnb'),
  learn('Teach me neo-soul', '/learn/keyboard/genre/neo-soul'),
  learn('Teach me Latin rhythms', '/learn/keyboard/genre/latin'),
  learn('Teach me how to play rock', '/learn/keyboard/genre/rock'),
  learn('Teach me how to play pop', '/learn/keyboard/genre/pop'),
  learn('Teach me folk music', '/learn/keyboard/genre/folk'),
  learn('Teach me African music', '/learn/keyboard/genre/african'),
  learn('Teach me electronic music', '/learn/keyboard/genre/electronic'),
  learn('Teach me jam band grooves', '/learn/keyboard/genre/jam-band'),
  learn('Teach me piano technique', '/learn?tab=Technique'),
  learn('Teach me a new genre', '/learn?tab=Genre'),
];

const GLOBE_SUGGESTIONS: PromptSuggestion[] = [
  globe('How did reggae begin?', 'pathway=roots-of-reggae'),
  globe(
    'Show me the music of 1960s Brazil',
    'open=americas,south-america&from=1960&to=1969',
  ),
  globe(
    'Show me the blues from the Delta to Chicago',
    'pathway=blues-family-tree',
  ),
  globe('How did hip-hop start in the Bronx?', 'pathway=hiphop-diaspora'),
  globe(
    'Show me the British Invasion',
    'open=europe,north-europe&genres=rock&from=1962&to=1969',
  ),
  globe('Show me the roots of rock and roll', 'pathway=blues-to-rock'),
  globe('Show me the soul and funk of Detroit', 'genres=soul-funk&q=Detroit'),
  globe('How was salsa born?', 'pathway=cuban-son-circle'),
  globe('How did Afrobeat begin?', 'pathway=griot-to-afrobeats'),
  globe('How did electronic music begin?', 'pathway=electronic-evolution'),
  globe('Show me Bob Marley on the globe', 'artist=Bob%20Marley'),
  globe('Show me classical music in Vienna', 'genres=classical&q=Vienna'),
  globe('Show me the music of West Africa', 'tour=region-west-africa'),
  globe('Show me the music of East Asia', 'tour=region-east-asia'),
  globe('Show me the music of South Asia', 'tour=region-south-asia'),
  globe('Show me the music of the Middle East', 'tour=region-west-asia'),
  globe('Show me the music of Southern Africa', 'tour=region-south-africa'),
  globe('Show me the music of Oceania', 'tour=region-oceania'),
  globe('Show me the history of jazz', 'view=timeline&genres=blues-jazz'),
  globe('Show me music in the 1970s', 'view=timeline&from=1970&to=1979'),
  globe('Show me ancient and medieval music', 'era=ancient'),
  globe('Show me the Renaissance and Baroque', 'era=renaissance'),
  globe('Show me music from postwar Europe', 'open=europe&era=postwar'),
  globe('Show me music in the digital age', 'era=global-digital'),
  globe('Show me the instruments of the world', 'lens=instruments'),
  globe('Show me the paths music traveled', 'lens=pathways'),
  globe('How did K-pop rise?', 'pathway=kpop-rise'),
  globe('How did punk spread around the world?', 'pathway=punk-shockwave'),
  globe('How did Congolese rumba travel?', 'pathway=congolese-rumba'),
  globe(
    'How did music travel from Baghdad to Spain?',
    'pathway=baghdad-to-al-andalus',
  ),
  globe('Show me the voices of the Andes', 'pathway=andean-voices'),
  globe('How did soul grow out of the church?', 'pathway=sacred-to-soul'),
  globe('Show me the UK underground', 'pathway=uk-underground'),
  globe('How did Jamaican riddims branch out?', 'pathway=jamaican-riddim'),
  globe('Show me the chain of jazz greats', 'pathway=jazz-chain'),
  globe('How did soul turn into funk and disco?', 'pathway=soul-funk-disco'),
  globe('Show me the story of Brazilian music', 'pathway=brazilian-thread'),
  globe('How did Arabic maqam become mahraganat?', 'pathway=maqam-mahraganat'),
  globe('How did griots lead to hip-hop?', 'pathway=griot-to-hiphop'),
  globe('How did Afro-Cuban rhythms spread?', 'pathway=afro-cuban-currents'),
  globe('Show me the Classical and Romantic eras', 'era=classical-romantic'),
  globe('Show me the Early Modern era of music', 'era=early-modern'),
  globe(
    'Show me the rise of electronic music and hip-hop',
    'era=electronic-hiphop',
  ),
  globe('Show me the history of hip-hop', 'view=timeline&genres=hip-hop'),
  globe('Show me the history of rock', 'view=timeline&genres=rock'),
  globe(
    'Show me the history of electronic music',
    'view=timeline&genres=electronic',
  ),
  globe(
    'Show me the history of Latin music',
    'view=timeline&genres=latin-caribbean',
  ),
  globe('Show me music in the 1950s', 'view=timeline&from=1950&to=1959'),
  globe('Show me music in the 1990s', 'view=timeline&from=1990&to=1999'),
  globe('Show me the music of East Africa', 'tour=region-east-africa'),
  globe('Show me the music of North Africa', 'tour=region-north-africa'),
  globe('Show me the music of Central Africa', 'tour=region-central-africa'),
  globe('Show me the music of Southeast Asia', 'tour=region-southeast-asia'),
  globe('Show me the music of Central Asia', 'tour=region-central-asia'),
  globe('Show me the music of Eastern Europe', 'tour=region-east-europe'),
  globe('Show me the music of Central America', 'tour=region-central-america'),
  globe('Show me where Fela Kuti made his music', 'artist=Fela%20Kuti'),
  globe('Show me Aretha Franklin on the globe', 'artist=Aretha%20Franklin'),
  globe('Show me Celia Cruz on the globe', 'artist=Celia%20Cruz'),
  globe('Show me Edith Piaf on the globe', 'artist=Edith%20Piaf'),
];

/** The Arcade's games, one prompt each way in (the Arcade page's bar too). */
export const ARCADE_SUGGESTIONS: PromptSuggestion[] = [
  arcade('Play a scales and modes game', 'major-arcanum'),
  arcade('Play a rhythm game with me', 'foli'),
  arcade('Play a challenge on every mode', 'major-arcanum'),
  arcade('Play a pitch-matching game', 'chroma'),
  arcade('Play a melody-tracing game', 'constellations'),
  arcade('Play a tune back by ear', 'echo'),
  arcade('Play against the Echo Boss', 'echo'),
  arcade('Play a speed round naming chords', 'board-choice'),
  arcade('Play chord voicings against the clock', 'chord-press'),
  arcade('Play a chord progression puzzle', 'chord-connection'),
  arcade('Play call-and-response drums', 'foli'),
  arcade('Play a beat until it sits in the pocket', 'groove-lab'),
  arcade('Play a sound-wave matching game', 'wave-sculptor'),
  arcade('Play with the overtone series', 'harmonic-strings'),
  arcade('Play the signal chain game', 'signal-flow'),
  arcade('Play live with my friends', 'jam'),
  arcade('Play in the Jam Room', 'jam'),
  arcade('Play along with a song', 'play-along'),
  arcade('Play a quick ear-training warm-up', 'chroma'),
  arcade('Play a chord-naming game', 'board-choice'),
  arcade('Play a game that builds chord progressions', 'chord-connection'),
  arcade('Play a scale-finding game on the piano', 'major-arcanum'),
  arcade('Play a steady groove with me', 'groove-lab'),
  arcade('Play with synth sound waves', 'wave-sculptor'),
  arcade('Play a quick music game', 'chord-press'),
  arcade('Play a mode-matching game on the keyboard', 'major-arcanum'),
  arcade('Play a percussion call-and-response game', 'foli'),
  arcade('Play a color-matching pitch game', 'chroma'),
  arcade('Play a star-tracing melody game', 'constellations'),
  arcade('Play an echo-the-tune game', 'echo'),
  arcade('Play a drum programming game', 'groove-lab'),
  arcade('Play an oscillator-matching game', 'wave-sculptor'),
  arcade('Play a harmonics game on strings', 'harmonic-strings'),
  arcade('Play a sound-routing puzzle', 'signal-flow'),
];

/** Every suggestion, interleaved Studio · Learn · Globe · Arcade, so the mix
 *  reads at a glance. */
export const PROMPT_SUGGESTIONS: PromptSuggestion[] = interleave([
  STUDIO_SUGGESTIONS,
  LEARN_SUGGESTIONS,
  GLOBE_SUGGESTIONS,
  ARCADE_SUGGESTIONS,
]);

function interleave<T>(lists: T[][]): T[] {
  const out: T[] = [];
  const longest = Math.max(...lists.map((l) => l.length));
  for (let i = 0; i < longest; i++) {
    for (const list of lists) if (i < list.length) out.push(list[i]);
  }
  return out;
}

function shuffled<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const suggestionsFor = (target: PromptTarget | null) =>
  target
    ? PROMPT_SUGGESTIONS.filter((s) => s.target === target)
    : PROMPT_SUGGESTIONS;

/**
 * The bar's rotation: a target's suggestions in a random order, or all of
 * them shuffled within each target and still interleaved, so every visit
 * opens on different ones.
 */
export const rotationFor = (target: PromptTarget | null) =>
  target
    ? shuffled(suggestionsFor(target))
    : interleave(PROMPT_TARGETS.map((t) => shuffled(suggestionsFor(t.id))));

/**
 * The Learn page's bar, on keyboard (owner, 2026-10-24): only keyboard
 * prompts, each naming the piano or keyboard. Theory lessons, piano songs,
 * the courses taught at the keys, a piano song idea and the keyboard games;
 * no `/learn?tab=` routes, since those land on the Learn page itself.
 */
export const KEYBOARD_SUGGESTIONS: PromptSuggestion[] = [
  learn('Teach me the C major scale on piano', '/learn/keyboard/ionian/c'),
  learn('Teach me a G major scale on the keyboard', '/learn/keyboard/ionian/g'),
  learn('Teach me the Dorian mode on piano', '/learn/keyboard/dorian'),
  learn('Teach me D Dorian on the keyboard', '/learn/keyboard/dorian/d'),
  learn('Teach me the Mixolydian mode on piano', '/learn/keyboard/mixolydian'),
  learn('Teach me the Lydian mode in G on piano', '/learn/keyboard/lydian/g'),
  learn('Teach me the Aeolian mode on the keyboard', '/learn/keyboard/aeolian'),
  learn('Teach me the Phrygian mode on piano', '/learn/keyboard/phrygian'),
  learn('Teach me the Locrian mode on the keyboard', '/learn/keyboard/locrian'),
  learn(
    'Teach me the minor pentatonic on piano',
    '/learn/keyboard/minorpentatonic',
  ),
  learn(
    'Teach me the major pentatonic on the keyboard',
    '/learn/keyboard/majorpentatonic',
  ),
  learn('Teach me the blues scale on piano', '/learn/keyboard/minorblues'),
  learn(
    'Teach me the major blues scale on piano',
    '/learn/keyboard/majorblues',
  ),
  learn(
    'Teach me harmonic minor on the keyboard',
    '/learn/keyboard/harmonicminor',
  ),
  learn('Teach me melodic minor on piano', '/learn/keyboard/melodicminor'),
  learn(
    'Teach me the Phrygian dominant scale on piano',
    '/learn/keyboard/phrygiandominant',
  ),
  learn(
    'Teach me relative major and minor on piano',
    '/learn/keyboard/relative/c',
  ),
  learn('Teach me parallel keys on the keyboard', '/learn/keyboard/parallel/c'),
  learn('Teach me to read music at the piano', '/curriculum/music-literacy'),
  learn('Teach me Three Little Birds on piano', '/songs/three_little_birds'),
  learn('Teach me Lean On Me on piano', '/songs/lean_on_me'),
  learn('Teach me Isn’t She Lovely on the keyboard', '/songs/isnt_she_lovely'),
  learn('Teach me Just the Two of Us on piano', '/songs/just_the_two_of_us'),
  learn('Teach me Tiny Dancer on piano', '/songs/tiny_dancer'),
  learn('Teach me All of Me on piano', '/songs/all_of_me'),
  learn('Teach me Stand By Me on the keyboard', '/songs/stand_by_me'),
  learn('Teach me Superstition on the keyboard', '/songs/superstition'),
  learn('Teach me Hit the Road Jack on piano', '/songs/hit_the_road_jack'),
  learn('Teach me Ordinary People on piano', '/songs/ordinary_people'),
  learn('Teach me Hey Jude on piano', '/songs/hey_jude'),
  learn(
    'Teach me Can’t Help Falling in Love on piano',
    '/songs/cant_help_falling_in_love',
  ),
  learn(
    'Teach me Killing Me Softly on the keyboard',
    '/songs/killing_me_softly_flack',
  ),
  learn('Teach me jazz piano', '/learn/keyboard/genre/jazz'),
  learn('Teach me blues piano', '/learn/keyboard/genre/blues'),
  learn('Teach me neo-soul keys', '/learn/keyboard/genre/neo-soul'),
  learn('Teach me R&B keyboard', '/learn/keyboard/genre/rnb'),
  songIdea('Make a sad piano ballad in C minor'),
  arcade('Play a scale-finding game on the piano', 'major-arcanum'),
  arcade('Play a mode-matching game on the keyboard', 'major-arcanum'),
  arcade(
    'Play chord voicings on the keyboard against the clock',
    'chord-press',
  ),
];

/** A Theory lesson on guitar, and a song's chart taught on guitar. */
const guitarTheory = (text: string, mode: string, key?: string) =>
  learn(text, `/learn/guitar/${mode}${key ? `/${key}` : ''}`);
const guitarSong = (title: string, id: string) =>
  learn(`Teach me ${title} on guitar`, `/songs/${id}`);

/**
 * The Learn page's bar, on guitar (owner, 2026-10-24): only guitar prompts,
 * each naming the guitar. Theory on guitar (/learn/guitar/…), songs (their
 * chord charts draw guitar grips when guitar is chosen) and a guitar band in
 * the Studio. No genre courses: they teach at the keyboard.
 */
export const GUITAR_SUGGESTIONS: PromptSuggestion[] = [
  guitarTheory('Teach me a C major scale on guitar', 'ionian', 'c'),
  guitarTheory('Teach me a G major scale on guitar', 'ionian', 'g'),
  guitarTheory(
    'Teach me the E minor pentatonic on guitar',
    'minorpentatonic',
    'e',
  ),
  guitarTheory(
    'Teach me the A minor pentatonic on guitar',
    'minorpentatonic',
    'a',
  ),
  guitarTheory(
    'Teach me the G major pentatonic on guitar',
    'majorpentatonic',
    'g',
  ),
  guitarTheory('Teach me the A blues scale on guitar', 'minorblues', 'a'),
  guitarTheory('Teach me the major blues scale on guitar', 'majorblues'),
  guitarTheory('Teach me the Dorian mode on guitar', 'dorian'),
  guitarTheory('Teach me D Dorian on guitar', 'dorian', 'd'),
  guitarTheory('Teach me the Mixolydian mode on guitar', 'mixolydian'),
  guitarTheory('Teach me G Mixolydian on guitar', 'mixolydian', 'g'),
  guitarTheory('Teach me the Phrygian mode on guitar', 'phrygian'),
  guitarTheory('Teach me E Phrygian on guitar', 'phrygian', 'e'),
  guitarTheory('Teach me the Lydian mode on guitar', 'lydian'),
  guitarTheory('Teach me A Aeolian on guitar', 'aeolian', 'a'),
  guitarTheory('Teach me the Locrian mode on guitar', 'locrian'),
  guitarTheory('Teach me harmonic minor on guitar', 'harmonicminor'),
  guitarTheory('Teach me melodic minor on guitar', 'melodicminor'),
  guitarTheory(
    'Teach me the Phrygian dominant scale on guitar',
    'phrygiandominant',
  ),
  guitarSong('Wonderwall', 'wonderwall'),
  guitarSong('Free Fallin’', 'free_fallin'),
  guitarSong('Brown Eyed Girl', 'brown_eyed_girl'),
  guitarSong('I’m Yours', 'im_yours'),
  guitarSong('Wish You Were Here', 'wish_you_were_here'),
  guitarSong('Sweet Home Alabama', 'sweet_home_alabama'),
  guitarSong('Wagon Wheel', 'wagon_wheel'),
  guitarSong('Country Roads', 'take_me_home_country_roads'),
  guitarSong('Blackbird', 'blackbird'),
  guitarSong('Here Comes the Sun', 'here_comes_the_sun'),
  guitarSong('Seven Nation Army', 'seven_nation_army'),
  guitarSong('Sweet Child O’ Mine', 'sweet_child_o_mine'),
  guitarSong('Jolene', 'jolene'),
  guitarSong('Stand By Me', 'stand_by_me'),
  guitarSong('Three Little Birds', 'three_little_birds'),
  guitarSong('Creep', 'creep'),
  guitarSong('Landslide', 'landslide'),
  guitarSong('Come Together', 'come_together'),
  guitarSong('Ring of Fire', 'ring_of_fire'),
  studio(
    'Make a rock song with drums, bass and guitar',
    'template=project-rock',
  ),
];

const bassTheory = (text: string, mode: string, key?: string) =>
  learn(text, `/learn/bass/${mode}${key ? `/${key}` : ''}`);

/** The Learn page's bar on bass: its Theory lessons (The Bass Atlas). */
export const BASS_SUGGESTIONS: PromptSuggestion[] = [
  bassTheory('Teach me a C major scale on bass', 'ionian', 'c'),
  bassTheory('Teach me a G major scale on bass', 'ionian', 'g'),
  bassTheory('Teach me the E minor pentatonic on bass', 'minorpentatonic', 'e'),
  bassTheory('Teach me the A minor pentatonic on bass', 'minorpentatonic', 'a'),
  bassTheory('Teach me the A blues scale on bass', 'minorblues', 'a'),
  bassTheory('Teach me D Dorian on bass', 'dorian', 'd'),
  bassTheory('Teach me G Mixolydian on bass', 'mixolydian', 'g'),
  bassTheory('Teach me A Aeolian on bass', 'aeolian', 'a'),
  bassTheory('Teach me harmonic minor on bass', 'harmonicminor'),
];

const ukuleleTheory = (text: string, mode: string, key?: string) =>
  learn(text, `/learn/ukulele/${mode}${key ? `/${key}` : ''}`);

/** The Learn page's bar on ukulele: its Theory lessons (The Ukulele Atlas). */
export const UKULELE_SUGGESTIONS: PromptSuggestion[] = [
  ukuleleTheory('Teach me a C major scale on ukulele', 'ionian', 'c'),
  ukuleleTheory('Teach me the chords in G major on ukulele', 'ionian', 'g'),
  ukuleleTheory('Teach me the F major chords on ukulele', 'ionian', 'f'),
  ukuleleTheory(
    'Teach me the A minor pentatonic on ukulele',
    'minorpentatonic',
    'a',
  ),
  ukuleleTheory('Teach me the C blues scale on ukulele', 'minorblues', 'c'),
  ukuleleTheory('Teach me D Dorian on ukulele', 'dorian', 'd'),
  ukuleleTheory('Teach me G Mixolydian on ukulele', 'mixolydian', 'g'),
  ukuleleTheory('Teach me A Aeolian on ukulele', 'aeolian', 'a'),
];

/** The Learn page bar's suggestions for an instrument. */
export const learnSuggestionsFor = (instrument: LearnInstrument) =>
  instrument === 'guitar'
    ? GUITAR_SUGGESTIONS
    : instrument === 'bass'
      ? BASS_SUGGESTIONS
      : instrument === 'ukulele'
        ? UKULELE_SUGGESTIONS
        : KEYBOARD_SUGGESTIONS;

/** A list's suggestions in a fresh random order, for a bar given its own. */
export const rotationOf = (suggestions: readonly PromptSuggestion[]) =>
  shuffled(suggestions);
