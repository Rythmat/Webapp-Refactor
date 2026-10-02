import type { Song } from '@/curriculum/types/songLibrary';

export const california_gurls: Song = {
  id: 'california_gurls',
  title: 'California Gurls',
  artist: 'Katy Perry',
  year: 2010,
  historicalDescription:
    "Katy Perry releases 'California Gurls' featuring Snoop Dogg, a sun-drenched pop anthem that captures the peak of California's cultural mythology. The track dominates radio in the summer of 2010, cementing Perry's status as a defining pop force of the era and sparking a friendly rivalry with Katy's label-mate's 'California Girls' legacy stretching back to the Beach Boys.",
  key: 'F major',
  keyRoot: 65,
  mode: 'major',
  tempo: 126,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop', 'rock'],
  techniques: [],
  session: { studioId: 'conway-recording-studios' },
  credits: [
    {
      name: 'Max Martin',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'max-martin',
    },
    { name: 'benny blanco', role: 'producer', artistGlobeId: 'benny-blanco' },
    {
      name: 'Katy Perry',
      role: 'vocals',
      primary: true,
      artistGlobeId: 'katy-perry',
    },
    {
      name: 'Calvin Broadus',
      role: 'songwriter',
      artistGlobeId: 'calvin-broadus',
    },
    { name: 'Dr. Luke', role: 'producer', artistGlobeId: 'dr-luke' },
    {
      name: 'benny blanco',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'benny-blanco',
    },
    { name: 'benny blanco', role: 'songwriter', artistGlobeId: 'benny-blanco' },
    { name: 'benny blanco', role: 'performer', artistGlobeId: 'benny-blanco' },
    { name: 'Emily Wright', role: 'engineer' },
    { name: 'Sam Holland', role: 'engineer' },
    {
      name: 'Dr. Luke',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'dr-luke',
    },
    { name: 'Max Martin', role: 'performer', artistGlobeId: 'max-martin' },
    { name: 'Bonnie McKee', role: 'songwriter', artistGlobeId: 'bonnie-mckee' },
    { name: 'Serban Ghenea', role: 'engineer' },
    { name: 'Max Martin', role: 'producer', artistGlobeId: 'max-martin' },
    {
      name: 'Łukasz Gottwald',
      role: 'songwriter',
      artistGlobeId: 'ukasz-gottwald',
    },
    {
      name: 'Snoop Dogg',
      role: 'vocals',
      primary: true,
      artistGlobeId: 'snoop-dogg',
    },
    { name: 'Katy Perry', role: 'songwriter', artistGlobeId: 'katy-perry' },
    { name: 'Dr. Luke', role: 'performer', artistGlobeId: 'dr-luke' },
    { name: 'Max Martin', role: 'songwriter', artistGlobeId: 'max-martin' },
    { name: 'Tamra Natisin', role: 'performer' },
    { name: 'John Hanes', role: 'engineer' },
  ],
  releases: [{ releaseId: 'katy-perry-teenage-dream' }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [{ chords: [], restBars: 4 }],
    },
    {
      id: 'verse_1',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus',
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=F57P9C4SAW4' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/katy-perry.webp',
  popularity: 50,
};
