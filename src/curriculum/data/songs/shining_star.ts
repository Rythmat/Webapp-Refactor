import type { Song } from '@/curriculum/types/songLibrary';

export const shining_star: Song = {
  id: 'shining_star',
  title: 'Shining Star',
  artist: 'Earth, Wind & Fire',
  year: undefined,

  historicalDescription:
    "Earth, Wind & Fire release 'Shining Star', becoming their first #1 hit on the Billboard Hot 100. The track fuses funk, soul, and R&B into an electrifying anthem of self-affirmation, capturing the spirit of mid-70s Black musical creativity at its peak. It wins the Grammy for Best R&B Performance and cements the band as one of the era's defining acts.",
  key: 'E major',
  keyRoot: 64,
  mode: 'major',
  tempo: 100,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        { chords: [], restBars: 2 },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      repeatCount: 4,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '4 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭7 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭3 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭6 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭7 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭3 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭6 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭3 7', chordName: 'G7', beat: 1, duration: 2 },
            { degree: '4 7', chordName: 'A7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        {
          chords: [
            { degree: '4 7', chordName: 'A7', beat: 1, duration: 1 },
            { degree: '♭5 7', chordName: 'A♯7', beat: 2, duration: 1 },
            { degree: '5 7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 7', chordName: 'C7', beat: 1, duration: 2 },
            { degree: '6 7', chordName: 'C♯7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 7', chordName: 'D7', beat: 1, duration: 2 },
            { degree: '7 7', chordName: 'D♯7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      repeatCount: 6,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      measuresPerRow: 8,
      repeatCount: 4,
      bars: [
        { chords: [{ degree: '4 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭7 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭3 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭6 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭7 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭3 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭6 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=Zu9a29UR2dU' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/earth-wind-and-fire.webp',
  popularity: 50,
};
