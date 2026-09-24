import type { Song } from '@/curriculum/types/songLibrary';

export const take_back_the_night: Song = {
  id: 'take_back_the_night',
  title: 'Take Back The Night',
  artist: 'Justin Timberlake',
  year: 2013,
  historicalDescription:
    "Justin Timberlake releases 'Take Back The Night' in 2013, a funk-drenched throwback that channels the spirit of late-70s disco and early Michael Jackson. The track arrives as part of his ambitious comeback era, signaling a bold pivot away from contemporary pop trends toward vintage grooves — and proving Timberlake's instinct for reviving classic sounds for a new generation.",
  key: 'B mixolydian',
  keyRoot: 71,
  mode: 'mixolydian',
  tempo: 108,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop', 'rock'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        { chords: [], restBars: 1 },
        {
          chords: [
            { degree: '♭6 maj', chordName: 'G', beat: 1, duration: 1 },
            { degree: '5 min7', chordName: 'F♯min7', beat: 2, duration: 1 },
            { degree: '4 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 1 },
            { degree: '♭7 7', chordName: 'A7sus', beat: 2, duration: 1 },
            { degree: '♭3 maj/5', chordName: 'D/F♯', beat: 3, duration: 1 },
            { degree: '4 min7', chordName: 'Emin7', beat: 3.5, duration: 1 },
            { degree: '♭7 7', chordName: 'A7', beat: 4, duration: 1 },
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
            { degree: '♭7 maj/1', chordName: 'A/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'A/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭7', chordName: 'G/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭7', chordName: 'G/A', beat: 1, duration: 4 },
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
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 7', chordName: 'B7sus', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 7', chordName: 'B7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 7', chordName: 'A7sus', beat: 1, duration: 1 },
            { degree: '♭3 maj/5', chordName: 'D/F♯', beat: 2, duration: 1 },
            { degree: '4 min7', chordName: 'Emin7', beat: 3, duration: 1 },
            { degree: '♭7 7', chordName: 'A7', beat: 4, duration: 1 },
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
            { degree: '♭7 maj/1', chordName: 'A/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'A/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭7', chordName: 'G/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭7', chordName: 'G/A', beat: 1, duration: 4 },
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
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 7', chordName: 'B7sus', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 7', chordName: 'B7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 7', chordName: 'A7sus', beat: 1, duration: 1 },
            { degree: '♭3 maj/5', chordName: 'D/F♯', beat: 2, duration: 1 },
            { degree: '4 min7', chordName: 'Emin7', beat: 3, duration: 1 },
            { degree: '♭7 7', chordName: 'A7', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 5',
      bars: [
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'A/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'A/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭7', chordName: 'G/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/♭7', chordName: 'G/A', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=DEzREJbln-o' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/justin-timberlake.webp',
  popularity: 50,
};
