import type { Song } from '@/curriculum/types/songLibrary';

export const easy_goin_evening_my_mamas_call: Song = {
  id: 'easy_goin_evening_my_mamas_call',
  title: 'Easy Goin’ Evening (My Mama’s Call)',
  artist: 'Stevie Wonder',
  year: 1976,
  historicalDescription:
    "Stevie Wonder releases 'Easy Goin' Evening (My Mama's Call)' as part of his landmark run of 1970s albums, a period widely regarded as one of the greatest creative streaks in pop music history. The track's slow swing feel reflects Wonder's deep roots in jazz and gospel, weaving a tender homage to maternal love into his expansive sonic vision. It stands as a quiet, intimate moment within one of the most ambitious bodies of work of its era.",
  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 80,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['jazz'],
  techniques: [],
  credits: [
    {
      name: 'Stevie Wonder',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'stevie-wonder',
      primary: true,
    },
    { name: 'Stevie Wonder', role: 'arranger', artistGlobeId: 'stevie-wonder' },
    { name: 'Stevie Wonder', role: 'producer', artistGlobeId: 'stevie-wonder' },
    {
      name: 'Stevie Wonder',
      role: 'performer',
      instrument: 'fender-rhodes',
      artistGlobeId: 'stevie-wonder',
      primary: true,
    },
    { name: 'Nathan Watts', role: 'performer', instrument: 'electric-bass' },
    {
      name: 'Stevie Wonder',
      role: 'performer',
      instrument: 'harmonica',
      artistGlobeId: 'stevie-wonder',
      primary: true,
    },
    {
      name: 'Stevie Wonder',
      role: 'songwriter',
      artistGlobeId: 'stevie-wonder',
    },
  ],
  releases: [{ releaseId: 'stevie-wonder-songs-in-the-key-of-life' }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        {
          chords: [
            { degree: '♭6 maj/♭3', chordName: 'A♭/E♭', beat: 1, duration: 1 },
            { degree: '6 maj/5', chordName: 'A/G', beat: 2, duration: 1 },
            { degree: '7 maj/5', chordName: 'B/G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/5', chordName: 'A♭/G', beat: 1, duration: 1 },
            {
              degree: '♭7 min7/5',
              chordName: 'B♭min7/G',
              beat: 2,
              duration: 3,
            },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/5', chordName: 'A♭/G', beat: 1, duration: 1 },
            { degree: '6 maj/5', chordName: 'A/G', beat: 2, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '7 maj/5', chordName: 'B/G', beat: 1, duration: 1 },
            { degree: '5 dim7', chordName: 'Gdim7', beat: 2, duration: 1 },
            { degree: '2 maj/5', chordName: 'D/G', beat: 3, duration: 1 },
            { degree: '5 min7', chordName: 'Gmin7b5', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      instrumental: true,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 dom7', chordName: 'F7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'F7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 maj/♭7', chordName: 'G/B♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/♭7', chordName: 'G/B♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'E♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'E♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/♭6', chordName: 'F/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/♭6', chordName: 'F/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭2 dom7', chordName: 'D♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭2 dom7', chordName: 'D♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 min7', chordName: 'A♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      instrumental: true,
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Gmin7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Gmin7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Gmin7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Gmin7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 dom7', chordName: 'G♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 dom7', chordName: 'G♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 dom7', chordName: 'G♭7(♯5)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 dom7', chordName: 'G♭7(♯5)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 dim7', chordName: 'G♭dim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 dim7', chordName: 'G♭dim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'G7sus', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      instrumental: true,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 dom7', chordName: 'F7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'F7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 maj/♭7', chordName: 'G/B♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/♭7', chordName: 'G/B♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'E♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'E♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/♭6', chordName: 'F/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/♭6', chordName: 'F/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭2 dom7', chordName: 'D♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭2 dom7', chordName: 'D♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 min7', chordName: 'A♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      instrumental: true,
      bars: [
        {
          chords: [
            { degree: '♭6 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
          fermata: true,
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
          fermata: true,
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'D♭', beat: 1, duration: 4 }],
          fermata: true,
        },
        {
          chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }],
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
