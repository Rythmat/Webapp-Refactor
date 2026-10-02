import type { Song } from '@/curriculum/types/songLibrary';

export const pride_and_joy: Song = {
  id: 'pride_and_joy',
  title: 'Pride And Joy',
  artist: 'Stevie Ray Vaughan',
  year: 1983,

  historicalDescription:
    "Stevie Ray Vaughan releases 'Pride and Joy', a swaggering blues-rock declaration that announces his arrival as the most electrifying guitarist of his generation. Drawing from Texas blues legends like Lightnin' Hopkins and Albert King, Vaughan drags the blues back into the mainstream at a time when the genre had been pushed to the margins — proving that raw, feeling-soaked guitar could still shake the world.",
  key: 'E♭ major',
  keyRoot: 63,
  mode: 'major',
  tempo: 120,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      instrumental: true,
      bars: [
        { chords: [], restBars: 4 },
        {
          chords: [
            { degree: '1 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=kfjXp4KTTY8' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/stevie-ray-vaughan.webp',
  popularity: 50,
};
