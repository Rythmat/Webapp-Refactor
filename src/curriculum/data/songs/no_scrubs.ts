import type { Song } from '@/curriculum/types/songLibrary';

export const no_scrubs: Song = {
  id: 'no_scrubs',
  title: 'No Scrubs',
  artist: 'TLC',
  year: 1999,
  historicalDescription:
    "TLC releases 'No Scrubs', a sharp, self-assured anthem rejecting broke, aimless men that becomes one of the defining pop-R&B moments of the late 1990s. Its blunt, conversational lyrics give voice to a generation of women refusing to settle, and the song's cultural impact is so immediate that Destiny's Child answers it with 'Bills, Bills, Bills' the same year.",
  key: 'G♯ minor',
  keyRoot: 68,
  mode: 'minor',
  tempo: 188,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['hip-hop', 'rnb'],
  techniques: [],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'D♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'D♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'D♯7b9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'D♯7b9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'G♯7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'G♯7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 dom7', chordName: 'G7', beat: 1, duration: 2 },
            { degree: '♭7 dom7', chordName: 'F♯7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '6 dom7', chordName: 'F7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 dom7/7', chordName: 'D♯7/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7/7', chordName: 'D♯7/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'C♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'F♯7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7/7', chordName: 'D♯7/G', beat: 1, duration: 4 },
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
            { degree: '4 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'D♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=FrLequ6dUdM' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/tlc.webp',
  popularity: 50,
};
