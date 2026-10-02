import type { Song } from '@/curriculum/types/songLibrary';

export const gold_on_the_ceiling: Song = {
  id: 'gold_on_the_ceiling',
  title: 'Gold On The Ceiling',
  artist: 'The Black Keys',
  year: 2012,
  historicalDescription:
    "The Black Keys release 'Gold On The Ceiling' from their album 'El Camino', a stomping, fuzzed-out anthem that cements the Akron duo's transformation from underground blues-rock act to arena-ready rock stars. Built on a hypnotic riff and layered harmonies, the track captures a band at the peak of their powers — proving that raw, guitar-driven rock can still command mainstream attention in the age of electronic pop.",
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 130,
  timeSignature: [4, 4],

  difficulty: 1,
  genreTags: ['rock'],
  techniques: [],
  session: { studioId: 'easy-eye-sound-studios' },
  credits: [
    { name: 'Tchad Blake', role: 'engineer' },
    {
      name: 'The Black Keys',
      role: 'performer',
      ensemble: true,
      artistGlobeId: 'the-black-keys',
      primary: true,
    },
    { name: 'Dan Auerbach', role: 'songwriter', artistGlobeId: 'dan-auerbach' },
    { name: 'Brian Burton', role: 'songwriter', artistGlobeId: 'brian-burton' },
    { name: 'Kennie Takahashi', role: 'engineer' },
    {
      name: 'The Black Keys',
      role: 'producer',
      ensemble: true,
      artistGlobeId: 'the-black-keys',
    },
    {
      name: 'Patrick Carney',
      role: 'songwriter',
      artistGlobeId: 'patrick-carney',
    },
    { name: 'Danger Mouse', role: 'producer', artistGlobeId: 'danger-mouse' },
  ],
  releases: [{ releaseId: 'the-black-keys-el-camino', track: 3 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        { chords: [], restBars: 3 },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'pre_chorus',
      label: 'Pre-Chorus',
      bars: [
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'C/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'interlude',
      label: 'Interlude',
      instrumental: true,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      instrumental: true,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=6yCIDkFI7ew' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/the-black-keys.webp',
  popularity: 50,
};
