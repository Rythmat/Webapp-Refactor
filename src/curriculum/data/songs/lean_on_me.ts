import type { Song } from '@/curriculum/types/songLibrary';

export const lean_on_me: Song = {
  id: 'lean_on_me',
  title: 'Lean On Me',
  artist: 'Bill Withers',
  year: 1972,
  historicalDescription:
    "Bill Withers re-releases 'Lean On Me' as the world rediscovers its message of communal strength and solidarity. Originally recorded in 1972, the song's simple gospel-rooted piano figure and unadorned vocals had already made it a soul classic — but its placement in the 1988 film 'Lean on Me' brings it back to the charts and a new generation. Few songs so effortlessly capture the idea that human beings need each other.",
  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 72,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rnb'],
  techniques: [],
  credits: [
    {
      name: 'Benorce Blackmon',
      role: 'producer',
      artistGlobeId: 'benorce-blackmon',
    },
    {
      name: 'Melvin Dunlap',
      role: 'performer',
      instrument: 'electric-bass',
      artistGlobeId: 'melvin-dunlap',
    },
    {
      name: 'James Gadson',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'james-gadson',
    },
    {
      name: 'Benorce Blackmon',
      role: 'performer',
      instrument: 'electric-guitar',
      artistGlobeId: 'benorce-blackmon',
    },
    {
      name: 'Bill Withers',
      role: 'performer',
      instrument: 'piano',
      artistGlobeId: 'bill-withers',
      primary: true,
    },
    { name: 'Melvin Dunlap', role: 'producer', artistGlobeId: 'melvin-dunlap' },
    { name: 'Bill Withers', role: 'producer', artistGlobeId: 'bill-withers' },
    { name: 'James Gadson', role: 'producer', artistGlobeId: 'james-gadson' },
    {
      name: 'Bill Withers',
      role: 'vocals',
      artistGlobeId: 'bill-withers',
      primary: true,
    },
    { name: 'Bill Withers', role: 'songwriter', artistGlobeId: 'bill-withers' },
    {
      name: 'Raymond Jackson',
      role: 'arranger',
      artistGlobeId: 'raymond-jackson',
    },
    {
      name: 'Raymond Jackson',
      role: 'performer',
      instrument: 'wurlitzer',
      artistGlobeId: 'raymond-jackson',
    },
    {
      name: 'Raymond Jackson',
      role: 'producer',
      artistGlobeId: 'raymond-jackson',
    },
    {
      name: 'James Gadson',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'james-gadson',
    },
  ],
  releases: [{ releaseId: 'bill-withers-still-bill' }],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '6 maj', chordName: 'A', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'C', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'Dmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'F', beat: 2, duration: 1 },
            { degree: '3 min7', chordName: 'Emin7', beat: 3, duration: 1 },
            { degree: '2 min7', chordName: 'Dmin7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'Dmin7', beat: 2, duration: 1 },
            { degree: '3 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'Dmin7', beat: 2, duration: 1 },
            { degree: '3 min7', chordName: 'Emin7', beat: 3, duration: 1 },
            { degree: '4 maj', chordName: 'F', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'Dmin7', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Dmin7', beat: 1, duration: 2 },
            { degree: '3 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'Dmin7', beat: 2, duration: 1 },
            { degree: '3 min7', chordName: 'Emin7', beat: 3, duration: 1 },
            { degree: '4 maj', chordName: 'F', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'Dmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'Dmin7', beat: 2, duration: 1 },
            { degree: '3 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'Dmin7', beat: 2, duration: 1 },
            { degree: '3 min7', chordName: 'Emin7', beat: 3, duration: 1 },
            { degree: '4 maj', chordName: 'F', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'Dmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'Dmin7', beat: 2, duration: 1 },
            { degree: '3 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'F/C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'F/C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'F/C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'F/C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=fOZ-MySzAac' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/bill-withers.webp',
  popularity: 50,
};
