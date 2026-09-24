import type { Song } from '@/curriculum/types/songLibrary';

export const happy: Song = {
  id: 'happy',
  title: 'Happy',
  artist: 'Pharrell Williams',
  year: 2013,
  historicalDescription:
    "Pharrell Williams releases 'Happy', a buoyant, clap-driven anthem written for the animated film Despicable Me 2. The song becomes a global phenomenon, inspiring thousands of fan-made videos from cities around the world — a rare moment where pure, unironic joy cuts through every cultural barrier and dominates charts across continents.",
  key: 'F minor',
  keyRoot: 65,
  mode: 'minor',
  tempo: 160,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop', 'rock'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7(no 3)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7(no 3)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7(no 3)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7(no 3)', beat: 1, duration: 4 },
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
            { degree: '1 dom7', chordName: 'F7(no 3)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7(no 3)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj/1', chordName: 'A♭/F', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'B♭/F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'C/F', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'B♭/F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7(no 3)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7(no 3)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj/1', chordName: 'A♭/F', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'B♭/F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'C/F', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'B♭/F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7(no 3)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7(no 3)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj/1', chordName: 'A♭/F', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'B♭/F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'C/F', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'B♭/F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7(no 3)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7(no 3)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj/1', chordName: 'A♭/F', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'B♭/F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'C/F', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'B♭/F', beat: 3, duration: 2 },
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
            { degree: '♭6 maj7', chordName: 'D♭maj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj7', chordName: 'D♭maj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7(no 3)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7(no 3)', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'interlude_1',
      label: 'Interlude 1',
      instrumental: true,
      bars: [
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7(no 3)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7(no 3)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7(no 3)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7(no 3)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7(no 3)', beat: 1, duration: 4 },
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
            { degree: '1 dom7', chordName: 'F7(no 3)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7(no 3)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj/1', chordName: 'A♭/F', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'B♭/F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'C/F', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'B♭/F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7(no 3)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7(no 3)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj/1', chordName: 'A♭/F', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'B♭/F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'C/F', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'B♭/F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7(no 3)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7(no 3)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj/1', chordName: 'A♭/F', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'B♭/F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'C/F', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'B♭/F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7(no 3)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7(no 3)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj/1', chordName: 'A♭/F', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'B♭/F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'C/F', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'B♭/F', beat: 3, duration: 2 },
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
            { degree: '♭6 maj7', chordName: 'D♭maj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj7', chordName: 'D♭maj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7(no 3)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7(no 3)', beat: 1, duration: 4 },
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
            { degree: '1 dom7', chordName: 'F7(no 3)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7(no 3)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7(no 3)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7(no 3)', beat: 1, duration: 4 },
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
            { degree: '♭6 maj7', chordName: 'D♭maj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj7', chordName: 'D♭maj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7(no 3)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7(no 3)', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'interlude_2',
      label: 'Interlude 2',
      instrumental: true,
      bars: [
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7(no 3)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7(no 3)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7(no 3)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7(no 3)', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_4',
      label: 'Chorus 4',
      bars: [
        {
          chords: [
            { degree: '♭6 maj7', chordName: 'D♭maj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj7', chordName: 'D♭maj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7(no 3)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F7(no 3)', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=ZbZSe6N_BXs' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/pharrell-williams.webp',
  popularity: 50,
};
