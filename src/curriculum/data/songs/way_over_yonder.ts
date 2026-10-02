import type { Song } from '@/curriculum/types/songLibrary';

export const way_over_yonder: Song = {
  id: 'way_over_yonder',
  title: 'Way Over Yonder',
  artist: 'Carole King',
  year: 1971,
  historicalDescription:
    "Carole King releases 'Way Over Yonder' on her landmark album Tapestry, a soulful ballad rooted in gospel yearning and quiet spiritual longing. In a year when Tapestry rewrites the rules for singer-songwriters, the track stands as one of its most intimate moments — King's voice and piano stripped to their emotional core, proving that vulnerability itself can be a kind of mastery.",
  key: 'D♭ major',
  keyRoot: 61,
  mode: 'major',
  tempo: 88,
  timeSignature: [6, 8],

  difficulty: 3,
  genreTags: ['pop'],
  techniques: [],
  session: { studioId: 'a-m-studios' },
  credits: [
    { name: 'Terry King', role: 'performer', instrument: 'cello' },
    { name: 'Curtis Amy', role: 'performer', instrument: 'tenor-sax' },
    { name: 'Lou Adler', role: 'producer', artistGlobeId: 'lou-adler' },
    { name: 'Charles Larkey', role: 'performer', instrument: 'electric-bass' },
    {
      name: 'Carole King',
      role: 'vocals',
      artistGlobeId: 'carole-king',
      primary: true,
    },
    { name: 'Carole King', role: 'songwriter', artistGlobeId: 'carole-king' },
    { name: 'David Campbell', role: 'performer', instrument: 'viola' },
    {
      name: 'Danny Kortchmar',
      role: 'performer',
      instrument: 'electric-guitar',
    },
    {
      name: 'Carole King',
      role: 'performer',
      instrument: 'piano',
      artistGlobeId: 'carole-king',
      primary: true,
    },
    { name: 'Hank Cicalo', role: 'engineer' },
    { name: 'Merry Clayton', role: 'performer', instrument: 'backing-vocals' },
    {
      name: 'James Taylor',
      role: 'performer',
      instrument: 'acoustic-guitar',
      artistGlobeId: 'james-taylor',
    },
    { name: 'Perry Steinberg', role: 'performer', instrument: 'upright-bass' },
    { name: "Joel O'Brien", role: 'performer', instrument: 'drum-kit' },
    { name: 'Barry Socher', role: 'performer', instrument: 'violin' },
  ],
  releases: [{ releaseId: 'carole-king-tapestry' }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        { chords: [], restBars: 1 },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 6 },
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
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/5',
              chordName: 'E♭min7/A♭',
              beat: 1,
              duration: 6,
            },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 6 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '3 min7/6', chordName: 'Fmin7/B♭', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '3 min7/6', chordName: 'Fmin7/B♭', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/5',
              chordName: 'E♭min7/A♭',
              beat: 1,
              duration: 6,
            },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/5',
              chordName: 'E♭min7/A♭',
              beat: 1,
              duration: 6,
            },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            {
              degree: '2 min7/5',
              chordName: 'E♭min7/A♭',
              beat: 1,
              duration: 6,
            },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            {
              degree: '2 min7/5',
              chordName: 'E♭min7/A♭',
              beat: 1,
              duration: 6,
            },
          ],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 6 }],
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/5',
              chordName: 'E♭min7/A♭',
              beat: 1,
              duration: 6,
            },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 6 }],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '3 min7/6', chordName: 'Fmin7/B♭', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '3 min7/6', chordName: 'Fmin7/B♭', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'D♭/A♭', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'D♭/A♭', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/5',
              chordName: 'E♭min7/A♭',
              beat: 1,
              duration: 6,
            },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'D♭/F', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/5',
              chordName: 'E♭min7/A♭',
              beat: 1,
              duration: 6,
            },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 6 },
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
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/5',
              chordName: 'E♭min7/A♭',
              beat: 1,
              duration: 6,
            },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '3 min7/6', chordName: 'Fmin7/B♭', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '3 min7/6', chordName: 'Fmin7/B♭', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Cmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Cmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Fmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Fmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '6 dom7', chordName: 'B♭7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '6 dom7', chordName: 'B♭7', beat: 1, duration: 6 },
          ],
        },
      ],
    },
    {
      id: 'verse_6',
      label: 'Verse 6',
      bars: [
        {
          chords: [{ degree: '2 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Cmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Cmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Fmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Fmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '3 min7/6', chordName: 'Fmin7/B♭', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '♯4 min7/7', chordName: 'Gmin7/C', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '♯4 min7/7', chordName: 'Gmin7/C', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Fmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Fmin7', beat: 1, duration: 6 },
          ],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [
            { degree: '2 maj/6', chordName: 'E♭/B♭', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '3 min7/6', chordName: 'Fmin7/B♭', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'A♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '2 maj/♯4', chordName: 'E♭/G', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'Fmin7', beat: 2, duration: 1 },
            { degree: '3 min7/6', chordName: 'Fmin7/B♭', beat: 3, duration: 1 },
            { degree: '5 maj', chordName: 'A♭', beat: 4, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '2 maj/♯4', chordName: 'E♭/G', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '3 min7/6', chordName: 'Fmin7/B♭', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'E♭', beat: 1, duration: 6 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=G8se6T5d3K0' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/carole-king.webp',
  popularity: 50,
};
