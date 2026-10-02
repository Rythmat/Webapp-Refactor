import type { Song } from '@/curriculum/types/songLibrary';

export const despacito: Song = {
  id: 'despacito',
  title: 'Despacito',
  artist: 'Luis Fonsi',
  year: 2017,
  historicalDescription:
    "Luis Fonsi releases 'Despacito', a sun-drenched Latin pop track that becomes one of the most-streamed songs in history and ignites a global wave of reggaeton and Latin urban music. Its crossover appeal — amplified by a remix featuring Justin Bieber — breaks language barriers and proves that Spanish-language pop can dominate mainstream charts worldwide.",
  key: 'B minor',
  keyRoot: 71,
  mode: 'minor',
  tempo: 180,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['latin', 'pop'],
  techniques: [],
  credits: [
    { name: 'Erika Ender', role: 'songwriter', artistGlobeId: 'erika-ender' },
    { name: 'Daddy Yankee', role: 'songwriter', artistGlobeId: 'daddy-yankee' },
    {
      name: 'Luis Fonsi',
      role: 'performer',
      primary: true,
      artistGlobeId: 'luis-fonsi',
    },
    {
      name: 'Mauricio Rengifo',
      role: 'producer',
      artistGlobeId: 'mauricio-rengifo',
    },
    { name: 'Andrés Torres', role: 'producer', artistGlobeId: 'andres-torres' },
    { name: 'Luis Fonsi', role: 'songwriter', artistGlobeId: 'luis-fonsi' },
    {
      name: 'Daddy Yankee',
      role: 'performer',
      primary: true,
      artistGlobeId: 'daddy-yankee',
    },
  ],
  releases: [{ releaseId: 'luis-fonsi-vida', track: 9 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [{ chords: [], restBars: 4 }],
    },
    {
      id: 'verse_1',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus',
      bars: [
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
          repeatEnd: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=kJQP7kiw5Fk' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/luis-fonsi.webp',
  popularity: 50,
};
