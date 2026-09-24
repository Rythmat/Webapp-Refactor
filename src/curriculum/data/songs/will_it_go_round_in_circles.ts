import type { Song } from '@/curriculum/types/songLibrary';

export const will_it_go_round_in_circles: Song = {
  id: 'will_it_go_round_in_circles',
  title: 'Will It Go Round In Circles',
  artist: 'Billy Preston',
  year: 1972,
  historicalDescription:
    "Billy Preston releases 'Will It Go Round In Circles', a buoyant soul groove built on a rolling piano figure and a melody, as Preston cheerfully admits, with no story. The song hits #1 in the US, cementing Preston's status as a rare instrumentalist-turned-solo-star — the only artist to receive a co-billing credit on a Beatles record. It captures the looser, funkier side of early 1970s soul.",
  key: 'A♭ mixolydian',
  keyRoot: 68,
  mode: 'mixolydian',
  tempo: 97,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rnb'],
  techniques: [],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [] },
        { chords: [{ degree: '1 dom7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 1 },
            { degree: '5 dom7', chordName: 'E♭7', beat: 2, duration: 1 },
            { degree: '1 dom7', chordName: 'A♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'E♭7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 dom7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 1 },
            { degree: '5 dom7', chordName: 'E♭7', beat: 2, duration: 1 },
            { degree: '1 dom7', chordName: 'A♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 2 },
            { degree: '♭7 maj', chordName: 'G♭', beat: 3, duration: 2 },
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
            { degree: '1 dom7', chordName: 'A♭7', beat: 1, duration: 2 },
            { degree: '4 dom7', chordName: 'D♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'A♭7', beat: 1, duration: 2 },
            { degree: '4 dom7', chordName: 'D♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'A♭7', beat: 1, duration: 2 },
            { degree: '4 dom7', chordName: 'D♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'A♭7', beat: 1, duration: 2 },
            { degree: '4 dom7', chordName: 'D♭7', beat: 3, duration: 2 },
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
            { degree: '1 dom7', chordName: 'A♭7', beat: 1, duration: 2 },
            { degree: '4 dom7', chordName: 'D♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'A♭7', beat: 1, duration: 2 },
            { degree: '4 dom7', chordName: 'D♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'A♭7', beat: 1, duration: 2 },
            { degree: '4 dom7', chordName: 'D♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'A♭min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [
            { degree: '1 dom7', chordName: 'A♭7', beat: 1, duration: 2 },
            { degree: '4 dom7', chordName: 'D♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'A♭7', beat: 1, duration: 2 },
            { degree: '4 dom7', chordName: 'D♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'A♭7', beat: 1, duration: 2 },
            { degree: '4 dom7', chordName: 'D♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'A♭7', beat: 1, duration: 2 },
            { degree: '4 dom7', chordName: 'D♭7', beat: 3, duration: 2 },
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
            { degree: '1 dom7', chordName: 'A♭7', beat: 1, duration: 2 },
            { degree: '4 dom7', chordName: 'D♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'A♭7', beat: 1, duration: 2 },
            { degree: '4 dom7', chordName: 'D♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'A♭7', beat: 1, duration: 2 },
            { degree: '4 dom7', chordName: 'D♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'A♭min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=QDtYo2IPTsw' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/billy-preston.webp',
  popularity: 50,
};
