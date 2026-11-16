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
      id: 'section_9',
      label: 'Intro',
      repeatCount: 2,
      bars: [
        {
          cue: 'Piano Only',
          chords: [{ degree: '1 maj', chordName: 'E5', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        {
          chords: [{ degree: '5 maj', chordName: 'B5', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj/6', chordName: 'E5/C♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 4 },
            { beat: 4, degree: '1 maj', duration: 4, chordName: '' },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E5', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'B5', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '3 min', chordName: 'G♯m', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 4 },
            { beat: 4, degree: '1 maj', duration: 4, chordName: '' },
          ],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'verse_1',
      bars: [
        {
          chords: [
            { beat: 1, degree: '1 maj', duration: 3, chordName: 'E5' },
            { degree: '1 maj', chordName: '', beat: 4, duration: 1 },
          ],
          repeatStart: true,
          cue: 'Vocals In',
        },
        {
          chords: [{ beat: 1, degree: '5 maj', duration: 4, chordName: 'B5' }],
        },
        {
          chords: [
            { beat: 1, degree: '1 maj/6', duration: 4, chordName: 'E5/C♯' },
          ],
        },
        { chords: [{ beat: 1, degree: '4 maj', duration: 4, chordName: 'A' }] },
        {
          chords: [{ beat: 1, degree: '1 maj', duration: 4, chordName: 'E5' }],
        },
        {
          chords: [{ beat: 1, degree: '5 maj', duration: 4, chordName: 'B5' }],
        },
        {
          chords: [{ beat: 1, degree: '3 min', duration: 4, chordName: 'G♯m' }],
        },
        {
          chords: [
            { beat: 1, degree: '4 maj', duration: 4, chordName: 'A' },
            { beat: 2, degree: '1 maj', duration: 4, chordName: '' },
          ],
          repeatEnd: true,
        },
      ],
      label: 'Verse 1 & 2',
      repeatCount: 2,
    },
    {
      id: 'section_10',
      bars: [
        {
          cue: 'Instrumental',
          chords: [{ beat: 1, degree: '1 maj', duration: 4, chordName: 'E5' }],
          rhythm: [
            { value: '4', plain: true, rest: true },
            { value: '4', plain: true },
            { value: '4', plain: true },
            { value: '4', plain: true },
          ],
        },
        {
          chords: [{ beat: 1, degree: '5 maj', duration: 4, chordName: 'B5' }],
        },
        {
          chords: [
            { beat: 1, degree: '1 maj/6', duration: 4, chordName: 'E5/C♯' },
          ],
        },
        { chords: [{ beat: 1, degree: '4 maj', duration: 4, chordName: 'A' }] },
        {
          chords: [{ beat: 1, degree: '1 maj', duration: 4, chordName: 'E' }],
        },
        {
          chords: [
            { beat: 1, degree: '5 maj/7', duration: 4, chordName: 'B/D♯' },
          ],
        },
        {
          chords: [{ beat: 1, degree: '3 min', duration: 4, chordName: 'G♯m' }],
          cue: 'Guitar Fill',
        },
        {
          chords: [
            { beat: 1, degree: '4 maj', duration: 3, chordName: 'A' },
            { degree: '1 maj', chordName: 'E5', beat: 4, duration: 0.5 },
            { degree: '1 maj', chordName: 'E5', beat: 4.5, duration: 0.5 },
          ],
          rhythm: [
            { value: '4', plain: true },
            { value: '4', plain: true },
            { value: '4', plain: true },
            { value: '8', stem: 'down' },
            { value: '8', stem: 'down', tie: true },
          ],
        },
      ],
      label: 'Instrumental Verse',
    },
    {
      id: 'section_11',
      bars: [
        {
          cue: 'Vocals In',
          chords: [{ beat: 1, degree: '1 maj', duration: 4, chordName: 'E5' }],
          rhythm: [
            { value: '4', plain: true, rest: true },
            { value: '4', plain: true },
            { value: '4', plain: true },
            { value: '4', plain: true },
          ],
        },
        {
          chords: [
            { beat: 1, degree: '5 maj', duration: 3, chordName: 'B5' },
            { degree: '1 maj', chordName: '', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { beat: 1, degree: '1 maj/6', duration: 4, chordName: 'E5/C♯' },
          ],
        },
        { chords: [{ beat: 1, degree: '4 maj', duration: 4, chordName: 'A' }] },
        {
          chords: [{ beat: 1, degree: '1 maj', duration: 4, chordName: 'E' }],
        },
        {
          chords: [
            { beat: 1, degree: '5 maj/7', duration: 4, chordName: 'B/D♯' },
          ],
        },
        {
          chords: [{ beat: 1, degree: '3 min', duration: 4, chordName: 'G♯m' }],
          cue: 'Drum Fill...',
        },
        {
          chords: [{ beat: 1, degree: '4 maj', duration: 3, chordName: 'A' }],
        },
      ],
      label: 'Verse 3',
    },
    {
      id: 'chorus_1',
      label: 'Pre-Chorus 1',
      bars: [
        {
          chords: [
            { degree: '5 maj/4', chordName: 'B/A', beat: 1, duration: 1.5 },
            { degree: '4 maj', chordName: 'A', beat: 2.5, duration: 2.5 },
          ],
          rhythm: [
            { value: '4', dot: true },
            { value: '8' },
            { value: '4', plain: true },
            { value: '4', plain: true },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '5 maj/4', chordName: 'B/A', beat: 1, duration: 1.5 },
            { degree: '1 maj/4', chordName: 'E/A', beat: 2.5, duration: 2.5 },
          ],
          rhythm: [
            { value: '4', dot: true },
            { value: '8' },
            { value: '4', plain: true },
            { value: '4', plain: true },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'B/E', beat: 1, duration: 1.5 },
            { degree: '1 maj', chordName: 'E', beat: 2.5, duration: 2.5 },
          ],
          rhythm: [
            { value: '4', dot: true },
            { value: '8' },
            { value: '4', plain: true },
            { value: '4', plain: true },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'B/E', beat: 1, duration: 1.5 },
            { degree: '1 maj', chordName: 'E', beat: 2.5, duration: 2.5 },
          ],
          rhythm: [
            { value: '4', dot: true },
            { value: '8' },
            { value: '4', plain: true },
            { value: '4', plain: true },
          ],
          repeatEnd: true,
          repeatTimes: 3,
        },
        {
          chords: [
            { beat: 1, degree: '5 maj/4', duration: 1.5, chordName: 'B/A' },
            { degree: '4 maj', chordName: 'A', beat: 2.5, duration: 2.5 },
          ],
          rhythm: [
            { value: '4', dot: true },
            { value: '8' },
            { value: '4', plain: true },
            { value: '4', plain: true },
          ],
        },
        {
          chords: [
            { beat: 1, degree: '5 maj/4', duration: 1.5, chordName: 'B/A' },
            { degree: '1 maj/4', chordName: 'E/A', beat: 2.5, duration: 2.5 },
          ],
          rhythm: [
            { value: '4', dot: true },
            { value: '8' },
            { value: '4', plain: true },
            { value: '4', plain: true },
          ],
        },
        {
          chords: [
            { beat: 1, degree: '5 maj', duration: 1.5, chordName: 'B' },
            { degree: '1 maj', chordName: 'Esus2', beat: 2.5, duration: 2.5 },
          ],
          rhythm: [
            { value: '4', dot: true },
            { value: '8', tie: true },
            { value: '4', plain: true },
            { value: '4', plain: true },
          ],
        },
        {
          chords: [
            { beat: 1, degree: '5 maj', duration: 1, chordName: 'B' },
            { degree: '1 maj', chordName: 'E', beat: 2, duration: 0.5 },
            { degree: '4 maj', chordName: 'A', beat: 2.5, duration: 1.5 },
            { degree: '1 maj', chordName: '', beat: 4, duration: 1 },
          ],
          rhythm: [
            { value: '4' },
            { value: '8' },
            { value: '8', tie: true },
            { value: '4', plain: true },
            { value: '4', plain: true },
          ],
        },
      ],
    },
    {
      id: 'section_12',
      bars: [
        {
          cue: 'Instrumental',
          chords: [{ beat: 1, degree: '1 maj', duration: 4, chordName: 'E5' }],
          rhythm: [
            { value: '4', plain: true, rest: true },
            { value: '4', plain: true },
            { value: '4', plain: true },
            { value: '4', plain: true },
          ],
        },
        {
          chords: [{ beat: 1, degree: '5 maj', duration: 4, chordName: 'B5' }],
        },
        {
          chords: [
            { beat: 1, degree: '1 maj/6', duration: 4, chordName: 'E5/C♯' },
          ],
        },
        {
          chords: [
            { beat: 1, degree: '4 maj', duration: 3, chordName: 'A' },
            { degree: '4 maj', chordName: 'A', beat: 4, duration: 0.5 },
            { degree: '1 maj', chordName: 'E', beat: 4.5, duration: 0.5 },
          ],
          rhythm: [
            { value: '4', plain: true },
            { value: '4', plain: true },
            { value: '4', plain: true },
            { value: '8', stem: 'down' },
            { value: '8', stem: 'down' },
          ],
        },
      ],
      label: 'Interlude',
    },
    {
      id: 'section_13',
      bars: [
        {
          cue: 'Instrumental',
          chords: [{ beat: 1, degree: '1 maj', duration: 4, chordName: 'E5' }],
          rhythm: [
            { value: '4', plain: true, rest: true },
            { value: '4', plain: true },
            { value: '4', plain: true },
            { value: '4', plain: true },
          ],
          repeatStart: true,
        },
        {
          chords: [{ beat: 1, degree: '5 maj', duration: 4, chordName: 'B5' }],
        },
        {
          chords: [
            { beat: 1, degree: '1 maj/6', duration: 4, chordName: 'E5/C♯' },
          ],
        },
        {
          chords: [
            { beat: 1, degree: '4 maj', duration: 3, chordName: 'A' },
            { degree: '4 maj', chordName: 'A', beat: 4, duration: 0.5 },
            { degree: '1 maj', chordName: 'E', beat: 4.5, duration: 0.5 },
          ],
          rhythm: [
            { value: '4', plain: true },
            { value: '4', plain: true },
            { value: '4', plain: true },
            { value: '8', stem: 'down' },
            { value: '8', stem: 'down' },
          ],
        },
        {
          chords: [{ beat: 1, degree: '1 maj', duration: 4, chordName: 'E' }],
        },
        {
          chords: [
            { beat: 1, degree: '5 maj/7', duration: 4, chordName: 'B/D♯' },
          ],
        },
        {
          chords: [{ beat: 1, degree: '3 min', duration: 4, chordName: 'G♯m' }],
        },
        {
          chords: [
            { beat: 1, degree: '4 maj', duration: 3, chordName: 'A' },
            { degree: '4 maj', chordName: 'A', beat: 4, duration: 0.5 },
            { degree: '1 maj', chordName: 'E', beat: 4.5, duration: 0.5 },
          ],
          rhythm: [
            { value: '4', plain: true },
            { value: '4', plain: true },
            { value: '4', plain: true },
            { value: '8', stem: 'down' },
            { value: '8', stem: 'down' },
          ],
          repeatEnd: true,
        },
      ],
      label: 'Verse 4 & 5',
      repeatCount: 2,
    },
    {
      id: 'chorus_14',
      bars: [
        {
          chords: [
            { beat: 1, degree: '5 maj/4', duration: 1.5, chordName: 'B/A' },
            { degree: '4 maj', chordName: 'A', beat: 2.5, duration: 2.5 },
          ],
          rhythm: [
            { value: '4', dot: true },
            { value: '8' },
            { value: '4', plain: true },
            { value: '4', plain: true },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { beat: 1, degree: '5 maj/4', duration: 1.5, chordName: 'B/A' },
            { degree: '1 maj/4', chordName: 'E/A', beat: 2.5, duration: 2.5 },
          ],
          rhythm: [
            { value: '4', dot: true },
            { value: '8' },
            { value: '4', plain: true },
            { value: '4', plain: true },
          ],
        },
        {
          chords: [
            { beat: 1, degree: '5 maj/1', duration: 1.5, chordName: 'B/E' },
            { degree: '1 maj', chordName: 'E', beat: 2.5, duration: 2.5 },
          ],
          rhythm: [
            { value: '4', dot: true },
            { value: '8' },
            { value: '4', plain: true },
            { value: '4', plain: true },
          ],
        },
        {
          chords: [
            { beat: 1, degree: '5 maj/1', duration: 1.5, chordName: 'B/E' },
            { degree: '1 maj', chordName: 'E', beat: 2.5, duration: 2.5 },
          ],
          rhythm: [
            { value: '4', dot: true },
            { value: '8' },
            { value: '4', plain: true },
            { value: '4', plain: true },
          ],
          repeatEnd: true,
          repeatTimes: 3,
        },
        {
          chords: [
            { beat: 1, degree: '5 maj/4', duration: 1.5, chordName: 'B/A' },
            { degree: '4 maj', chordName: 'A', beat: 2.5, duration: 2.5 },
          ],
          rhythm: [
            { value: '4', dot: true },
            { value: '8' },
            { value: '4', plain: true },
            { value: '4', plain: true },
          ],
        },
        {
          chords: [
            { beat: 1, degree: '5 maj/4', duration: 1.5, chordName: 'B/A' },
            { degree: '1 maj/4', chordName: 'E/A', beat: 2.5, duration: 2.5 },
          ],
          rhythm: [
            { value: '4', dot: true },
            { value: '8' },
            { value: '4', plain: true },
            { value: '4', plain: true },
          ],
        },
        {
          chords: [
            { beat: 1, degree: '5 maj', duration: 1.5, chordName: 'B' },
            { degree: '1 maj', chordName: 'Esus2', beat: 2.5, duration: 2.5 },
          ],
          rhythm: [
            { value: '4', dot: true },
            { value: '8', tie: true },
            { value: '4', plain: true },
            { value: '4', plain: true },
          ],
        },
        {
          chords: [
            { beat: 1, degree: '5 maj', duration: 1, chordName: 'B' },
            { degree: '1 maj', chordName: 'E', beat: 2, duration: 0.5 },
            { degree: '4 maj', chordName: 'A', beat: 2.5, duration: 1.5 },
            { degree: '1 maj', chordName: '', beat: 4, duration: 1 },
          ],
          rhythm: [
            { value: '4' },
            { value: '8' },
            { value: '8', tie: true },
            { value: '4', plain: true },
            { value: '4', plain: true },
          ],
        },
      ],
      label: 'Pre-Chorus 2',
    },
    {
      id: 'section_14',
      label: 'Instrumental Chorus',
      repeatCount: 1,
      bars: [
        {
          cue: 'Instrumental',
          chords: [{ degree: '1 maj', chordName: 'E5', beat: 1, duration: 4 }],
          rhythm: [
            { value: '4', plain: true, rest: true },
            { value: '4', plain: true },
            { value: '4', plain: true },
            { value: '4', plain: true },
          ],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'B5', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj/6', chordName: 'E5/C♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 3 },
            { degree: '4 maj', chordName: 'A', beat: 4, duration: 0.5 },
            { degree: '1 maj', chordName: 'E', beat: 4.5, duration: 0.5 },
          ],
          rhythm: [
            { value: '4', plain: true },
            { value: '4', plain: true },
            { value: '4', plain: true },
            { value: '8', stem: 'down' },
            { value: '8', stem: 'down' },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'B/D♯', beat: 1, duration: 3 },
            { degree: '1 maj', chordName: '', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [{ degree: '3 min', chordName: 'G♯m', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 3 },
            { degree: '4 maj', chordName: 'A', beat: 4, duration: 0.5 },
            { degree: '1 maj', chordName: 'E', beat: 4.5, duration: 0.5 },
          ],
          rhythm: [
            { value: '4', plain: true },
            { value: '4', plain: true },
            { value: '4', plain: true },
            { value: '8', stem: 'down' },
            { value: '8', stem: 'down' },
          ],
        },
      ],
    },
    {
      id: 'section_15',
      label: 'Chorus',
      repeatCount: 2,
      bars: [
        {
          cue: 'Vocals In',
          chords: [{ degree: '1 maj', chordName: 'E5', beat: 1, duration: 4 }],
          rhythm: [
            { value: '4', plain: true, rest: true },
            { value: '4', plain: true },
            { value: '4', plain: true },
            { value: '4', plain: true },
          ],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'B5', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj/6', chordName: 'E5/C♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 3 },
            { degree: '4 maj', chordName: 'A', beat: 4, duration: 0.5 },
            { degree: '1 maj', chordName: 'E', beat: 4.5, duration: 0.5 },
          ],
          rhythm: [
            { value: '4', plain: true },
            { value: '4', plain: true },
            { value: '4', plain: true },
            { value: '8', stem: 'down' },
            { value: '8', stem: 'down' },
          ],
        },
        { chords: [{ beat: 1, degree: '1 maj', duration: 4, chordName: 'E' }] },
        {
          chords: [
            { beat: 1, degree: '5 maj/7', duration: 3, chordName: 'B/D♯' },
            { degree: '1 maj', chordName: '', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [{ beat: 1, degree: '3 min', duration: 4, chordName: 'G♯m' }],
        },
        {
          chords: [
            { beat: 1, degree: '4 maj', duration: 3, chordName: 'A' },
            { degree: '4 maj', chordName: 'A', beat: 4, duration: 0.5 },
            { degree: '1 maj', chordName: 'E', beat: 4.5, duration: 0.5 },
          ],
          rhythm: [
            { value: '4', plain: true },
            { value: '4', plain: true },
            { value: '4', plain: true },
            { value: '8', stem: 'down' },
            { value: '8', stem: 'down' },
          ],
          cue: 'Repeat & Fade',
        },
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
