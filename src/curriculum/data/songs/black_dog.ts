import type { Song } from '@/curriculum/types/songLibrary';

export const black_dog: Song = {
  id: 'black_dog',
  title: 'Black Dog',
  artist: 'Led Zeppelin',
  year: 1971,
  historicalDescription:
    "Led Zeppelin releases 'Black Dog' on their landmark fourth album, an untitled record often called 'Led Zeppelin IV.' The track's jagged, stop-start guitar riff — traded between Robert Plant's raw vocal calls and Jimmy Page's thunderous response — becomes one of the defining moments of hard rock. It crystallizes Zeppelin's power and unpredictability at the peak of their creative force.",
  key: 'A major',
  keyRoot: 69,
  mode: 'major',
  tempo: 165,
  timeSignature: [4, 4],

  difficulty: 1,
  genreTags: ['rock'],
  techniques: [],
  session: { studioId: 'basing-street-studios' },
  credits: [
    { name: 'Robert Plant', role: 'vocals', artistGlobeId: 'robert-plant' },
    {
      name: 'Robert Plant',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'robert-plant',
    },
    {
      name: 'John Paul Jones',
      role: 'songwriter',
      artistGlobeId: 'john-paul-jones',
    },
    { name: 'Jimmy Page', role: 'songwriter', artistGlobeId: 'jimmy-page' },
    {
      name: 'John Bonham',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'john-bonham',
    },
    { name: 'Andy Johns', role: 'engineer' },
    { name: 'Robert Plant', role: 'songwriter', artistGlobeId: 'robert-plant' },
    {
      name: 'John Paul Jones',
      role: 'performer',
      instrument: 'electric-bass',
      artistGlobeId: 'john-paul-jones',
    },
    {
      name: 'Jimmy Page',
      role: 'performer',
      instrument: 'electric-guitar',
      artistGlobeId: 'jimmy-page',
    },
    { name: 'Jimmy Page', role: 'producer', artistGlobeId: 'jimmy-page' },
  ],
  releases: [{ releaseId: 'led-zeppelin-led-zeppelin-iv' }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        { chords: [], restBars: 4 },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'interlude_1',
      label: 'Interlude 1',
      instrumental: true,
      bars: [
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      instrumental: true,
      bars: [
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭3 5', chordName: 'C5', beat: 1, duration: 2 },
            { degree: '1 5', chordName: 'A5', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'interlude_2',
      label: 'Interlude 2',
      instrumental: true,
      bars: [
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      instrumental: true,
      bars: [
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭3 5', chordName: 'C5', beat: 1, duration: 2 },
            { degree: '1 5', chordName: 'A5', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 5', chordName: 'G5', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 3',
      instrumental: true,
      bars: [
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭3 5', chordName: 'C5', beat: 1, duration: 2 },
            { degree: '1 5', chordName: 'A5', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      instrumental: true,
      bars: [
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 5', chordName: 'A5', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭3 5', chordName: 'C5', beat: 1, duration: 2 },
            { degree: '1 5', chordName: 'A5', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 5', chordName: 'G5', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=2KPEHohJMuw' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/led-zeppelin.webp',
  popularity: 50,
};
