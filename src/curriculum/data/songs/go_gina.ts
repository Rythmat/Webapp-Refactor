import type { Song } from '@/curriculum/types/songLibrary';

export const go_gina: Song = {
  id: 'go_gina',
  title: 'Go Gina',
  artist: 'SZA',
  year: 2017,
  historicalDescription:
    "SZA sings 'Go Gina' on her debut album 'Ctrl', a breezy, self-possessed song that borrows its title from the sitcom 'Martin' and its mood from a lazy two-chord sway between D major 7 and A. 'Ctrl' makes SZA one of the defining voices of late-2010s R&B, earning five Grammy nominations, and its candour about self-doubt and desire becomes a touchstone for a generation of listeners.",
  key: 'A major',
  keyRoot: 69,
  mode: 'major',
  tempo: 80,
  timeSignature: [4, 4],
  difficulty: 1,
  genreTags: ['rnb'],
  techniques: [],
  credits: [
    { name: 'SZA', role: 'vocals', primary: true, artistGlobeId: 'sza' },
  ],
  releases: [{ releaseId: 'sza-ctrl' }],
  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '4 maj7', chordName: 'Dmaj7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj7', chordName: 'Dmaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }],
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
            { degree: '4 maj7', chordName: 'Dmaj7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj7', chordName: 'Dmaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }],
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
            { degree: '4 maj7', chordName: 'Dmaj7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj7', chordName: 'Dmaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }],
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
            { degree: '4 maj7', chordName: 'Dmaj7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj7', chordName: 'Dmaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=UWktRW128UA' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
