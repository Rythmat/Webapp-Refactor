import type { Song } from '@/curriculum/types/songLibrary';

export const vivir_mi_vida: Song = {
  id: 'vivir_mi_vida',
  title: 'Vivir Mi Vida',
  artist: 'Marc Anthony',
  year: 2013,
  historicalDescription:
    "Marc Anthony releases 'Vivir Mi Vida', a jubilant salsa anthem that becomes one of the defining Latin pop hits of the decade. Adapted from the North African classic 'C'est la vie' by Khaled, the song's irresistible rhythm and message of resilience propel Anthony back to the top of the Latin music world, earning him multiple Grammy and Latin Grammy awards.",
  key: 'C minor',
  keyRoot: 60,
  mode: 'minor',
  tempo: 208,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['latin', 'pop'],
  techniques: [],
  releases: [{ releaseId: 'marc-anthony-3-0' }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
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
            { degree: '1 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus',
      bars: [
        {
          chords: [{ degree: '♭3 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
          repeatTimes: 10,
        },
      ],
    },
    {
      id: 'verse_11',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [{ degree: '♭3 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=YXnjy5YlDwk' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/marc-anthony.webp',
  popularity: 50,
};
