import type { Song } from '@/curriculum/types/songLibrary';

export const easy_goin_evening_my_mamas_call: Song = {
  id: 'easy_goin_evening_my_mamas_call',
  title: 'Easy Goin’ Evening (My Mama’s Call)',
  artist: 'Stevie Wonder',
  year: 1976,
  historicalDescription:
    "Stevie Wonder releases 'Easy Goin' Evening (My Mama's Call)' as part of his landmark run of 1970s albums, a period widely regarded as one of the greatest creative streaks in pop music history. The track's slow swing feel reflects Wonder's deep roots in jazz and gospel, weaving a tender homage to maternal love into his expansive sonic vision. It stands as a quiet, intimate moment within one of the most ambitious bodies of work of its era.",
  key: 'G minor',
  keyRoot: 67,
  mode: 'minor',
  tempo: 80,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['jazz'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '♭2 maj/6', chordName: 'A♭/E♭', beat: 1, duration: 1 },
            { degree: '2 maj/1', chordName: 'A/G', beat: 2, duration: 1 },
            { degree: '♯3 maj/1', chordName: 'B/G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭2 maj/1', chordName: 'A♭/G', beat: 1, duration: 1 },
            { degree: '3 min7/1', chordName: 'B♭min7/G', beat: 2, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '♭2 maj/1', chordName: 'A♭/G', beat: 1, duration: 1 },
            { degree: '2 maj/1', chordName: 'A/G', beat: 2, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '♯3 maj/1', chordName: 'B/G', beat: 1, duration: 1 },
            { degree: '1 dim7', chordName: 'Gdim7', beat: 2, duration: 1 },
            { degree: '5 maj/1', chordName: 'D/G', beat: 3, duration: 1 },
            { degree: '1 min7', chordName: 'Gmin7b5', beat: 4, duration: 1 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'G7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 7', chordName: 'F7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
        {
          chords: [
            { degree: '1 maj/3', chordName: 'G/B♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'G/B♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 7', chordName: 'E♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 7', chordName: 'E♭7sus', beat: 1, duration: 4 },
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
            { degree: '7 maj/♭2', chordName: 'F/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 maj/♭2', chordName: 'F/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 7', chordName: 'D♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 7', chordName: 'D♭7sus', beat: 1, duration: 4 },
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
            { degree: '♭2 min7', chordName: 'A♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [{ degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7b5', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      bars: [
        {
          chords: [{ degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Gmin7b5', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '♯7 7', chordName: 'G♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯7 7', chordName: 'G♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯7 7', chordName: 'G♭7(♯5)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯7 7', chordName: 'G♭7(♯5)', beat: 1, duration: 4 },
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
            { degree: '♯7 dim7', chordName: 'G♭dim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯7 dim7', chordName: 'G♭dim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 7', chordName: 'G7sus', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 7', chordName: 'F7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_k',
      label: 'Section K',
      bars: [
        {
          chords: [
            { degree: '1 maj/3', chordName: 'G/B♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'G/B♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 7', chordName: 'E♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 7', chordName: 'E♭7sus', beat: 1, duration: 4 },
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
            { degree: '7 maj/♭2', chordName: 'F/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 maj/♭2', chordName: 'F/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 7', chordName: 'D♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 7', chordName: 'D♭7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_m',
      label: 'Section M',
      measuresPerRow: 3,
      bars: [
        {
          chords: [
            { degree: '♭2 min7', chordName: 'A♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_n',
      label: 'Section N',
      bars: [
        {
          chords: [{ degree: '♭2 7', chordName: 'A♭7', beat: 1, duration: 4 }],
          fermata: true,
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
          fermata: true,
        },
        {
          chords: [{ degree: '♭5 maj', chordName: 'D♭', beat: 1, duration: 4 }],
          fermata: true,
        },
        {
          chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=L0ZXSbUvWWs' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/stevie-wonder.webp',
  popularity: 50,
};
