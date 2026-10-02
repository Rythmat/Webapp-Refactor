import type { Song } from '@/curriculum/types/songLibrary';

export const yer_so_bad: Song = {
  id: 'yer_so_bad',
  title: 'Yer So Bad',
  artist: 'Tom Petty',
  year: 1990,
  historicalDescription:
    "Tom Petty releases 'Yer So Bad' as part of his landmark solo run, a wry, lighthearted track that showcases his gift for storytelling — finding dark humor in divorce, dysfunction, and the wreckage of family life. Its easy melodic charm proves that Petty's solo work can stand shoulder to shoulder with his Heartbreakers catalog, cementing his place as one of rock's most consistent and beloved voices.",
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 90,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  session: { studioId: 'm-c-studios' },
  credits: [
    { name: 'Mike Campbell', role: 'engineer', artistGlobeId: 'mike-campbell' },
    {
      name: 'Tom Petty',
      role: 'performer',
      instrument: 'tambourine',
      artistGlobeId: 'tom-petty',
      primary: true,
    },
    {
      name: 'Mike Campbell',
      role: 'performer',
      instrument: 'slide-guitar',
      artistGlobeId: 'mike-campbell',
    },
    {
      name: 'Tom Petty',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'tom-petty',
      primary: true,
    },
    { name: 'Jeff Lynne', role: 'producer', artistGlobeId: 'jeff-lynne' },
    { name: 'Bill Bottrell', role: 'engineer', artistGlobeId: 'bill-bottrell' },
    { name: 'Jeff Lynne', role: 'performer', artistGlobeId: 'jeff-lynne' },
    {
      name: 'Jeff Lynne',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'jeff-lynne',
    },
    {
      name: 'Tom Petty',
      role: 'vocals',
      artistGlobeId: 'tom-petty',
      primary: true,
    },
    { name: 'Tom Petty', role: 'producer', artistGlobeId: 'tom-petty' },
    {
      name: 'Mike Campbell',
      role: 'performer',
      instrument: 'mandolin',
      artistGlobeId: 'mike-campbell',
    },
    {
      name: 'Mike Campbell',
      role: 'performer',
      artistGlobeId: 'mike-campbell',
    },
    {
      name: 'Tom Petty',
      role: 'performer',
      instrument: 'acoustic-guitar',
      artistGlobeId: 'tom-petty',
      primary: true,
    },
    {
      name: 'Tom Petty',
      role: 'performer',
      instrument: 'electric-guitar',
      artistGlobeId: 'tom-petty',
      primary: true,
    },
    { name: 'Jeff Lynne', role: 'songwriter', artistGlobeId: 'jeff-lynne' },
    {
      name: 'Tom Petty',
      role: 'performer',
      artistGlobeId: 'tom-petty',
      primary: true,
    },
    { name: 'Phil Jones', role: 'performer', instrument: 'drum-kit' },
    { name: 'Mike Campbell', role: 'producer', artistGlobeId: 'mike-campbell' },
    { name: 'Tom Petty', role: 'songwriter', artistGlobeId: 'tom-petty' },
    { name: 'Phil Jones', role: 'performer', instrument: 'percussion' },
    { name: 'Don Smith', role: 'engineer' },
  ],
  releases: [{ releaseId: 'tom-petty-full-moon-fever', track: 7 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 1 },
            { degree: '5 maj', chordName: 'D', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 1 },
            { degree: '5 maj', chordName: 'D', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 1 },
            { degree: '5 maj', chordName: 'D', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 1 },
            { degree: '5 maj', chordName: 'D', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 1 },
            { degree: '5 maj', chordName: 'D', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 1 },
            { degree: '5 maj', chordName: 'D', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 1 },
            { degree: '5 maj', chordName: 'D', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 1 },
            { degree: '5 maj', chordName: 'D', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 1 },
            { degree: '5 maj', chordName: 'D', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 1 },
            { degree: '5 maj', chordName: 'D', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 1 },
            { degree: '5 maj', chordName: 'D', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 1 },
            { degree: '5 maj', chordName: 'D', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 1 },
            { degree: '5 maj', chordName: 'D', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'C', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'G', beat: 3, duration: 1 },
            { degree: '5 maj', chordName: 'D', beat: 4, duration: 1 },
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
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=WdRViFCvvUo' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/tom-petty.webp',
  popularity: 50,
};
