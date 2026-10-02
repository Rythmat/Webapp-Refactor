import type { Song } from '@/curriculum/types/songLibrary';

/**
 * Don't Stop Believin' — Journey (1981)
 *
 * Full chord chart based on the original recording.
 * Key: E major | Tempo: 118 BPM | Time: 4/4
 */
export const dontStopBelievin: Song = {
  id: 'dont_stop_believin',
  title: "Don't Stop Believin'",
  artist: 'Journey',
  year: 1981,

  historicalDescription:
    "Journey releases 'Don't Stop Believin'' from their album Escape, anchoring the anthem in the working-class romanticism of small-town dreamers heading to the city. Steve Perry's soaring vocals and Jonathan Cain's opening piano riff become the defining sound of arena rock — massive, earnest, and impossible to ignore. Decades later, the song resurges through film, television, and stadiums, cementing its place as one of the best-selling digital singles in history.",
  key: 'E major',
  keyRoot: 64,
  mode: 'major',
  tempo: 118,
  timeSignature: [4, 4],

  difficulty: 1,
  genreTags: ['pop', 'rock'],
  techniques: ['eighth_note_chunking', 'basic_triads', 'chord_inversions'],
  session: { studioId: 'fantasy-studios' },
  credits: [
    {
      name: 'Ross Valory',
      role: 'performer',
      instrument: 'electric-bass',
      artistGlobeId: 'ross-valory',
    },
    {
      name: 'Jonathan Cain',
      role: 'performer',
      instrument: 'piano',
      artistGlobeId: 'jonathan-cain',
    },
    { name: 'Mike Stone', role: 'producer', artistGlobeId: 'mike-stone' },
    {
      name: 'Jonathan Cain',
      role: 'songwriter',
      artistGlobeId: 'jonathan-cain',
    },
    { name: 'Steve Perry', role: 'songwriter', artistGlobeId: 'steve-perry' },
    {
      name: 'Ross Valory',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'ross-valory',
    },
    { name: 'Neal Schon', role: 'songwriter', artistGlobeId: 'neal-schon' },
    { name: 'Neal Schon', role: 'performer', artistGlobeId: 'neal-schon' },
    {
      name: 'Jonathan Cain',
      role: 'performer',
      artistGlobeId: 'jonathan-cain',
    },
    {
      name: 'Steve Smith',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'steve-smith-us-drummer-most-associated-with-journey',
    },
    {
      name: 'Steve Smith',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'steve-smith-us-drummer-most-associated-with-journey',
    },
    { name: 'Kevin Elson', role: 'engineer', artistGlobeId: 'kevin-elson' },
    {
      name: 'Jonathan Cain',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'jonathan-cain',
    },
    { name: 'Steve Perry', role: 'vocals', artistGlobeId: 'steve-perry' },
    {
      name: 'Neal Schon',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'neal-schon',
    },
    { name: 'Kevin Elson', role: 'producer', artistGlobeId: 'kevin-elson' },
  ],
  releases: [{ releaseId: 'journey-escape' }],

  origin: {
    region: 'San Francisco Bay Area',
    country: 'USA',
    era: 'late_1970s_arena_rock',
    scene: 'arena_rock',
    artistGlobeId: 'journey',
  },

  contentRefs: [
    {
      module: 'studio',
      studioPreset: 'dont_stop_believin_jam',
      displayLabel: 'Jam in Studio',
      refType: 'studio_jam',
    },
  ],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'B/D♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '6 min', chordName: 'C♯m', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'B/D♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '6 min', chordName: 'C♯m', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'B/D♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '6 min', chordName: 'C♯m', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'B/D♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '6 min', chordName: 'C♯m', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '6 min', chordName: 'C♯m', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min', chordName: 'C♯m', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'B/D♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '6 min', chordName: 'C♯m', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'B/D♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '6 min', chordName: 'C♯m', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'B/D♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '6 min', chordName: 'C♯m', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '6 min', chordName: 'C♯m', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min', chordName: 'C♯m', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '6 min', chordName: 'C♯m', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
  ],
  audioSources: [
    { provider: 'spotify', uri: 'spotify:track:4bHsxqR3GMrXTxEPLuK5ue' },
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=1k8craCGpgs' },
  ],

  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/journey.webp',
  popularity: 95,
};
