import type { Song } from '@/curriculum/types/songLibrary';

export const ebony_eyes: Song = {
  id: 'ebony_eyes',
  title: 'Ebony Eyes',
  artist: 'Stevie Wonder',
  year: 1976,
  historicalDescription:
    "Stevie Wonder releases 'Ebony Eyes' in 1976, deep in his celebrated run of classic albums that redefined what soul and pop music could be. A smooth, funky groove showcasing his mastery of melody and arrangement, the track reflects the rich creative peak of a period in which Wonder almost single-handedly elevates Black pop to new artistic heights.",
  key: 'B♭ major',
  keyRoot: 70,
  mode: 'major',
  tempo: 102,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['funk', 'pop'],
  techniques: [],
  credits: [
    { name: 'Jim Horn', role: 'performer' },
    {
      name: 'Stevie Wonder',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'stevie-wonder',
      primary: true,
    },
    { name: 'Stevie Wonder', role: 'arranger', artistGlobeId: 'stevie-wonder' },
    { name: 'Nathan Watts', role: 'performer', instrument: 'electric-bass' },
    { name: 'Stevie Wonder', role: 'producer', artistGlobeId: 'stevie-wonder' },
    {
      name: 'Stevie Wonder',
      role: 'vocals',
      artistGlobeId: 'stevie-wonder',
      primary: true,
    },
    {
      name: 'Sneaky Pete Kleinow',
      role: 'performer',
      instrument: 'pedal-steel',
    },
    {
      name: 'Stevie Wonder',
      role: 'songwriter',
      artistGlobeId: 'stevie-wonder',
    },
    {
      name: 'Stevie Wonder',
      role: 'performer',
      artistGlobeId: 'stevie-wonder',
      primary: true,
    },
  ],
  releases: [{ releaseId: 'stevie-wonder-songs-in-the-key-of-life' }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        {
          chords: [
            { degree: '5 dom7', chordName: 'F7(♯5)', beat: 1, duration: 4 },
          ],
          restBars: 1,
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
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '3 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '3 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [{ degree: '6 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯2 dim7', chordName: 'C♯dim7', beat: 1, duration: 4 },
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
            { degree: '1 maj/5', chordName: 'B♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '6 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯4 dim7', chordName: 'Edim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'B♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'B♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯4 dim7', chordName: 'Edim7', beat: 1, duration: 4 },
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
            { degree: '1 maj/5', chordName: 'B♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '6 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'F7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'F7(♯5)', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '3 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '3 dom7', chordName: 'D7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [{ degree: '6 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯2 dim7', chordName: 'C♯dim7', beat: 1, duration: 4 },
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
            { degree: '1 maj/5', chordName: 'B♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '6 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯4 dim7', chordName: 'Edim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'B♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'B♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯4 dim7', chordName: 'Edim7', beat: 1, duration: 4 },
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
            { degree: '1 maj/5', chordName: 'B♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '6 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 dom7', chordName: 'C7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'F7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=sqKyPQUReys' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/stevie-wonder.webp',
  popularity: 50,
};
