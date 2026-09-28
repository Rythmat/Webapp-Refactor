import type { Song } from '@/curriculum/types/songLibrary';

export const blank_space: Song = {
  id: 'blank_space',
  title: 'Blank Space',
  artist: 'Taylor Swift',
  year: 2014,
  historicalDescription:
    "Taylor Swift releases 'Blank Space', a razor-sharp satire of her own media-constructed image as a serial dater. Rather than deflect the tabloid narrative, she weaponizes it — playing the villainous romantic with gleeful self-awareness. The song becomes one of the defining pop moments of 2014, cementing Swift's transition from country sweetheart to global pop architect.",
  key: 'F major',
  keyRoot: 65,
  mode: 'major',
  tempo: 96,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop', 'rock'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [{ chords: [], restBars: 2 }],
    },
    {
      id: 'verse_1',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'D min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'D min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'G min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'D min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'D min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'G min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
          repeatEnd: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=e-ORhEE9VVg' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/taylor-swift.webp',
  popularity: 50,
};
