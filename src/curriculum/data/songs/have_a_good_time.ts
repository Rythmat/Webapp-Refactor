import type { Song } from '@/curriculum/types/songLibrary';

export const have_a_good_time: Song = {
  id: 'have_a_good_time',
  title: 'Have A Good Time',
  artist: 'Brand New Heavies',
  year: 1994,
  historicalDescription:
    "The Brand New Heavies release 'Have A Good Time', a funk-driven track that embodies the London acid jazz and neo-soul movement of the early 1990s. The Heavies — pioneers of Britain's jazz-funk revival — bring a distinctly transatlantic sound, bridging the gap between classic American funk and a new generation of UK groove. Their influence ripples through the London scene and beyond.",
  key: 'E♭ minor',
  keyRoot: 63,
  mode: 'minor',
  tempo: 100,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk'],
  techniques: [],
  session: { studioId: 'westlake-recording-studios' },
  credits: [
    {
      name: 'Jan Kincaid',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'jan-kincaid',
    },
    {
      name: 'N’Dea Davenport',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'ndea-davenport',
    },
    { name: 'Eric Sarafin', role: 'engineer' },
    {
      name: 'Brand New Heavies',
      role: 'producer',
      ensemble: true,
      artistGlobeId: 'brand-new-heavies',
    },
    {
      name: 'Andrew Levy',
      role: 'performer',
      instrument: 'electric-bass',
      artistGlobeId: 'andrew-levy',
    },
    { name: 'Mike Boito', role: 'performer', instrument: 'backing-vocals' },
    {
      name: 'Jan Kincaid',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'jan-kincaid',
    },
    { name: 'Brady Blade', role: 'performer', instrument: 'backing-vocals' },
    {
      name: 'Brand New Heavies',
      role: 'engineer',
      ensemble: true,
      artistGlobeId: 'brand-new-heavies',
    },
    { name: 'Mike Boito', role: 'performer' },
    {
      name: 'Jan Kincaid',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'jan-kincaid',
    },
    { name: 'Ray Gaskins', role: 'performer' },
    {
      name: 'Simon Bartholomew',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'simon-bartholomew',
    },
    {
      name: 'Andrew Levy',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'andrew-levy',
    },
    {
      name: 'Simon Bartholomew',
      role: 'performer',
      artistGlobeId: 'simon-bartholomew',
    },
    {
      name: 'N’Dea Davenport',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'ndea-davenport',
    },
    { name: 'Yoyo', role: 'engineer' },
    { name: 'Ray Gaskins', role: 'performer', instrument: 'backing-vocals' },
    {
      name: 'Andrew Levy',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'andrew-levy',
    },
    {
      name: 'Simon Bartholomew',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'simon-bartholomew',
    },
  ],
  releases: [{ releaseId: 'brand-new-heavies-brother-sister', track: 1 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'interlude',
      label: 'Interlude',
      instrumental: true,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      instrumental: true,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=XJlCzHup1nQ' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/brand-new-heavies.webp',
  popularity: 50,
};
