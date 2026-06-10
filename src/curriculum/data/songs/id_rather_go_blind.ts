import type { Song } from '@/curriculum/types/songLibrary';

export const id_rather_go_blind: Song = {
  id: 'id_rather_go_blind',
  title: 'I’d Rather Go Blind',
  artist: 'Etta James',
  year: 1992,
  historicalDescription:
    "Etta James re-records 'I'd Rather Go Blind', her devastating blues confession of heartbreak first cut in the late 1960s, cementing its place as one of the most emotionally raw vocal performances in American music. Her voice — weathered by decades of hard living — transforms the song into something beyond technique, a masterclass in blues feeling that influences generations of soul and R&B singers from Beyoncé to Adele.",
  key: 'A major',
  keyRoot: 69,
  mode: 'major',
  tempo: 55,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['blues'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'B min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=uZt1xKtPbUQ' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/etta-james.webp',
  popularity: 50,
};
