import type { Song } from '@/curriculum/types/songLibrary';

export const gimme_shelter: Song = {
  id: 'gimme_shelter',
  title: 'Gimme Shelter',
  artist: 'The Rolling Stones',
  year: 1971,
  historicalDescription:
    "'Gimme Shelter' opens Let It Bleed as one of the Rolling Stones' most haunting and powerful statements — a brooding vision of war, violence, and apocalypse that captures the dark end of the 1960s dream. Merry Clayton's stunning guest vocal, raw and ragged, transforms the track into something terrifying and transcendent. It becomes the defining sound of an era turning dangerous.",
  key: 'C♯ mixolydian',
  keyRoot: 61,
  mode: 'mixolydian',
  tempo: 116,
  timeSignature: [4, 4],

  difficulty: 1,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [{ chords: [], restBars: 12 }],
    },
    {
      id: 'verse_1',
      label: 'Verse',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'C♯', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        {
          chords: [{ degree: '1 maj', chordName: 'C♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'C♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'C♯', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'C♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B', beat: 1, duration: 4 }],
          repeatEnd: true,
          repeatTimes: 5,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=RbmS3tQJ7Os' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/the-rolling-stones.webp',
  popularity: 50,
};
