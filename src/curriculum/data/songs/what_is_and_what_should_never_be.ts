import type { Song } from '@/curriculum/types/songLibrary';

export const what_is_and_what_should_never_be: Song = {
  id: 'what_is_and_what_should_never_be',
  title: 'What Is And What Should Never Be',
  artist: 'Led Zeppelin',
  year: 1992,
  historicalDescription:
    "Led Zeppelin's 'What Is And What Should Never Be', written by Jimmy Page and Robert Plant, captures the band's genius for dynamic contrast — shifting from hushed, intimate verses to explosive, full-throttle choruses. Originally released on Led Zeppelin II in 1969, the song showcases the band's ability to move between vulnerability and raw power within a single track, cementing their reputation as architects of hard rock.",
  key: 'A major',
  keyRoot: 69,
  mode: 'major',
  tempo: 73,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  credits: [
    { name: 'Robert Plant', role: 'songwriter', artistGlobeId: 'robert-plant' },
    { name: 'Jimmy Page', role: 'songwriter', artistGlobeId: 'jimmy-page' },
  ],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'D/A', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '4 maj/1', chordName: 'D/A', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 maj/1', chordName: 'B/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '2 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [], restBars: 4 },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=uwOOFYDhAQA' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/led-zeppelin.webp',
  popularity: 50,
};
