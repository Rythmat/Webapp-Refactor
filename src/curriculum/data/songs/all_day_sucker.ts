import type { Song } from '@/curriculum/types/songLibrary';

export const all_day_sucker: Song = {
  id: 'all_day_sucker',
  title: 'All Day Sucker',
  artist: 'Stevie Wonder',
  year: 1976,
  historicalDescription:
    "Stevie Wonder records 'All Day Sucker' during his legendary creative peak, embedding it in the sprawling double album 'Songs in the Key of Life'. The track showcases his mastery of funk — tight, percussive, and groove-driven — arriving at a moment when Wonder is untouchable, redefining what a Black pop auteur can achieve in the studio.",
  key: 'A♭ major',
  keyRoot: 68,
  mode: 'major',
  tempo: 106,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['funk'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        { chords: [], restBars: 2 },
        {
          chords: [
            { degree: '1 7', chordName: 'G♯7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'G♯7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'G♯7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'G♯7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'G♯7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'G♯7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'G♯7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'G♯7(♯9)', beat: 1, duration: 4 },
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
            { degree: '1 7', chordName: 'G♯7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'G♯7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'G♯7(♯9)', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 9', chordName: 'C♯9', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 7', chordName: 'F7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'D♯7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'G♯7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'G♯7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'G♯7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'G♯7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'G♯7(♯9)', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 9', chordName: 'C♯9', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 7', chordName: 'F7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'D♯7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'G♯7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
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
            { degree: '♭7 min7', chordName: 'F♯min7', beat: 1, duration: 1 },
            { degree: '♭3 7', chordName: 'B7', beat: 2, duration: 1 },
            { degree: '♭6 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'F♯min7', beat: 1, duration: 1 },
            { degree: '♭3 7', chordName: 'B7', beat: 2, duration: 1 },
            { degree: '♭6 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'F♯min7', beat: 1, duration: 1 },
            { degree: '♭3 7', chordName: 'B7', beat: 2, duration: 1 },
            { degree: '♭6 maj', chordName: 'E', beat: 3, duration: 1 },
            { degree: '♭5 7', chordName: 'D7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'C♯min7', beat: 1, duration: 1 },
            { degree: '2 7', chordName: 'A♯7(♯9)', beat: 2, duration: 1 },
            { degree: '5 7', chordName: 'D♯7(♯9)', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'interlude',
      label: 'Interlude',
      instrumental: true,
      bars: [
        {
          chords: [
            { degree: '1 7', chordName: 'G♯7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'G♯7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'G♯7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'G♯7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'G♯7(♯9)', beat: 1, duration: 4 },
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
            { degree: '1 7', chordName: 'G♯7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'G♯7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'G♯7(♯9)', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 9', chordName: 'C♯9', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 7', chordName: 'F7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'D♯7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'G♯7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'G♯7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'G♯7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'G♯7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'G♯7(♯9)', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 9', chordName: 'C♯9', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 7', chordName: 'F7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'D♯7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'G♯7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
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
            { degree: '♭7 min7', chordName: 'F♯min7', beat: 1, duration: 1 },
            { degree: '♭3 7', chordName: 'B7', beat: 2, duration: 1 },
            { degree: '♭6 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'F♯min7', beat: 1, duration: 1 },
            { degree: '♭3 7', chordName: 'B7', beat: 2, duration: 1 },
            { degree: '♭6 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'F♯min7', beat: 1, duration: 1 },
            { degree: '♭3 7', chordName: 'B7', beat: 2, duration: 1 },
            { degree: '♭6 maj', chordName: 'E', beat: 3, duration: 1 },
            { degree: '♭5 7', chordName: 'D7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'C♯min7', beat: 1, duration: 1 },
            { degree: '2 7', chordName: 'A♯7(♯9)', beat: 2, duration: 1 },
            { degree: '5 7', chordName: 'D♯7(♯9)', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [
            { degree: '5 7', chordName: 'D♯7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'D♯7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'G♯7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'G♯7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'G♯7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'G♯7(♯9)', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=pz3rrESMnzI' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/stevie-wonder.webp',
  popularity: 50,
};
