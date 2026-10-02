import type { Song } from '@/curriculum/types/songLibrary';

export const the_ocean: Song = {
  id: 'the_ocean',
  title: 'The Ocean',
  artist: 'Led Zeppelin',
  year: 1973,
  historicalDescription:
    "Led Zeppelin release 'The Ocean' on Houses of the Holy, a thunderous tribute to their live audiences — the 'ocean of people' Zeppelin faced night after night on their legendary stadium tours. Robert Plant's lyrics and John Bonham's ferocious, count-in opening capture the band at their most self-aware and celebratory. The song's shifting time signatures showcase Zeppelin's refusal to be confined by conventional rock structure.",
  key: 'D major',
  keyRoot: 62,
  mode: 'major',
  tempo: 88,
  timeSignature: [4, 4],

  difficulty: 1,
  genreTags: ['rock'],
  techniques: [],
  credits: [
    { name: 'Eddie Kramer', role: 'engineer' },
    { name: 'George Chkiantz', role: 'engineer' },
    {
      name: 'John Paul Jones',
      role: 'songwriter',
      artistGlobeId: 'john-paul-jones',
    },
    { name: 'Jimmy Page', role: 'producer', artistGlobeId: 'jimmy-page' },
    { name: 'Keith Harwood', role: 'engineer' },
    {
      name: 'John Bonham',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'john-bonham',
    },
    { name: 'Robert Plant', role: 'vocals', artistGlobeId: 'robert-plant' },
    {
      name: 'Robert Plant',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'robert-plant',
    },
    {
      name: 'John Paul Jones',
      role: 'performer',
      artistGlobeId: 'john-paul-jones',
    },
    {
      name: 'John Bonham',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'john-bonham',
    },
    { name: 'Robert Plant', role: 'songwriter', artistGlobeId: 'robert-plant' },
    {
      name: 'John Paul Jones',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'john-paul-jones',
    },
    { name: 'John Bonham', role: 'songwriter', artistGlobeId: 'john-bonham' },
    { name: 'Jimmy Page', role: 'performer', artistGlobeId: 'jimmy-page' },
    { name: 'Jimmy Page', role: 'songwriter', artistGlobeId: 'jimmy-page' },
  ],
  releases: [{ releaseId: 'led-zeppelin-houses-of-the-holy' }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      instrumental: true,
      bars: [
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        { chords: [] },
        { chords: [] },
        { chords: [] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 2',
      instrumental: true,
      bars: [
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        { chords: [] },
        { chords: [] },
        { chords: [] },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'pre_chorus',
      label: 'Pre-Chorus',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [] },
        { chords: [], restBars: 6 },
      ],
    },
    {
      id: 'chorus_4',
      label: 'Chorus 3',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 3',
      instrumental: true,
      bars: [
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        { chords: [] },
        { chords: [] },
        { chords: [] },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 4',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        { chords: [{ degree: '2 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_6',
      label: 'Verse 5',
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '2 maj', chordName: 'E', beat: 1, duration: 4 }],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'verse_9',
      label: 'Verse 6',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [] },
        { chords: [] },
        { chords: [], fermata: true },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=6XIQR4p30Wo' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/led-zeppelin.webp',
  popularity: 50,
};
