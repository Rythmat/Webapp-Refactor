import type { Song } from '@/curriculum/types/songLibrary';

export const happy_birthday: Song = {
  id: 'happy_birthday',
  title: 'Happy Birthday',
  artist: 'Stevie Wonder',
  composer: 'Stevie Wonder',
  year: 1980,
  historicalDescription:
    "Stevie Wonder releases 'Happy Birthday' on 'Hotter than July' as the anthem of his campaign to make Martin Luther King Jr.'s birthday a national holiday in the United States. Over a bright synthesizer groove, a birthday song becomes a call to action, and Motown issues it as a single in 1981 to carry the cause further. President Ronald Reagan signs the holiday into law in 1983, and the chorus goes on to become a birthday song of its own.",
  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 116,
  timeSignature: [4, 4],
  difficulty: 1,
  genreTags: ['rnb', 'pop'],
  techniques: [],
  credits: [
    {
      name: 'Stevie Wonder',
      role: 'vocals',
      primary: true,
      artistGlobeId: 'stevie-wonder',
    },
    {
      name: 'Stevie Wonder',
      role: 'songwriter',
      artistGlobeId: 'stevie-wonder',
    },
    { name: 'Stevie Wonder', role: 'producer', artistGlobeId: 'stevie-wonder' },
  ],
  releases: [{ releaseId: 'stevie-wonder-hotter-than-july' }],
  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
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
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
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
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }],
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
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'F/C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
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
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'pre_chorus_2',
      label: 'Pre-Chorus 2',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'F/C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
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
          chords: [{ degree: '♭6 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
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
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'pre_chorus_3',
      label: 'Pre-Chorus 3',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'F/C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
          repeatEnd: true,
          cue: 'Repeat and Fade',
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=RcVZfJO01NI' },
  ],
  artistImageSource: 'manual',
  artistImageRef: '/artists/svg/stevie-wonder.webp',
  popularity: 50,
};
