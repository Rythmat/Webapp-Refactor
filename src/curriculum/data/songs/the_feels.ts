import type { Song } from '@/curriculum/types/songLibrary';

export const the_feels: Song = {
  id: 'the_feels',
  title: 'The Feels',
  artist: 'Labrinth',
  composer: 'Labrinth',
  year: 2023,
  historicalDescription:
    "Labrinth opens his album 'Ends & Begins' with 'The Feels', a slow-burning gospel-tinged ballad sung with Zendaya, his collaborator from the HBO series 'Euphoria', for which he writes the score. A simple loop of D, A and B minor carries the whole song, letting the two voices and the swelling arrangement do the work.",
  key: 'D major',
  keyRoot: 62,
  mode: 'major',
  tempo: 54,
  timeSignature: [4, 4],
  difficulty: 1,
  genreTags: ['pop', 'rnb'],
  techniques: [],
  credits: [
    {
      name: 'Labrinth',
      role: 'vocals',
      primary: true,
      artistGlobeId: 'labrinth',
    },
    { name: 'Zendaya', role: 'vocals', artistGlobeId: 'zendaya' },
    { name: 'Labrinth', role: 'songwriter', artistGlobeId: 'labrinth' },
  ],
  releases: [{ releaseId: 'labrinth-ends-begins' }],
  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      notes:
        'The piano plays the chords as straight eighth notes, each followed by an eighth rest.',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min', chordName: 'Bmin', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'A7', beat: 3, duration: 2 },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min', chordName: 'Bmin', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'A7', beat: 3, duration: 2 },
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
          chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min', chordName: 'Bmin', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'A7', beat: 3, duration: 2 },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min', chordName: 'Bmin', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'A7', beat: 3, duration: 2 },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=54Al9BpiYPw' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
