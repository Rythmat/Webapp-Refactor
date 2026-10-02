import type { Song } from '@/curriculum/types/songLibrary';

export const take_on_me: Song = {
  id: 'take_on_me',
  title: 'Take On Me',
  artist: 'A-ha',
  year: 1984,
  historicalDescription:
    "Norwegian trio A-ha releases 'Take On Me', a synth-pop anthem that initially struggles to find an audience before a landmark rotoscope music video transforms it into a global phenomenon. The song's soaring falsetto hook and cascading synthesizer riff become defining sounds of 1980s pop — proof that a band from Oslo could conquer the world with the right melody and the right image.",
  key: 'A major',
  keyRoot: 69,
  mode: 'major',
  tempo: 168,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop', 'rock'],
  techniques: [],
  credits: [
    { name: 'a‐ha', role: 'engineer', ensemble: true, artistGlobeId: 'a-ha' },
    {
      name: 'Morten Harket',
      role: 'songwriter',
      artistGlobeId: 'morten-harket',
    },
    { name: 'John Ratcliff', role: 'engineer' },
    {
      name: 'Paul Waaktaar-Savoy',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'paul-waaktaar-savoy',
    },
    {
      name: 'Paul Waaktaar-Savoy',
      role: 'songwriter',
      artistGlobeId: 'paul-waaktaar-savoy',
    },
    { name: 'Morten Harket', role: 'vocals', artistGlobeId: 'morten-harket' },
    {
      name: 'Paul Waaktaar-Savoy',
      role: 'performer',
      instrument: 'drum-machine',
      artistGlobeId: 'paul-waaktaar-savoy',
    },
    {
      name: 'Magne Furuholmen',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'magne-furuholmen',
    },
    { name: 'Alan Tarney', role: 'producer', artistGlobeId: 'alan-tarney' },
    {
      name: 'Paul Waaktaar-Savoy',
      role: 'performer',
      artistGlobeId: 'paul-waaktaar-savoy',
    },
    {
      name: 'Magne Furuholmen',
      role: 'songwriter',
      artistGlobeId: 'magne-furuholmen',
    },
    {
      name: 'Magne Furuholmen',
      role: 'performer',
      artistGlobeId: 'magne-furuholmen',
    },
  ],
  releases: [{ releaseId: 'a-ha-hunting-high-and-low' }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        { chords: [], restBars: 8 },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
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
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '3 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '3 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '3 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'pre_chorus_1',
      label: 'Pre-Chorus 1',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            {
              degree: '3 min7/7',
              chordName: 'C♯min7/G♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            {
              degree: '3 min7/7',
              chordName: 'C♯min7/G♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            {
              degree: '3 min7/7',
              chordName: 'C♯min7/G♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            {
              degree: '3 min7/7',
              chordName: 'C♯min7/G♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'interlude',
      label: 'Interlude',
      instrumental: true,
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [], restBars: 4 },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '3 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'E7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '3 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '3 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'pre_chorus_2',
      label: 'Pre-Chorus 2',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            {
              degree: '3 min7/7',
              chordName: 'C♯min7/G♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            {
              degree: '3 min7/7',
              chordName: 'C♯min7/G♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            {
              degree: '3 min7/7',
              chordName: 'C♯min7/G♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            {
              degree: '3 min7/7',
              chordName: 'C♯min7/G♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=djV11Xbc914' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/a-ha.webp',
  popularity: 50,
};
