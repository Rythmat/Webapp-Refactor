import type { Song } from '@/curriculum/types/songLibrary';

export const kill_bill: Song = {
  id: 'kill_bill',
  title: 'Kill Bill',
  artist: 'SZA',
  composer: 'SZA, Rob Bisel and Carter Lang',
  year: 2022,
  historicalDescription:
    "SZA sings 'Kill Bill' on her second album 'SOS', a darkly funny revenge fantasy about an ex, named for Quentin Tarantino's film and sung over a breezy loop of B-flat minor 7, E-flat, A-flat major 7 and a sly A diminished. It spends a record 21 weeks at No. 1 on Billboard's Hot R&B/Hip-Hop Songs chart, climbs to No. 1 on the Hot 100 in 2023, and earns Grammy nominations for Record and Song of the Year.",
  key: 'A♭ major',
  keyRoot: 68,
  mode: 'major',
  tempo: 89,
  timeSignature: [4, 4],
  difficulty: 2,
  genreTags: ['rnb'],
  techniques: [],
  credits: [
    { name: 'SZA', role: 'vocals', primary: true, artistGlobeId: 'sza' },
    { name: 'SZA', role: 'songwriter', artistGlobeId: 'sza' },
    { name: 'Rob Bisel', role: 'songwriter', artistGlobeId: 'rob-bisel' },
    { name: 'Carter Lang', role: 'songwriter', artistGlobeId: 'carter-lang' },
    { name: 'Rob Bisel', role: 'producer', artistGlobeId: 'rob-bisel' },
    { name: 'Carter Lang', role: 'producer', artistGlobeId: 'carter-lang' },
  ],
  releases: [{ releaseId: 'sza-sos' }],
  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [{ degree: '5 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj7', chordName: 'A♭maj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯1 dim', chordName: 'Adim', beat: 1, duration: 4 },
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
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [{ degree: '5 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj7', chordName: 'A♭maj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯1 dim', chordName: 'Adim', beat: 1, duration: 4 },
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
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [{ degree: '5 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj7', chordName: 'A♭maj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯1 dim', chordName: 'Adim', beat: 1, duration: 4 },
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
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [{ degree: '5 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj7', chordName: 'A♭maj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯1 dim', chordName: 'Adim', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [{ degree: '5 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj7', chordName: 'A♭maj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯1 dim', chordName: 'Adim', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
          cue: 'Repeat and Fade',
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=SQnc1QibapQ' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
