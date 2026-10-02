import type { Song } from '@/curriculum/types/songLibrary';

export const sugar: Song = {
  id: 'sugar',
  title: 'Sugar',
  artist: 'Maroon 5',
  year: 2015,
  historicalDescription:
    "Maroon 5 releases 'Sugar', a sleek pop confection that marks the band's full pivot from their rock roots into glossy, radio-ready pop. The song becomes one of the defining singles of 2015, its irresistible hook and funk-inflected groove cementing Adam Levine's knack for crafting mainstream earworms. Its music video — a surprise wedding crasher concept — goes massively viral, amplifying the song's ubiquity.",
  key: 'D♭ major',
  keyRoot: 61,
  mode: 'major',
  tempo: 120,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  credits: [
    { name: 'Dr. Luke', role: 'performer', artistGlobeId: 'dr-luke' },
    { name: 'Doug McKean', role: 'engineer' },
    { name: 'Ammo', role: 'songwriter', artistGlobeId: 'ammo' },
    { name: 'Jacob Kasher', role: 'songwriter', artistGlobeId: 'jacob-kasher' },
    {
      name: 'Cirkut',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'cirkut',
    },
    {
      name: 'Ammo',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'ammo',
    },
    { name: 'Cirkut', role: 'performer', artistGlobeId: 'cirkut' },
    { name: 'PJ Morton', role: 'performer', artistGlobeId: 'pj-morton' },
    {
      name: 'Matt Flynn',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'matt-flynn',
    },
    {
      name: 'Cirkut',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'cirkut',
    },
    {
      name: 'Jesse Carmichael',
      role: 'performer',
      artistGlobeId: 'jesse-carmichael',
    },
    {
      name: 'James Valentine',
      role: 'performer',
      artistGlobeId: 'james-valentine',
    },
    {
      name: 'Dr. Luke',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'dr-luke',
    },
    {
      name: 'Ammo',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'ammo',
    },
    {
      name: 'Dr. Luke',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'dr-luke',
    },
    {
      name: 'Matt Flynn',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'matt-flynn',
    },
    { name: 'Mike Posner', role: 'songwriter', artistGlobeId: 'mike-posner' },
    { name: 'Serban Ghenea', role: 'engineer' },
    {
      name: 'Mickey Madden',
      role: 'performer',
      instrument: 'electric-bass',
      artistGlobeId: 'mickey-madden',
    },
    { name: 'Cirkut', role: 'songwriter', artistGlobeId: 'cirkut' },
    { name: 'Clint Gibbs', role: 'engineer' },
    {
      name: 'Łukasz Gottwald',
      role: 'songwriter',
      artistGlobeId: 'ukasz-gottwald',
    },
    { name: 'Jon Sher', role: 'engineer' },
    { name: 'John Hanes', role: 'engineer' },
    {
      name: 'Dr. Luke',
      role: 'performer',
      instrument: 'synth-bass',
      artistGlobeId: 'dr-luke',
    },
    { name: 'Adam Levine', role: 'songwriter', artistGlobeId: 'adam-levine' },
    { name: 'Ammo', role: 'producer', artistGlobeId: 'ammo' },
    { name: 'Adam Levine', role: 'vocals', artistGlobeId: 'adam-levine' },
    { name: 'Cirkut', role: 'producer', artistGlobeId: 'cirkut' },
    { name: 'Noah Passovoy', role: 'engineer' },
    { name: 'Mike Posner', role: 'vocals', artistGlobeId: 'mike-posner' },
    { name: 'Ammo', role: 'performer', artistGlobeId: 'ammo' },
  ],
  releases: [{ releaseId: 'maroon-5-v', track: 5 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      repeatCount: 16,
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=09R8_2nJtjg' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/maroon-5.webp',
  popularity: 50,
};
