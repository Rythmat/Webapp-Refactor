import type { Song } from '@/curriculum/types/songLibrary';

export const tapestry: Song = {
  id: 'tapestry',
  title: 'Tapestry',
  artist: 'Carole King',
  year: 1971,
  historicalDescription:
    "Carole King releases 'Tapestry', a landmark album that reshapes the landscape of singer-songwriter pop. Recorded intimately in Los Angeles, it captures a deeply personal voice — a woman writing and performing her own truth at a time when that was still rare in mainstream music. The album spends over six years on the Billboard charts and becomes one of the best-selling records of all time.",
  key: 'F major',
  keyRoot: 65,
  mode: 'major',
  tempo: 128,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['pop'],
  techniques: [],
  session: { studioId: 'a-m-studios' },
  credits: [
    { name: 'Hank Cicalo', role: 'engineer' },
    { name: 'Lou Adler', role: 'producer', artistGlobeId: 'lou-adler' },
    {
      name: 'Carole King',
      role: 'performer',
      artistGlobeId: 'carole-king',
      primary: true,
    },
    {
      name: 'Carole King',
      role: 'vocals',
      artistGlobeId: 'carole-king',
      primary: true,
    },
    { name: 'Carole King', role: 'songwriter', artistGlobeId: 'carole-king' },
  ],
  releases: [{ releaseId: 'carole-king-tapestry' }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'Gmin7/F', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7/5', chordName: 'Gmin7/C', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7/6', chordName: 'Gmin7/D', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'C/E', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 dom7', chordName: 'C7sus', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 dom7', chordName: 'C7sus', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 dom7', chordName: 'C7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'B♭/F', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge_1',
      label: 'Bridge 1',
      bars: [
        {
          chords: [{ degree: '♭3 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭6 maj/♭3', chordName: 'D♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/♭3', chordName: 'E♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭3', chordName: 'D♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭6 maj/♭3', chordName: 'D♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/♭3', chordName: 'E♭/A♭', beat: 1, duration: 2 },
            { degree: '♭6 maj/♭3', chordName: 'D♭/A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 maj/5', chordName: 'G/C', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'F/C', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'C/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'C7sus', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 dom7', chordName: 'C7sus', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 dom7', chordName: 'C7sus', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 dom7', chordName: 'C7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'B♭/F', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge_2',
      label: 'Bridge 2',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
          keyChange: 'F♯ major',
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'B/F♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'B/F♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'B/F♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F♯', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'B/F♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 3',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'C♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'C♯', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'A♯min7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'G♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'C♯', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'C♯7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'C♯7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/5', chordName: 'B/C♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/5', chordName: 'B/C♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'B/F♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'B/F♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'F♯/C♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/5', chordName: 'B/C♯', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'C♯7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=aR5TO2YdjeY' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/carole-king.webp',
  popularity: 50,
};
