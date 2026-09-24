import type { Song } from '@/curriculum/types/songLibrary';

export const a_thousand_years: Song = {
  id: 'a_thousand_years',
  title: 'A Thousand Years',
  artist: 'Christina Perri',
  year: 2011,
  historicalDescription:
    "Christina Perri releases 'A Thousand Years' as part of The Twilight Saga: Breaking Dawn soundtrack, turning a declaration of eternal love into a global phenomenon. The song transcends its film origins, becoming one of the most streamed love songs of the decade and a staple at weddings worldwide — a rare pop ballad that genuinely crosses over from teen fantasy into timeless romance.",
  key: 'B♭ major',
  keyRoot: 70,
  mode: 'major',
  tempo: 142,
  timeSignature: [6, 4],

  difficulty: 2,
  genreTags: ['pop'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'F/A', beat: 1, duration: 3 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 4, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'F', beat: 1, duration: 3 },
            { degree: '4 maj', chordName: 'E♭', beat: 4, duration: 3 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'B♭/D', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'B♭/D', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'F/A', beat: 1, duration: 3 },
            { degree: '1 maj', chordName: 'B♭', beat: 4, duration: 3 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
      ],
    },
    {
      id: 'pre_chorus_1',
      label: 'Pre-Chorus 1',
      bars: [
        {
          chords: [
            { degree: '1 maj/3', chordName: 'B♭/D', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'B♭/D', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'F/A', beat: 1, duration: 3 },
            { degree: '1 maj', chordName: 'B♭', beat: 4, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Cmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Cmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'F/A', beat: 1, duration: 3 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 4, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
      ],
    },
    {
      id: 'interlude',
      label: 'Interlude',
      instrumental: true,
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 6 }] },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'B♭/D', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'B♭/D', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'F/A', beat: 1, duration: 3 },
            { degree: '1 maj', chordName: 'B♭', beat: 4, duration: 3 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
      ],
    },
    {
      id: 'pre_chorus_2',
      label: 'Pre-Chorus 2',
      bars: [
        {
          chords: [
            { degree: '1 maj/3', chordName: 'B♭/D', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'B♭/D', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'F/A', beat: 1, duration: 3 },
            { degree: '1 maj', chordName: 'B♭', beat: 4, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Cmin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'F/A', beat: 1, duration: 3 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 4, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Cmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Cmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Cmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Cmin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 3 },
            { degree: '5 maj/7', chordName: 'F/A', beat: 4, duration: 3 },
          ],
        },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 3',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'F/A', beat: 1, duration: 3 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 4, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'B♭/D', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'B♭/D', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 6 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=rtOvBOTyX00' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/christina-perri.webp',
  popularity: 50,
};
