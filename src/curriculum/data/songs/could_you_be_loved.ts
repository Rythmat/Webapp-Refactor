import type { Song } from '@/curriculum/types/songLibrary';

export const could_you_be_loved: Song = {
  id: 'could_you_be_loved',
  title: 'Could You Be Loved',
  artist: 'Bob Marley',
  year: 1980,
  historicalDescription:
    "Bob Marley releases 'Could You Be Loved' in 1980, one of his most danceable tracks — blending reggae with a driving funk rhythm that pushes the genre toward the dancefloor without losing its Rastafari soul. The song becomes one of his final singles before his death in 1981, cementing his legacy as an artist who could move bodies and minds in the same breath.",
  key: 'B minor',
  keyRoot: 71,
  mode: 'minor',
  tempo: 103,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk', 'reggae'],
  techniques: [],
  session: { studioId: 'tuff-gong-studios' },
  credits: [
    { name: 'Junior Marvin', role: 'performer', instrument: 'electric-guitar' },
    { name: 'Alvin “Seeco” Patterson', role: 'performer' },
    {
      name: 'Aston “Family Man” Barrett',
      role: 'performer',
      instrument: 'electric-bass',
    },
    {
      name: 'Alvin “Seeco” Patterson',
      role: 'performer',
      instrument: 'percussion',
    },
    {
      name: 'Bob Marley & The Wailers',
      role: 'producer',
      ensemble: true,
      artistGlobeId: 'bob-marley-and-the-wailers',
    },
    {
      name: 'Bob Marley',
      role: 'performer',
      instrument: 'electric-guitar',
      artistGlobeId: 'bob-marley',
      primary: true,
    },
    { name: 'Al Anderson', role: 'performer', instrument: 'electric-guitar' },
    {
      name: 'Alvin “Seeco” Patterson',
      role: 'performer',
      instrument: 'tambourine',
    },
    { name: 'Tyrone Downie', role: 'performer', instrument: 'backing-vocals' },
    {
      name: 'Earl “Wya” Lindo',
      role: 'performer',
      instrument: 'hammond-organ',
    },
    {
      name: 'Marcia Griffiths',
      role: 'performer',
      instrument: 'backing-vocals',
    },
    { name: 'Junior Marvin', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Judy Mowatt', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Earl “Wya” Lindo', role: 'performer', instrument: 'clavinet' },
    { name: 'Bob Marley', role: 'songwriter', artistGlobeId: 'bob-marley' },
    {
      name: 'Bob Marley & The Wailers',
      role: 'performer',
      ensemble: true,
      artistGlobeId: 'bob-marley-and-the-wailers',
    },
    { name: 'Rita Marley', role: 'performer', instrument: 'backing-vocals' },
    {
      name: 'Carlton “Carly” Barrett',
      role: 'performer',
      instrument: 'drum-kit',
    },
    {
      name: 'Bob Marley',
      role: 'vocals',
      artistGlobeId: 'bob-marley',
      primary: true,
    },
    { name: 'Chris Blackwell', role: 'engineer' },
    {
      name: 'Aston “Family Man” Barrett',
      role: 'performer',
      instrument: 'piano',
    },
    { name: 'The Wailers', role: 'engineer', ensemble: true },
    { name: 'Errol Brown', role: 'engineer' },
  ],
  releases: [{ releaseId: 'bob-marley-and-the-wailers-uprising', track: 8 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        { chords: [], restBars: 3 },
        { chords: [] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '5 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '5 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
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
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '5 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '5 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
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
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=1ti2YCFgCoI' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/bob-marley.webp',
  popularity: 50,
};
