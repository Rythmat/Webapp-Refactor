import type { Song } from '@/curriculum/types/songLibrary';

export const raging: Song = {
  id: 'raging',
  title: 'Raging',
  artist: 'Kygo',
  year: 2016,
  historicalDescription:
    "Kygo releases 'Raging' in 2016, a track that showcases the Norwegian producer's signature tropical house sound blending organic piano melodies with soaring electronic production. At a time when streaming platforms are reshaping how pop music reaches global audiences, Kygo's emotionally charged style earns him a massive international following and cements his place as a pioneer of the chillwave-meets-pop movement.",
  key: 'D♯ minor',
  keyRoot: 63,
  mode: 'minor',
  tempo: 102,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['pop', 'rock'],
  techniques: [],
  credits: [
    { name: 'Miles Walker', role: 'engineer' },
    {
      name: 'Kygo',
      role: 'performer',
      primary: true,
      artistGlobeId: 'kygo',
    },
    { name: 'Kygo', role: 'producer', artistGlobeId: 'kygo' },
    { name: 'Kygo', role: 'songwriter', artistGlobeId: 'kygo' },
    {
      name: 'Derek Fuhrmann',
      role: 'songwriter',
      artistGlobeId: 'derek-fuhrmann',
    },
    {
      name: 'Mark Williams',
      role: 'songwriter',
      artistGlobeId: 'mark-williams',
    },
    {
      name: 'Kodaline',
      role: 'performer',
      ensemble: true,
      primary: true,
      artistGlobeId: 'kodaline',
    },
    {
      name: 'Derek Fuhrmann',
      role: 'engineer',
      artistGlobeId: 'derek-fuhrmann',
    },
    { name: 'James Bay', role: 'songwriter', artistGlobeId: 'james-bay' },
  ],
  releases: [{ releaseId: 'kygo-cloud-nine', track: 4 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 5', chordName: 'F♯5', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 5', chordName: 'F♯5', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/2', chordName: 'C♯/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 5', chordName: 'F♯5', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'C♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 maj/2', chordName: 'C♯/F', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'C♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
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
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 5', chordName: 'F♯5', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 5', chordName: 'F♯5', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 5', chordName: 'F♯5', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/2', chordName: 'C♯/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 5', chordName: 'F♯5', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'C♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 maj/2', chordName: 'C♯/F', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'pre_chorus',
      label: 'Pre-Chorus',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'C♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [], restBars: 1 },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'C♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=ZWyktWYW3ZM' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/kygo.webp',
  popularity: 50,
};
