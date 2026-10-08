import type { Song } from '@/curriculum/types/songLibrary';

export const stay: Song = {
  id: 'stay',
  title: 'Stay',
  artist: 'Rihanna featuring Mikky Ekko',
  composer: 'Mikky Ekko, Justin Parker and Elof Loelv',
  year: 2012,
  historicalDescription:
    "Rihanna releases 'Stay', a bare piano ballad that Mikky Ekko and Justin Parker first wrote for Ekko's own record, until Rihanna heard the demo and asked for it. With Ekko answering her in the second verse and little more than piano beneath them, it shows a quieter side of an artist known for club anthems. It reaches No. 3 on the Billboard Hot 100, her 24th top-ten hit, which passes Whitney Houston's total, and earns a Grammy nomination for Best Pop Duo/Group Performance.",
  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 112,
  timeSignature: [4, 4],

  difficulty: 1,
  genreTags: ['pop', 'rnb'],
  techniques: [],
  session: { studioId: 'nightbird-recording-studios' },
  credits: [
    {
      name: 'Rihanna',
      role: 'vocals',
      primary: true,
      artistGlobeId: 'rihanna',
    },
    {
      name: 'Mikky Ekko',
      role: 'vocals',
      primary: true,
      artistGlobeId: 'mikky-ekko',
    },
    { name: 'Mikky Ekko', role: 'songwriter', artistGlobeId: 'mikky-ekko' },
    {
      name: 'Justin Parker',
      role: 'songwriter',
      artistGlobeId: 'justin-parker',
    },
    { name: 'Elof Loelv', role: 'songwriter', artistGlobeId: 'elof-loelv' },
    { name: 'Mikky Ekko', role: 'producer', artistGlobeId: 'mikky-ekko' },
    { name: 'Justin Parker', role: 'producer', artistGlobeId: 'justin-parker' },
    { name: 'Elof Loelv', role: 'producer', artistGlobeId: 'elof-loelv' },
    { name: 'Kuk Harrell', role: 'producer', artistGlobeId: 'kuk-harrell' },
  ],
  releases: [{ releaseId: 'rihanna-unapologetic' }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        {
          chords: [
            {
              degree: '1 maj',
              chordName: 'C',
              beat: 1,
              duration: 3,
              voicingHint: '5-1-3',
            },
            {
              degree: '2 min',
              chordName: 'Dmin',
              beat: 4,
              duration: 1,
              voicingHint: '5-1-3',
            },
          ],
        },
        {
          chords: [
            { degree: '6 min', chordName: 'Amin', beat: 1, duration: 3 },
            { degree: '6 min7', chordName: 'C/A', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '6 min', chordName: 'Amin', beat: 1, duration: 3 },
            { degree: '6 min7', chordName: 'C/A', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '6 min', chordName: 'Amin', beat: 1, duration: 3 },
            { degree: '6 min7', chordName: 'C/A', beat: 4, duration: 1 },
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
            {
              degree: '1 maj',
              chordName: 'C',
              beat: 1,
              duration: 3,
              voicingHint: '5-1-3',
            },
            {
              degree: '2 min',
              chordName: 'Dmin',
              beat: 4,
              duration: 1,
              voicingHint: '5-1-3',
            },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '6 min', chordName: 'Amin', beat: 1, duration: 3 },
            { degree: '6 min7', chordName: 'C/A', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '6 min', chordName: 'Amin', beat: 1, duration: 3 },
            { degree: '6 min7', chordName: 'C/A', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '6 min', chordName: 'Amin', beat: 1, duration: 3 },
            { degree: '6 min7', chordName: 'C/A', beat: 4, duration: 1 },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'pre_chorus_1',
      label: 'Pre-Chorus 1',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            {
              degree: '2 min',
              chordName: 'Dmin',
              beat: 1,
              duration: 4,
              voicingHint: '3-5-1',
            },
          ],
        },
        {
          chords: [
            { degree: '6 min', chordName: 'Amin', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min', chordName: 'Amin', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            {
              degree: '2 min',
              chordName: 'Dmin',
              beat: 1,
              duration: 4,
              voicingHint: '3-5-1',
            },
          ],
        },
        {
          chords: [
            {
              degree: '5 maj',
              chordName: 'G',
              beat: 1,
              duration: 4,
              voicingHint: '5-1-3',
            },
          ],
        },
        {
          chords: [
            {
              degree: '5 maj',
              chordName: 'G',
              beat: 1,
              duration: 4,
              voicingHint: '5-1-3',
            },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          repeatStart: true,
          chords: [
            {
              degree: '1 maj',
              chordName: 'C',
              beat: 1,
              duration: 4,
              voicingHint: '5-1-3',
            },
          ],
        },
        {
          chords: [
            {
              degree: '2 min',
              chordName: 'Dmin',
              beat: 1,
              duration: 4,
              voicingHint: '5-1-3',
            },
          ],
        },
        {
          chords: [
            { degree: '6 min', chordName: 'Amin', beat: 1, duration: 4 },
          ],
        },
        {
          repeatEnd: true,
          repeatTimes: 2,
          chords: [
            {
              degree: '4 maj',
              chordName: 'F',
              beat: 1,
              duration: 4,
              voicingHint: '3-5-1',
            },
          ],
        },
      ],
    },
    {
      id: 'tag_1',
      label: 'Tag 1',
      bars: [
        {
          chords: [
            {
              degree: '1 maj',
              chordName: 'C',
              beat: 1,
              duration: 3,
              voicingHint: '5-1-3',
            },
            {
              degree: '2 min',
              chordName: 'Dmin',
              beat: 4,
              duration: 1,
              voicingHint: '5-1-3',
            },
          ],
        },
        {
          chords: [
            { degree: '6 min', chordName: 'Amin', beat: 1, duration: 3 },
            { degree: '6 min7', chordName: 'C/A', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '6 min', chordName: 'Amin', beat: 1, duration: 3 },
            { degree: '6 min7', chordName: 'C/A', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '6 min', chordName: 'Amin', beat: 1, duration: 3 },
            { degree: '6 min7', chordName: 'C/A', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            {
              degree: '1 maj',
              chordName: 'C',
              beat: 1,
              duration: 3,
              voicingHint: '5-1-3',
            },
            {
              degree: '2 min',
              chordName: 'Dmin',
              beat: 4,
              duration: 1,
              voicingHint: '5-1-3',
            },
          ],
        },
        {
          chords: [
            { degree: '6 min', chordName: 'Amin', beat: 1, duration: 3 },
            { degree: '6 min7', chordName: 'C/A', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '6 min', chordName: 'Amin', beat: 1, duration: 3 },
            { degree: '6 min7', chordName: 'C/A', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '6 min', chordName: 'Amin', beat: 1, duration: 3 },
            { degree: '6 min7', chordName: 'C/A', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'pre_chorus_2',
      label: 'Pre-Chorus 2',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            {
              degree: '2 min',
              chordName: 'Dmin',
              beat: 1,
              duration: 4,
              voicingHint: '3-5-1',
            },
          ],
        },
        {
          chords: [
            { degree: '6 min', chordName: 'Amin', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min', chordName: 'Amin', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            {
              degree: '2 min',
              chordName: 'Dmin',
              beat: 1,
              duration: 4,
              voicingHint: '3-5-1',
            },
          ],
        },
        {
          chords: [
            {
              degree: '5 maj',
              chordName: 'G',
              beat: 1,
              duration: 4,
              voicingHint: '5-1-3',
            },
          ],
        },
        {
          chords: [
            {
              degree: '5 maj',
              chordName: 'G',
              beat: 1,
              duration: 4,
              voicingHint: '5-1-3',
            },
          ],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          repeatStart: true,
          chords: [
            {
              degree: '1 maj',
              chordName: 'C',
              beat: 1,
              duration: 4,
              voicingHint: '5-1-3',
            },
          ],
        },
        {
          chords: [
            {
              degree: '2 min',
              chordName: 'Dmin',
              beat: 1,
              duration: 4,
              voicingHint: '5-1-3',
            },
          ],
        },
        {
          chords: [
            { degree: '6 min', chordName: 'Amin', beat: 1, duration: 4 },
          ],
        },
        {
          repeatEnd: true,
          repeatTimes: 2,
          chords: [
            {
              degree: '4 maj',
              chordName: 'F',
              beat: 1,
              duration: 4,
              voicingHint: '3-5-1',
            },
          ],
        },
      ],
    },
    {
      id: 'tag_2',
      label: 'Tag 2',
      bars: [
        {
          chords: [
            {
              degree: '1 maj',
              chordName: 'C',
              beat: 1,
              duration: 3,
              voicingHint: '5-1-3',
            },
            {
              degree: '2 min',
              chordName: 'Dmin',
              beat: 4,
              duration: 1,
              voicingHint: '5-1-3',
            },
          ],
        },
        {
          chords: [
            { degree: '6 min', chordName: 'Amin', beat: 1, duration: 3 },
            { degree: '6 min7', chordName: 'C/A', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '6 min', chordName: 'Amin', beat: 1, duration: 3 },
            { degree: '6 min7', chordName: 'C/A', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '6 min', chordName: 'Amin', beat: 1, duration: 3 },
            { degree: '6 min7', chordName: 'C/A', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min', chordName: 'Amin', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min',
              chordName: 'Dmin',
              beat: 1,
              duration: 4,
              voicingHint: '3-5-1',
            },
          ],
        },
        {
          chords: [
            {
              degree: '2 min',
              chordName: 'Dmin',
              beat: 1,
              duration: 2,
              voicingHint: '3-5-1',
            },
            {
              degree: '3 min',
              chordName: 'Emin',
              beat: 3,
              duration: 2,
              voicingHint: '3-5-1',
            },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min', chordName: 'Amin', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min',
              chordName: 'Dmin',
              beat: 1,
              duration: 4,
              voicingHint: '3-5-1',
            },
          ],
        },
        {
          chords: [
            {
              degree: '2 min',
              chordName: 'Dmin',
              beat: 1,
              duration: 3,
              voicingHint: '3-5-1',
            },
            { degree: '2 min/1', chordName: 'Dmin/C', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '2 min', chordName: 'Dmin', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min', chordName: 'Amin', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min', chordName: 'Amin', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min', chordName: 'Dmin', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            {
              degree: '5 maj',
              chordName: 'G',
              beat: 1,
              duration: 4,
              voicingHint: '5-1-3',
            },
          ],
        },
        {
          chords: [
            {
              degree: '5 maj',
              chordName: 'G',
              beat: 1,
              duration: 2,
              voicingHint: '5-1-3',
            },
            { degree: '5 sus4', chordName: 'Gsus4', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          repeatStart: true,
          chords: [
            {
              degree: '1 maj',
              chordName: 'C',
              beat: 1,
              duration: 4,
              voicingHint: '5-1-3',
            },
          ],
        },
        {
          chords: [
            {
              degree: '2 min',
              chordName: 'Dmin',
              beat: 1,
              duration: 4,
              voicingHint: '5-1-3',
            },
          ],
        },
        {
          chords: [
            { degree: '6 min', chordName: 'Amin', beat: 1, duration: 4 },
          ],
        },
        {
          repeatEnd: true,
          repeatTimes: 5,
          chords: [
            {
              degree: '4 maj',
              chordName: 'F',
              beat: 1,
              duration: 4,
              voicingHint: '3-5-1',
            },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=JF8BRvqGCNs' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/rihanna.webp',
  popularity: 50,
};
