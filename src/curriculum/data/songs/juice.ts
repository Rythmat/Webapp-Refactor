import type { Song } from '@/curriculum/types/songLibrary';

export const juice: Song = {
  id: 'juice',
  title: 'Juice',
  artist: 'Lizzo',
  year: 2019,
  historicalDescription:
    "Lizzo releases 'Juice', a strutting, self-love anthem that channels the spirit of 1970s funk and 1980s pop into something boldly modern. The Minneapolis-raised artist's unapologetic confidence and genre-blending charisma announce her as a singular voice — one that will soon carry her to mainstream stardom and ignite a cultural conversation around body positivity and self-worth.",
  key: 'D minor',
  keyRoot: 62,
  mode: 'minor',
  tempo: 120,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk', 'pop'],
  techniques: [],
  credits: [
    { name: 'Jesse McGinty', role: 'performer' },
    { name: 'Lemar Guillary', role: 'performer', instrument: 'trombone' },
    {
      name: 'Nate Mercereau',
      role: 'performer',
      artistGlobeId: 'nate-mercereau',
    },
    { name: 'Ricky Reed', role: 'performer', artistGlobeId: 'ricky-reed' },
    { name: 'Ricky Reed', role: 'songwriter', artistGlobeId: 'ricky-reed' },
    {
      name: 'Theron Thomas',
      role: 'songwriter',
      artistGlobeId: 'theron-thomas',
    },
    { name: 'Bill Malina', role: 'engineer' },
    {
      name: 'Theron Thomas',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'theron-thomas',
    },
    { name: 'Rouble Kapoor', role: 'performer' },
    {
      name: 'Ricky Reed',
      role: 'performer',
      instrument: 'electric-bass',
      artistGlobeId: 'ricky-reed',
    },
    { name: 'Ethan Shumaker', role: 'engineer' },
    { name: 'Sam Sumser', role: 'songwriter', artistGlobeId: 'sam-sumser' },
    { name: 'Lizzo', role: 'vocals', artistGlobeId: 'lizzo', primary: true },
    {
      name: 'Nate Mercereau',
      role: 'producer',
      artistGlobeId: 'nate-mercereau',
    },
    { name: 'Lizzo', role: 'songwriter', artistGlobeId: 'lizzo' },
    { name: 'Victor Indrizzo', role: 'performer', instrument: 'percussion' },
    { name: 'Sean Small', role: 'songwriter', artistGlobeId: 'sean-small' },
    { name: 'Manny Marroquin', role: 'engineer' },
    { name: 'Quinn Wilson', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Asha Maura', role: 'performer', instrument: 'backing-vocals' },
    {
      name: 'Nate Mercereau',
      role: 'performer',
      instrument: 'electric-bass',
      artistGlobeId: 'nate-mercereau',
    },
    { name: 'Ricky Reed', role: 'producer', artistGlobeId: 'ricky-reed' },
    { name: 'Victor Indrizzo', role: 'performer', instrument: 'drum-kit' },
    { name: 'Mike Cordone', role: 'performer', instrument: 'trumpet' },
    { name: 'Shelby Swain', role: 'performer', instrument: 'backing-vocals' },
  ],
  releases: [{ releaseId: 'lizzo-cuz-i-love-you', track: 3 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        { chords: [], restBars: 8 },
        { chords: [], restBars: 8 },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'F7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'F7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'C7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'C7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'F7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'F7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'F7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'F7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'C7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'C7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'F7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'F7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'C7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'C7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'F7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'F7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'C7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'C7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'F7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'F7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'C7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'C7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      instrumental: true,
      bars: [{ chords: [], restBars: 8 }],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'F7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'F7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'C7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'C7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'F7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'F7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'C7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'C7', beat: 1, duration: 4 },
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
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'F7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'F7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'C7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=XaCrQL_8eMY' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/lizzo.webp',
  popularity: 50,
};
