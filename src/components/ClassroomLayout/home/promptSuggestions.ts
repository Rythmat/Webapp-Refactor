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
  route: `/studio/editor?${query}`,
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
  learn('Teach me the Aeolian mode', '/learn/aeolian'),
  learn('Teach me a C major scale on guitar', '/learn/guitar/ionian/c'),
  learn('Teach me Here Comes the Sun', '/songs/here_comes_the_sun'),
  learn('Teach me the chords to Lean On Me', '/songs/lean_on_me'),
  learn('Teach me Three Little Birds on piano', '/songs/three_little_birds'),
  learn('Teach me how Ain’t No Sunshine works', '/songs/aint_no_sunshine'),
  learn('Teach me the chords to Billie Jean', '/songs/billie_jean'),
  learn('Teach me Dreams by Fleetwood Mac', '/songs/dreams'),
  learn('Teach me a Taylor Swift song', '/songs/shake_it_off'),
  learn('Teach me Let’s Stay Together', '/songs/lets_stay_together'),
  learn('Teach me why Dorian sounds so cool', '/learn/dorian'),
  learn('Teach me the Mixolydian mode', '/learn/mixolydian'),
  learn('Teach me the minor pentatonic scale', '/learn/minorpentatonic'),
  learn('Teach me the blues scale', '/learn/minorblues'),
  learn('Teach me the Lydian mode in G', '/learn/lydian/g'),
  learn('Teach me how harmonic minor sounds', '/learn/harmonicminor'),
  learn('Teach me the Phrygian dominant scale', '/learn/phrygiandominant'),
  learn('Teach me relative major and minor', '/learn/relative/c'),
  learn('Teach me about parallel keys', '/learn/parallel/c'),
  learn('Teach me to read music', '/curriculum/music-literacy'),
  learn('Teach me how to play funk guitar', '/curriculum/funk'),
  learn('Teach me reggae rhythms', '/curriculum/reggae'),
  learn('Teach me the basics of hip-hop', '/curriculum/hip-hop'),
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
  learn('Teach me the major scale', '/learn/ionian'),
  learn('Teach me the Phrygian mode', '/learn/phrygian'),
  learn('Teach me the Locrian mode', '/learn/locrian'),
  learn('Teach me the major pentatonic scale', '/learn/majorpentatonic'),
  learn('Teach me the melodic minor scale', '/learn/melodicminor'),
  learn('Teach me the major blues scale', '/learn/majorblues'),
  learn('Teach me Dorian in D', '/learn/dorian/d'),
  learn('Teach me relative keys in G', '/learn/relative/g'),
  learn('Teach me a G major scale on guitar', '/learn/guitar/ionian/g'),
  learn(
    'Teach me an E minor pentatonic on guitar',
    '/learn/guitar/minorpentatonic/e',
  ),
  learn('Teach me jazz', '/curriculum/jazz'),
  learn('Teach me the blues', '/curriculum/blues'),
  learn('Teach me how to play R&B', '/curriculum/rnb'),
  learn('Teach me neo-soul', '/curriculum/neo-soul'),
  learn('Teach me Latin rhythms', '/curriculum/latin'),
  learn('Teach me how to play rock', '/curriculum/rock'),
  learn('Teach me how to play pop', '/curriculum/pop'),
  learn('Teach me folk music', '/curriculum/folk'),
  learn('Teach me African music', '/curriculum/african'),
  learn('Teach me electronic music', '/curriculum/electronic'),
  learn('Teach me jam band grooves', '/curriculum/jam-band'),
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

const ARCADE_SUGGESTIONS: PromptSuggestion[] = [
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
