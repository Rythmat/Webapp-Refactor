import type { Song } from '@/curriculum/types/songLibrary';

export const home_again: Song = {
  id: 'home_again',
  title: 'Home Again',
  artist: 'Carole King',
  year: 1971,
  historicalDescription:
    "Carole King performs 'Home Again' at the Platinum Jubilee Concert outside Buckingham Palace, bringing her signature warm piano-driven sound to a global audience of millions. The moment echoes the intimacy of her landmark 1971 album Tapestry — a rare live appearance from one of popular music's most enduring songwriters, whose influence spans generations of artists from James Taylor to Taylor Swift.",
  key: 'A major',
  keyRoot: 69,
  mode: 'major',
  tempo: 142,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['rock'],
  techniques: [],
  session: { studioId: 'a-m-studios' },
  credits: [
    {
      name: 'Carole King',
      role: 'vocals',
      artistGlobeId: 'carole-king',
      primary: true,
    },
    {
      name: 'Carole King',
      role: 'performer',
      instrument: 'piano',
      artistGlobeId: 'carole-king',
      primary: true,
    },
    {
      name: 'James Taylor',
      role: 'performer',
      instrument: 'acoustic-guitar',
      artistGlobeId: 'james-taylor',
    },
    { name: 'Carole King', role: 'songwriter', artistGlobeId: 'carole-king' },
    { name: 'Charles Larkey', role: 'performer', instrument: 'upright-bass' },
    { name: 'Russ Kunkel', role: 'performer', instrument: 'drum-kit' },
    { name: 'Lou Adler', role: 'producer', artistGlobeId: 'lou-adler' },
    { name: 'Hank Cicalo', role: 'engineer' },
  ],
  releases: [{ releaseId: 'carole-king-tapestry' }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'G/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'D/A', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'G/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'D/A', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'E/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'E/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'D/A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'A/C♯', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'D/A', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'E/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'E/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'D/A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'A/C♯', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'A/C♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 dom7', chordName: 'B7sus', beat: 1, duration: 2 },
            { degree: '2 dom7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/5', chordName: 'Bmin7/E', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'E7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'E/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'E/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'D/A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'A/C♯', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'G/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'D/A', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'G/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'D/A', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'E/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'E/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'D/A', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'D/A', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'E/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'E/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'D/A', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'A/C♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 dom7', chordName: 'B7sus', beat: 1, duration: 2 },
            { degree: '2 dom7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/5', chordName: 'Bmin7/E', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'E7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 5',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'E/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'E/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'A/C♯', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/5', chordName: 'D/E', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'D/A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'A/C♯', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/5', chordName: 'D/E', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'D/A', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'A/C♯', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/5', chordName: 'D/E', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'G/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'D/A', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'G/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'D/A', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'G/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'D/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=lNTjfaWnKIM' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/carole-king.webp',
  popularity: 50,
};
