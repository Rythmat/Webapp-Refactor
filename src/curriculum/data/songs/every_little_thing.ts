import type { Song } from '@/curriculum/types/songLibrary';

export const every_little_thing: Song = {
  id: 'every_little_thing',
  title: 'Every Little Thing',
  artist: 'Chaka Khan',
  year: 1996,
  historicalDescription:
    "Chaka Khan releases 'Every Little Thing' in 1996, drawing on her decades of soul and R&B mastery to navigate the shifting landscape of mid-90s funky pop. The track showcases the vocal power and emotional depth that have defined her career since her Rufus days — a reminder that few voices in popular music can match her range and authority.",
  key: 'F minor',
  keyRoot: 65,
  mode: 'minor',
  tempo: 94,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['funky_pop'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        { chords: [], restBars: 7 },
        { chords: [], restBars: 1 },
        {
          chords: [
            { degree: '♭2 13', chordName: 'G♭13', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'F7(♯5)', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '1 min7/4', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭2 13', chordName: 'G♭13', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7/4', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭2 13', chordName: 'G♭13', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
        {
          chords: [
            { degree: '1 min7/4', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭2 13', chordName: 'G♭13', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7/4', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭2 13', chordName: 'G♭13', beat: 1, duration: 2 },
            { degree: '1 7', chordName: 'F7(♯5)', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        {
          chords: [
            { degree: '1 min7/4', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭2 13', chordName: 'G♭13', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7/4', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭2 13', chordName: 'G♭13', beat: 1, duration: 4 },
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
            { degree: '1 min7/4', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭2 13', chordName: 'G♭13', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7/4', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭2 13', chordName: 'G♭13', beat: 1, duration: 2 },
            { degree: '3 7', chordName: 'A♭7sus', beat: 3, duration: 2 },
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
            { degree: '1 min7/4', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭2 13', chordName: 'G♭13', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '6 maj/3', chordName: 'D♭/A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭2 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '3 7', chordName: 'A♭7sus', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      bars: [
        {
          chords: [
            { degree: '1 min7/4', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭2 13', chordName: 'G♭13', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '6 maj/3', chordName: 'D♭/A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭2 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '1 7', chordName: 'F7(♯5)', beat: 3, duration: 2 },
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
            { degree: '1 min7/4', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭2 13', chordName: 'G♭13', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7/4', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭2 13', chordName: 'G♭13', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      bars: [
        {
          chords: [
            { degree: '1 min7/4', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭2 13', chordName: 'G♭13', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7/4', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭2 13', chordName: 'G♭13', beat: 1, duration: 2 },
            { degree: '1 7', chordName: 'F7(♯5)', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      bars: [
        { chords: [], restBars: 7 },
        { chords: [], restBars: 1 },
        {
          chords: [
            { degree: '♭2 13', chordName: 'G♭13', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'F7(♯5)', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        {
          chords: [
            { degree: '3 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_l',
      label: 'Section L',
      bars: [
        {
          chords: [
            { degree: '1 7', chordName: 'F7(♯5)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7', chordName: 'F7(♯5)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_m',
      label: 'Section M',
      bars: [
        {
          chords: [
            { degree: '♯3 7', chordName: 'A7(♯5)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯3 7', chordName: 'A7(♯5)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_n',
      label: 'Section N',
      bars: [
        { chords: [{ degree: '3 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯3 dim7', chordName: 'Adim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '1 7', chordName: 'F7(♯5)', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '1 7', chordName: 'F7(♯5)', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_g_2',
      label: 'Section G',
      bars: [
        {
          chords: [
            { degree: '1 min7/4', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭2 13', chordName: 'G♭13', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7/4', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭2 13', chordName: 'G♭13', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_p',
      label: 'Section P',
      bars: [
        {
          chords: [
            { degree: '1 min7/4', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭2 13', chordName: 'G♭13', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7/4', chordName: 'Fmin7/B♭', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭2 13', chordName: 'G♭13', beat: 1, duration: 2 },
            { degree: '1 7', chordName: 'F7(♯5)', beat: 3, duration: 2 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=IGAKs0a-uiY' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
