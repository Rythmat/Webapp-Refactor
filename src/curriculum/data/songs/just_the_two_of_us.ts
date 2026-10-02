import type { Song } from '@/curriculum/types/songLibrary';

export const just_the_two_of_us: Song = {
  id: 'just_the_two_of_us',
  title: 'Just The Two Of Us',
  artist: 'Bill Withers',
  year: 1981,
  historicalDescription:
    "Bill Withers and Grover Washington Jr. release 'Just the Two of Us' in 1981, a warm, intimate blend of soul and smooth jazz that becomes an instant classic. The song's gentle groove and Withers' unassuming tenderness give it an enduring appeal — it is later sampled by Will Smith in 1998, introducing it to an entirely new generation.",
  key: 'F minor',
  keyRoot: 65,
  mode: 'minor',
  tempo: 96,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk', 'rnb'],
  techniques: [],
  session: { studioId: 'rosebud-recording-studio' },
  credits: [
    {
      name: 'Grover Washington, Jr.',
      role: 'producer',
      artistGlobeId: 'grover-washington-jr',
    },
    { name: 'William Eaton', role: 'arranger' },
    {
      name: 'Ralph MacDonald',
      role: 'songwriter',
      artistGlobeId: 'ralph-macdonald',
    },
    {
      name: 'Ralph MacDonald',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'ralph-macdonald',
    },
    {
      name: 'Bill Withers',
      role: 'vocals',
      primary: true,
      artistGlobeId: 'bill-withers',
    },
    { name: 'Steve Gadd', role: 'performer', instrument: 'drum-kit' },
    { name: 'William Eaton', role: 'performer', instrument: 'synthesizer' },
    {
      name: 'Bill Withers',
      role: 'performer',
      primary: true,
      artistGlobeId: 'bill-withers',
    },
    {
      name: 'Ralph MacDonald',
      role: 'producer',
      artistGlobeId: 'ralph-macdonald',
    },
    { name: 'Eric Gale', role: 'performer' },
    {
      name: 'Grover Washington, Jr.',
      role: 'performer',
      artistGlobeId: 'grover-washington-jr',
      primary: true,
    },
    { name: 'Bill Salter', role: 'songwriter', artistGlobeId: 'bill-salter' },
    { name: 'William Eaton', role: 'conductor' },
    { name: 'Richard Alderson', role: 'engineer' },
    { name: 'Bill Withers', role: 'songwriter', artistGlobeId: 'bill-withers' },
    { name: 'Marcus Miller', role: 'performer' },
    { name: 'Richard Tee', role: 'performer', instrument: 'fender-rhodes' },
  ],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        { chords: [], restBars: 4 },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'E♭min7', beat: 1, duration: 2 },
            { degree: '♭3 dom7', chordName: 'A♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'E♭min7', beat: 1, duration: 2 },
            { degree: '♭3 dom7', chordName: 'A♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'E♭min7', beat: 1, duration: 2 },
            { degree: '♭3 dom7', chordName: 'A♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 1 },
            { degree: '7 min7', chordName: 'Emin7', beat: 2, duration: 1 },
            { degree: '♭7 min7', chordName: 'E♭min7', beat: 3, duration: 1 },
            { degree: '♭3 dom7', chordName: 'A♭7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 1 },
            { degree: '7 min7', chordName: 'Emin7', beat: 2, duration: 1 },
            { degree: '♭7 min7', chordName: 'E♭min7', beat: 3, duration: 1 },
            { degree: '♭3 dom7', chordName: 'A♭7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯4 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭2 dom7', chordName: 'G♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯4 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭2 dom7', chordName: 'G♭7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'E♭min7', beat: 1, duration: 2 },
            { degree: '♭3 dom7', chordName: 'A♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'E♭min7', beat: 1, duration: 2 },
            { degree: '♭3 dom7', chordName: 'A♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'E♭min7', beat: 1, duration: 2 },
            { degree: '♭3 dom7', chordName: 'A♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 1 },
            { degree: '7 min7', chordName: 'Emin7', beat: 2, duration: 1 },
            { degree: '♭7 min7', chordName: 'E♭min7', beat: 3, duration: 1 },
            { degree: '♭3 dom7', chordName: 'A♭7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 1 },
            { degree: '7 min7', chordName: 'Emin7', beat: 2, duration: 1 },
            { degree: '♭7 min7', chordName: 'E♭min7', beat: 3, duration: 1 },
            { degree: '♭3 dom7', chordName: 'A♭7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=Uw5OLnN7UvM' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/bill-withers.webp',
  popularity: 50,
};
