import type { Song } from '@/curriculum/types/songLibrary';

export const flowers: Song = {
  id: 'flowers',
  title: 'Flowers',
  artist: 'Miley Cyrus',
  composer: 'Miley Cyrus, Gregory Aldae Hein and Michael Pollack',
  year: 2023,
  historicalDescription:
    "Miley Cyrus releases 'Flowers', the lead single from 'Endless Summer Vacation', a disco-tinged declaration of self-reliance after a breakup. It debuts at No. 1 on the Billboard Hot 100 and spends eight weeks at the top, and it sets Spotify records for the biggest week a song has had on the platform and the fastest climb to a billion plays. At the 2024 Grammy Awards it wins Record of the Year and Best Pop Solo Performance.",
  key: 'A minor',
  keyRoot: 69,
  mode: 'minor',
  tempo: 118,
  timeSignature: [4, 4],
  difficulty: 1,
  genreTags: ['pop'],
  techniques: [],
  credits: [
    {
      name: 'Miley Cyrus',
      role: 'vocals',
      primary: true,
      artistGlobeId: 'miley-cyrus',
    },
    { name: 'Miley Cyrus', role: 'songwriter', artistGlobeId: 'miley-cyrus' },
    {
      name: 'Gregory Aldae Hein',
      role: 'songwriter',
      artistGlobeId: 'gregory-aldae-hein',
    },
    {
      name: 'Michael Pollack',
      role: 'songwriter',
      artistGlobeId: 'michael-pollack',
    },
    { name: 'Kid Harpoon', role: 'producer', artistGlobeId: 'kid-harpoon' },
    { name: 'Tyler Johnson', role: 'producer', artistGlobeId: 'tyler-johnson' },
  ],
  releases: [{ releaseId: 'miley-cyrus-endless-summer-vacation' }],
  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 min', chordName: 'Amin', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            {
              degree: '4 min',
              chordName: 'Dmin',
              beat: 1,
              duration: 4,
              voicingHint: '5-1-3',
            },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '♭3 maj',
              chordName: 'C',
              beat: 1,
              duration: 4,
              voicingHint: '5-1-3',
            },
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
        {
          chords: [
            { degree: '1 min', chordName: 'Amin', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '4 min',
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
              degree: '5 maj',
              chordName: 'E',
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
              chordName: 'E',
              beat: 1,
              duration: 4,
              voicingHint: '3-5-1',
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
          chords: [
            { degree: '1 min', chordName: 'Amin', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '4 min',
              chordName: 'Dmin',
              beat: 1,
              duration: 4,
              voicingHint: '5-1-3',
            },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '♭3 maj',
              chordName: 'C',
              beat: 1,
              duration: 3,
              voicingHint: '5-1-3',
            },
            { degree: '♭7 maj', chordName: 'G', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 min', chordName: 'Amin', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            {
              degree: '4 min',
              chordName: 'Dmin',
              beat: 1,
              duration: 4,
              voicingHint: '5-1-3',
            },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '♭3 maj',
              chordName: 'C',
              beat: 1,
              duration: 3,
              voicingHint: '5-1-3',
            },
            { degree: '♭7 maj', chordName: 'G', beat: 4, duration: 1 },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'tag_1',
      label: 'Tag 1',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '5 maj',
              chordName: 'E',
              beat: 1,
              duration: 4,
              voicingHint: '3-5-1',
            },
          ],
        },
        {
          chords: [
            { degree: '1 min', chordName: 'Amin', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '4 min',
              chordName: 'Dmin',
              beat: 1,
              duration: 4,
              voicingHint: '5-1-3',
            },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '♭3 maj',
              chordName: 'C',
              beat: 1,
              duration: 4,
              voicingHint: '5-1-3',
            },
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
            { degree: '1 min', chordName: 'Amin', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            {
              degree: '4 min',
              chordName: 'Dmin',
              beat: 1,
              duration: 4,
              voicingHint: '5-1-3',
            },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '♭3 maj',
              chordName: 'C',
              beat: 1,
              duration: 4,
              voicingHint: '5-1-3',
            },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'pre_chorus_2',
      label: 'Pre-Chorus 2',
      bars: [
        {
          chords: [
            { degree: '1 min', chordName: 'Amin', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '4 min',
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
              degree: '5 maj',
              chordName: 'E',
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
              chordName: 'E',
              beat: 1,
              duration: 4,
              voicingHint: '3-5-1',
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
          chords: [
            { degree: '1 min', chordName: 'Amin', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '4 min',
              chordName: 'Dmin',
              beat: 1,
              duration: 4,
              voicingHint: '5-1-3',
            },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '♭3 maj',
              chordName: 'C',
              beat: 1,
              duration: 3,
              voicingHint: '5-1-3',
            },
            { degree: '♭7 maj', chordName: 'G', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 min', chordName: 'Amin', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            {
              degree: '4 min',
              chordName: 'Dmin',
              beat: 1,
              duration: 4,
              voicingHint: '5-1-3',
            },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '♭3 maj',
              chordName: 'C',
              beat: 1,
              duration: 3,
              voicingHint: '5-1-3',
            },
            { degree: '♭7 maj', chordName: 'G', beat: 4, duration: 1 },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'tag_2',
      label: 'Tag 2',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '5 maj',
              chordName: 'E',
              beat: 1,
              duration: 4,
              voicingHint: '3-5-1',
            },
          ],
        },
        {
          chords: [
            { degree: '1 min', chordName: 'Amin', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '4 min',
              chordName: 'Dmin',
              beat: 1,
              duration: 4,
              voicingHint: '5-1-3',
            },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '♭3 maj',
              chordName: 'C',
              beat: 1,
              duration: 4,
              voicingHint: '5-1-3',
            },
          ],
        },
      ],
    },
    {
      id: 'pre_chorus_3',
      label: 'Pre-Chorus 3',
      bars: [
        {
          chords: [
            { degree: '1 min', chordName: 'Amin', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '4 min',
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
              degree: '5 maj',
              chordName: 'E',
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
              chordName: 'E',
              beat: 1,
              duration: 4,
              voicingHint: '3-5-1',
            },
          ],
        },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 3',
      bars: [
        {
          chords: [
            { degree: '1 min', chordName: 'Amin', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '4 min',
              chordName: 'Dmin',
              beat: 1,
              duration: 4,
              voicingHint: '5-1-3',
            },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '♭3 maj',
              chordName: 'C',
              beat: 1,
              duration: 3,
              voicingHint: '5-1-3',
            },
            { degree: '♭7 maj', chordName: 'G', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 min', chordName: 'Amin', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            {
              degree: '4 min',
              chordName: 'Dmin',
              beat: 1,
              duration: 4,
              voicingHint: '5-1-3',
            },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '♭3 maj',
              chordName: 'C',
              beat: 1,
              duration: 3,
              voicingHint: '5-1-3',
            },
            { degree: '♭7 maj', chordName: 'G', beat: 4, duration: 1 },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '5 maj',
              chordName: 'E',
              beat: 1,
              duration: 4,
              voicingHint: '3-5-1',
            },
          ],
        },
        {
          chords: [
            { degree: '1 min', chordName: 'Amin', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '4 min',
              chordName: 'Dmin',
              beat: 1,
              duration: 4,
              voicingHint: '5-1-3',
            },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '♭3 maj',
              chordName: 'C',
              beat: 1,
              duration: 4,
              voicingHint: '5-1-3',
            },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=G7KNmW9a75Y' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
