import type { Song } from '@/curriculum/types/songLibrary';

export const they_long_to_be_close_to_you: Song = {
  id: 'they_long_to_be_close_to_you',
  title: '(They Long To Be) Close To You',
  artist: 'The Carpenters',
  year: 1970,
  historicalDescription:
    "The Carpenters release '(They Long To Be) Close To You', transforming a Burt Bacharach and Hal David composition into a soft-pop landmark. Karen Carpenter's warm, intimate alto and the song's lush orchestration capture a mood of gentle longing that defines the early 1970s easy listening sound. It hits #1 and launches the duo from Downey, California into global stardom.",
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 88,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['pop'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        {
          chords: [
            { degree: '4 add2', chordName: 'Cadd2', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 add2', chordName: 'Cadd2', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 add2', chordName: 'Cadd2', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 add2', chordName: 'Cadd2', beat: 1, duration: 4 },
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
            { degree: '4 add2', chordName: 'Cadd2', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '3 sus4', chordName: 'Bsus4', beat: 1, duration: 2 },
            { degree: '3 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '6 min', chordName: 'Emin', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj9', chordName: 'Cmaj9', beat: 1, duration: 2 },
            { degree: '4 add2', chordName: 'Cadd2', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '4 add2', chordName: 'Cadd2', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj9', chordName: 'Gmaj9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj9', chordName: 'Gmaj9', beat: 1, duration: 4 },
          ],
          ending: [1],
          repeatEnd: true,
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'G7', beat: 1, duration: 4 }],
          ending: [2],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '4 maj', chordName: 'C', beat: 1, duration: 1 },
            { degree: '4 maj6', chordName: 'C6', beat: 2, duration: 1 },
            { degree: '4 maj7', chordName: 'Cmaj7', beat: 3, duration: 1 },
            { degree: '4 maj6', chordName: 'C6', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'C', beat: 1, duration: 1 },
            { degree: '4 maj6', chordName: 'C6', beat: 2, duration: 1 },
            { degree: '4 maj7', chordName: 'Cmaj7', beat: 3, duration: 1 },
            { degree: '4 maj6', chordName: 'C6', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/6', chordName: 'D/E', beat: 1, duration: 2 },
            { degree: '6 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '6 dom9', chordName: 'E9', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 add2', chordName: 'Cadd2', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj7', chordName: 'Cmaj7', beat: 1, duration: 2 },
            { degree: '4 maj6', chordName: 'C6', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 dom7', chordName: 'E♭7sus4', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'E♭', beat: 1, duration: 4 }],
          cue: 'Break',
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '4 add2', chordName: 'Cadd2', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 sus4', chordName: 'Bsus4', beat: 1, duration: 2 },
            { degree: '3 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '6 min', chordName: 'Emin', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj9', chordName: 'Cmaj9', beat: 1, duration: 2 },
            { degree: '4 add2', chordName: 'Cadd2', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '4 add2', chordName: 'Cadd2', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj9', chordName: 'Gmaj9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj9', chordName: 'Gmaj9', beat: 1, duration: 4 },
          ],
          cue: 'Break',
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse',
      instrumental: 'first-time',
      bars: [
        {
          chords: [
            { degree: '4 add2', chordName: 'D♭add2', beat: 1, duration: 4 },
          ],
          segno: true,
          keyChange: 'A♭ major',
        },
        {
          chords: [
            { degree: '3 sus4', chordName: 'Csus4', beat: 1, duration: 2 },
            { degree: '3 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 2 },
            { degree: '6 min', chordName: 'Fmin', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj9', chordName: 'D♭maj9', beat: 1, duration: 2 },
            { degree: '4 add2', chordName: 'D♭add2', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'D♭', beat: 1, duration: 2 },
            { degree: '4 add2', chordName: 'D♭add2', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj9', chordName: 'A♭maj9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj9', chordName: 'A♭maj9', beat: 1, duration: 4 },
          ],
          toCoda: true,
        },
      ],
    },
    {
      id: 'bridge_2',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '4 maj', chordName: 'D♭', beat: 1, duration: 1 },
            { degree: '4 maj6', chordName: 'D♭6', beat: 2, duration: 1 },
            { degree: '4 maj7', chordName: 'D♭maj7', beat: 3, duration: 1 },
            { degree: '4 maj6', chordName: 'D♭6', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'D♭', beat: 1, duration: 1 },
            { degree: '4 maj6', chordName: 'D♭6', beat: 2, duration: 1 },
            { degree: '4 maj7', chordName: 'D♭maj7', beat: 3, duration: 1 },
            { degree: '4 maj6', chordName: 'D♭6', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/6', chordName: 'E♭/F', beat: 1, duration: 2 },
            { degree: '6 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '6 dom9', chordName: 'F9', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 add2', chordName: 'D♭add2', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj7', chordName: 'D♭maj7', beat: 1, duration: 2 },
            { degree: '4 maj6', chordName: 'D♭6', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♯5 dom7', chordName: 'E7sus4', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♯5 maj', chordName: 'E', beat: 1, duration: 4 }],
          cue: 'Break',
          jump: 'D.S. al Coda',
        },
      ],
    },
    {
      id: 'tag',
      label: 'Tag',
      bars: [
        {
          chords: [
            { degree: '4 maj9', chordName: 'D♭maj9', beat: 1, duration: 2 },
            { degree: '4 add2', chordName: 'D♭add2', beat: 3, duration: 2 },
          ],
          coda: true,
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'D♭', beat: 1, duration: 2 },
            { degree: '4 add2', chordName: 'D♭add2', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj9', chordName: 'A♭maj9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj9', chordName: 'A♭maj9', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'interlude',
      label: 'Interlude',
      bars: [
        {
          chords: [
            { degree: '4 add2', chordName: 'D♭add2', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 add2', chordName: 'D♭add2', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 add2', chordName: 'D♭add2', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 add2', chordName: 'D♭add2', beat: 1, duration: 4 },
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
            { degree: '4 add2', chordName: 'D♭add2', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D♭', beat: 3, duration: 2 },
          ],
          repeatStart: true,
          cue: 'Repeat and Fade',
        },
        {
          chords: [
            { degree: '4 add2', chordName: 'D♭add2', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj9', chordName: 'A♭maj9', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj9', chordName: 'A♭maj9', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=NpQRsXrduc8' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/the-carpenters.webp',
  popularity: 50,
};
