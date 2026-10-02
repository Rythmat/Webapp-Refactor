import type { Song } from '@/curriculum/types/songLibrary';

export const hot_n_cold: Song = {
  id: 'hot_n_cold',
  title: 'Hot N Cold',
  artist: 'Katy Perry',
  year: 2008,
  historicalDescription:
    "Katy Perry releases 'Hot N Cold' as the second single from her breakthrough album 'One of the Boys', cementing her arrival as a pop force to be reckoned with. The song's punchy, gender-battle lyrics and relentlessly hooky chorus make it a global hit, pushing Perry into the top tier of late-2000s pop — a moment when bubbly, guitar-driven pop-rock dominates the charts.",
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 130,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop', 'rock'],
  techniques: [],
  credits: [
    { name: 'Dr. Luke', role: 'producer', artistGlobeId: 'dr-luke' },
    { name: 'Nick Banns', role: 'engineer' },
    { name: 'Dr. Luke', role: 'performer', artistGlobeId: 'dr-luke' },
    { name: 'benny blanco', role: 'producer', artistGlobeId: 'benny-blanco' },
    {
      name: 'Dr. Luke',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'dr-luke',
    },
    { name: 'Tina Kennedy', role: 'engineer' },
    { name: 'Max Martin', role: 'songwriter', artistGlobeId: 'max-martin' },
    {
      name: 'benny blanco',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'benny-blanco',
    },
    { name: 'Serban Ghenea', role: 'engineer' },
    { name: 'Max Martin', role: 'performer', artistGlobeId: 'max-martin' },
    { name: 'Sam Holland', role: 'engineer' },
    {
      name: 'Dr. Luke',
      role: 'performer',
      instrument: 'electric-bass',
      artistGlobeId: 'dr-luke',
    },
    {
      name: 'Łukasz Gottwald',
      role: 'songwriter',
      artistGlobeId: 'ukasz-gottwald',
    },
    { name: 'Emily Wright', role: 'engineer' },
    { name: 'Tatiana Gottwald', role: 'engineer' },
    { name: 'Katy Perry', role: 'songwriter', artistGlobeId: 'katy-perry' },
    { name: 'John Hanes', role: 'engineer' },
    {
      name: 'Katy Perry',
      role: 'vocals',
      artistGlobeId: 'katy-perry',
      primary: true,
    },
  ],
  releases: [{ releaseId: 'katy-perry-one-of-the-boys', track: 7 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [{ chords: [], restBars: 2 }],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=kTHNpusq654' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/katy-perry.webp',
  popularity: 50,
};
