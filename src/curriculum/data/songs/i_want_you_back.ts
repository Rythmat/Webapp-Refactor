import type { Song } from '@/curriculum/types/songLibrary';

export const i_want_you_back: Song = {
  id: 'i_want_you_back',
  title: 'I Want You Back',
  artist: 'The Jackson 5',
  year: 1969,
  historicalDescription:
    "The Jackson 5 burst onto the national stage with 'I Want You Back', a irresistible Motown debut featuring the electrifying vocals of eleven-year-old Michael Jackson. The song announces a new era for Berry Gordy's label, blending classic soul with a youthful energy that captivates a generation. It becomes one of the defining sounds of late 1960s pop.",
  key: 'A♭ major',
  keyRoot: 68,
  mode: 'major',
  tempo: 96,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rnb'],
  techniques: [],
  session: { studioId: 'the-sound-factory-west' },
  credits: [
    {
      name: 'Marlon Jackson',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'marlon-jackson',
    },
    {
      name: 'The Corporation',
      role: 'arranger',
      ensemble: true,
      artistGlobeId: 'the-corporation',
    },
    {
      name: 'Jackie Jackson',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'jackie-jackson',
    },
    {
      name: 'The Corporation',
      role: 'producer',
      ensemble: true,
      artistGlobeId: 'the-corporation',
    },
    { name: 'Sandra Crouch', role: 'performer', instrument: 'percussion' },
    {
      name: 'Michael Jackson',
      role: 'vocals',
      artistGlobeId: 'michael-jackson',
    },
    {
      name: 'Michael Jackson',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'michael-jackson',
    },
    {
      name: 'Tito Jackson',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'tito-jackson',
    },
    { name: 'Ronnie Rancifer', role: 'performer', instrument: 'piano' },
    { name: 'Jackie Jackson', role: 'vocals', artistGlobeId: 'jackie-jackson' },
    { name: 'Louie Shelton', role: 'performer' },
    { name: 'Wilton Felder', role: 'performer', instrument: 'electric-bass' },
    {
      name: 'Clarence McDonald',
      role: 'performer',
      artistGlobeId: 'clarence-mcdonald',
    },
    {
      name: 'Fonce Mizell',
      role: 'performer',
      instrument: 'piano',
      artistGlobeId: 'fonce-mizell',
    },
    { name: 'David T. Walker', role: 'performer' },
    {
      name: 'The Corporation',
      role: 'songwriter',
      ensemble: true,
      artistGlobeId: 'the-corporation',
    },
    { name: 'Tito Jackson', role: 'performer', artistGlobeId: 'tito-jackson' },
    { name: 'Joe Sample', role: 'performer', instrument: 'piano' },
    { name: 'Donald Peake', role: 'performer' },
    { name: 'Gene Pello', role: 'performer', instrument: 'drum-kit' },
    {
      name: 'Jermaine Jackson',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'jermaine-jackson',
    },
    {
      name: 'Keith Washington',
      role: 'performer',
      instrument: 'backing-vocals',
    },
    {
      name: 'Freddie Perren',
      role: 'performer',
      instrument: 'piano',
      artistGlobeId: 'freddie-perren',
    },
    { name: 'Johnny Jackson', role: 'performer', instrument: 'drum-kit' },
    { name: 'Ronnie Rancifer', role: 'performer' },
    {
      name: 'Marlon Jackson',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'marlon-jackson',
    },
  ],
  releases: [
    { releaseId: 'the-jackson-5-diana-ross-presents-the-jackson-5', track: 3 },
  ],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'B♭min7', beat: 2, duration: 1 },
            { degree: '5 dom7', chordName: 'E♭7', beat: 3, duration: 1 },
            { degree: '1 maj', chordName: 'A♭', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'B♭min7', beat: 2, duration: 1 },
            { degree: '5 dom7', chordName: 'E♭7', beat: 3, duration: 1 },
            { degree: '1 maj', chordName: 'A♭', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'E♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'D♭', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 1 },
            { degree: '5 dom7', chordName: 'E♭7', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'B♭min7', beat: 2, duration: 1 },
            { degree: '5 dom7', chordName: 'E♭7', beat: 3, duration: 1 },
            { degree: '1 maj', chordName: 'A♭', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'E♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'D♭', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 1 },
            { degree: '5 dom7', chordName: 'E♭7', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'E♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'D♭', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 1 },
            { degree: '5 dom7', chordName: 'E♭7', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        { chords: [] },
        { chords: [] },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'B♭min7', beat: 2, duration: 1 },
            { degree: '5 dom7', chordName: 'E♭7', beat: 3, duration: 1 },
            { degree: '1 maj', chordName: 'A♭', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'E♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'D♭', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 1 },
            { degree: '5 dom7', chordName: 'E♭7', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'E♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'D♭', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        { chords: [], restBars: 1 },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 5',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'Cmin7', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'D♭', beat: 3, duration: 1 },
            { degree: '1 maj', chordName: 'A♭', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'Cmin7', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'D♭', beat: 3, duration: 1 },
            { degree: '1 maj', chordName: 'A♭', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'E♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'D♭', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 1 },
            { degree: '5 dom7', chordName: 'E♭7', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
          restBars: 1,
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=y2bVIBwpCTA' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/the-jackson-5.webp',
  popularity: 50,
};
