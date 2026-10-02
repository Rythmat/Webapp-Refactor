import type { Song } from '@/curriculum/types/songLibrary';

export const every_little_thing: Song = {
  id: 'every_little_thing',
  title: 'Every Little Thing',
  artist: 'Chaka Khan',
  year: 1996,
  historicalDescription:
    "Chaka Khan releases 'Every Little Thing' in 1996, drawing on her decades of soul and R&B mastery to navigate the shifting landscape of mid-90s funky pop. The track showcases the vocal power and emotional depth that have defined her career since her Rufus days — a reminder that few voices in popular music can match her range and authority.",
  key: 'B♭ minor',
  keyRoot: 70,
  mode: 'minor',
  tempo: 94,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['funk', 'pop'],
  techniques: [],
  credits: [
    { name: 'Bob Power', role: 'engineer', artistGlobeId: 'bob-power' },
  ],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        { chords: [], restBars: 7 },
        { chords: [], restBars: 1 },
        {
          chords: [
            { degree: '♭6 dom13', chordName: 'G♭13', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'F7(♯5)', beat: 1, duration: 4 },
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
            { degree: '5 min7/1', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 dom13', chordName: 'G♭13', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7/1', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 dom13', chordName: 'G♭13', beat: 1, duration: 4 },
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
            { degree: '5 min7/1', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 dom13', chordName: 'G♭13', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7/1', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 dom13', chordName: 'G♭13', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'F7(♯5)', beat: 3, duration: 2 },
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
            { degree: '5 min7/1', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 dom13', chordName: 'G♭13', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7/1', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 dom13', chordName: 'G♭13', beat: 1, duration: 4 },
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
            { degree: '5 min7/1', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 dom13', chordName: 'G♭13', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7/1', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 dom13', chordName: 'G♭13', beat: 1, duration: 2 },
            { degree: '♭7 dom7', chordName: 'A♭7sus', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 min7/1', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 dom13', chordName: 'G♭13', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '♭3 maj/♭7', chordName: 'D♭/A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '♭7 dom7', chordName: 'A♭7sus', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 min7/1', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 dom13', chordName: 'G♭13', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '♭3 maj/♭7', chordName: 'D♭/A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'F7(♯5)', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        {
          chords: [
            { degree: '5 min7/1', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 dom13', chordName: 'G♭13', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7/1', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 dom13', chordName: 'G♭13', beat: 1, duration: 4 },
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
            { degree: '5 min7/1', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 dom13', chordName: 'G♭13', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7/1', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 dom13', chordName: 'G♭13', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'F7(♯5)', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 5',
      bars: [
        { chords: [], restBars: 7 },
        { chords: [], restBars: 1 },
        {
          chords: [
            { degree: '♭6 dom13', chordName: 'G♭13', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'F7(♯5)', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'F7(♯5)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'F7(♯5)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 dom7', chordName: 'A7(♯5)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 dom7', chordName: 'A7(♯5)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 dim7', chordName: 'Adim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'F7(♯5)', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'F7(♯5)', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_6',
      label: 'Verse 6',
      bars: [
        {
          chords: [
            { degree: '5 min7/1', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 dom13', chordName: 'G♭13', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7/1', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 dom13', chordName: 'G♭13', beat: 1, duration: 4 },
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
            { degree: '5 min7/1', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 dom13', chordName: 'G♭13', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7/1', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 dom13', chordName: 'G♭13', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'F7(♯5)', beat: 3, duration: 2 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=IGAKs0a-uiY' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/chaka-khan.webp',
  popularity: 50,
};
