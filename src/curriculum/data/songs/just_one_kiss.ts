import type { Song } from '@/curriculum/types/songLibrary';

export const just_one_kiss: Song = {
  id: 'just_one_kiss',
  title: 'Just One Kiss',
  artist: 'Raphael Saadiq',
  year: 2008,
  historicalDescription:
    "Raphael Saadiq releases 'Just One Kiss' as part of his celebrated return to classic soul, channeling the spirit of Motown and 1960s R&B with meticulous period authenticity. The track showcases his gift for making vintage sound feel urgent and alive, reinforcing his reputation as one of soul music's most devoted and skilled revivalists of the 2000s.",
  key: 'E major',
  keyRoot: 64,
  mode: 'major',
  tempo: 97,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk', 'rnb'],
  techniques: [],
  credits: [
    {
      name: 'Raphael Saadiq',
      role: 'performer',
      primary: true,
      artistGlobeId: 'raphael-saadiq',
    },
    {
      name: 'Raphael Saadiq',
      role: 'songwriter',
      artistGlobeId: 'raphael-saadiq',
    },
    {
      name: 'Joss Stone',
      role: 'performer',
      primary: true,
      artistGlobeId: 'joss-stone',
    },
  ],
  releases: [{ releaseId: 'raphael-saadiq-the-way-i-see-it', track: 5 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        { chords: [], fermata: true },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 dom7', chordName: 'B7', beat: 1, duration: 4 }],
          repeatEnd: true,
          repeatTimes: 3,
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=NNw_IpH1Imc' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/raphael-saadiq.webp',
  popularity: 50,
};
