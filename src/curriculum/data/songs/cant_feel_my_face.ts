import type { Song } from '@/curriculum/types/songLibrary';

export const cant_feel_my_face: Song = {
  id: 'cant_feel_my_face',
  title: "Can't Feel My Face",
  artist: 'The Weeknd',
  year: 2015,

  historicalDescription:
    "The Weeknd releases 'Can't Feel My Face', a sleek pop anthem that marks his breakthrough into mainstream radio. Produced with Max Martin, the track wraps a dark narrative about destructive obsession in an irresistibly upbeat, Michael Jackson-influenced groove — demonstrating that Abel Tesfaye can conquer pop without abandoning his signature unease.",
  key: 'A minor',
  keyRoot: 69,
  mode: 'minor',
  tempo: 108,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop', 'rock'],
  techniques: [],
  credits: [
    { name: 'Serban Ghenea', role: 'engineer' },
    { name: 'Ali Payami', role: 'producer', artistGlobeId: 'ali-payami' },
    {
      name: 'Peter Svensson',
      role: 'performer',
      artistGlobeId: 'peter-svensson',
    },
    { name: 'John Hanes', role: 'engineer' },
    { name: 'Max Martin', role: 'producer', artistGlobeId: 'max-martin' },
    {
      name: 'Peter Svensson',
      role: 'songwriter',
      artistGlobeId: 'peter-svensson',
    },
    { name: 'The Weeknd', role: 'songwriter', artistGlobeId: 'the-weeknd' },
    { name: 'Max Martin', role: 'songwriter', artistGlobeId: 'max-martin' },
    { name: 'Peter Carlsson', role: 'arranger' },
    {
      name: 'Savan Kotecha',
      role: 'songwriter',
      artistGlobeId: 'savan-kotecha',
    },
    { name: 'Ali Payami', role: 'performer', artistGlobeId: 'ali-payami' },
    { name: 'Sam Holland', role: 'engineer' },
    {
      name: 'Ali Payami',
      role: 'performer',
      instrument: 'synthesizer',
      artistGlobeId: 'ali-payami',
    },
    {
      name: 'Ali Payami',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'ali-payami',
    },
    { name: 'Ali Payami', role: 'songwriter', artistGlobeId: 'ali-payami' },
  ],
  releases: [{ releaseId: 'the-weeknd-beauty-behind-the-madness', track: 7 }],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        {
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [], restBars: 1 },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=KEI4qSrkPAs' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/the-weeknd.webp',
  popularity: 50,
};
