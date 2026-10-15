import type { Song } from '@/curriculum/types/songLibrary';

export const japanese_denim: Song = {
  id: 'japanese_denim',
  title: 'Japanese Denim',
  artist: 'Daniel Caesar',
  year: 2016,
  historicalDescription:
    "Daniel Caesar releases 'Japanese Denim' alongside 'Get You', a slow 12/8 love song from the young Toronto singer, produced with Jordan Evans and Matthew Burnett. Its borrowed A-flat minor and D-flat 7, the 'backdoor' route home to E-flat, give it a vintage soul sweetness, and the song becomes a word-of-mouth favourite that helps build the audience for his debut album 'Freudian'.",
  key: 'E♭ major',
  keyRoot: 63,
  mode: 'major',
  tempo: 41,
  timeSignature: [12, 8],
  difficulty: 2,
  genreTags: ['rnb'],
  techniques: [],
  credits: [
    {
      name: 'Daniel Caesar',
      role: 'vocals',
      primary: true,
      artistGlobeId: 'daniel-caesar',
    },
    { name: 'Jordan Evans', role: 'producer', artistGlobeId: 'jordan-evans' },
    {
      name: 'Matthew Burnett',
      role: 'producer',
      artistGlobeId: 'matthew-burnett',
    },
  ],
  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        {
          chords: [{ degree: '5 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min', chordName: 'Fmin', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min', chordName: 'A♭min', beat: 1, duration: 2 },
            { degree: '♭7 dom7', chordName: 'D♭7', beat: 3, duration: 2 },
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
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        {
          chords: [{ degree: '5 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min', chordName: 'Fmin', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min', chordName: 'A♭min', beat: 1, duration: 2 },
            { degree: '♭7 dom7', chordName: 'D♭7', beat: 3, duration: 2 },
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
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        {
          chords: [{ degree: '5 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min', chordName: 'Fmin', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min', chordName: 'A♭min', beat: 1, duration: 2 },
            { degree: '♭7 dom7', chordName: 'D♭7', beat: 3, duration: 2 },
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
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        {
          chords: [{ degree: '5 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min', chordName: 'Fmin', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min', chordName: 'A♭min', beat: 1, duration: 2 },
            { degree: '♭7 dom7', chordName: 'D♭7', beat: 3, duration: 2 },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '♭3 maj7', chordName: 'G♭maj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj7', chordName: 'A♭maj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min', chordName: 'A♭min', beat: 1, duration: 2 },
            { degree: '♭7 dom7', chordName: 'D♭7', beat: 3, duration: 2 },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 3',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        {
          chords: [{ degree: '5 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min', chordName: 'Fmin', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min', chordName: 'A♭min', beat: 1, duration: 2 },
            { degree: '♭7 dom7', chordName: 'D♭7', beat: 3, duration: 2 },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=FG2PgVl0Nlc' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
