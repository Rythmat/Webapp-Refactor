import type { Song } from '@/curriculum/types/songLibrary';

export const you_can_call_me_al: Song = {
  id: 'you_can_call_me_al',
  title: 'You Can Call Me Al',
  artist: 'Paul Simon',
  year: 1986,
  historicalDescription:
    "Paul Simon releases 'You Can Call Me Al' in 1986, a song that brings the rhythms and textures of South African township music — mbaqanga and township jive — to global pop audiences. The track, anchored by Chevy Chase's comedic appearance in its iconic music video, becomes one of Simon's biggest solo hits and a defining moment of his landmark 'Graceland' period. It sparks both celebration and controversy, opening Western ears to African sounds while igniting debate over cultural appropriation.",
  key: 'F major',
  keyRoot: 65,
  mode: 'major',
  tempo: 130,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop'],
  techniques: [],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'interlude_1',
      label: 'Interlude 1',
      instrumental: true,
      bars: [{ chords: [], restBars: 2 }],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'interlude_2',
      label: 'Interlude 2',
      instrumental: true,
      bars: [
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        { chords: [] },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=uq-gYOrU8bA' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/paul-simon.webp',
  popularity: 50,
};
