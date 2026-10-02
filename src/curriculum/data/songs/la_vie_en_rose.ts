import type { Song } from '@/curriculum/types/songLibrary';

export const la_vie_en_rose: Song = {
  id: 'la_vie_en_rose',
  title: 'La Vie En Rose',
  artist: 'Edith Piaf',
  year: 1947,
  historicalDescription:
    "Edith Piaf releases 'La Vie En Rose', a tender waltz-inflected ballad that becomes her signature song and one of the most recognizable French melodies ever recorded. Written by Piaf herself, it distills the romantic spirit of postwar Paris into three minutes of longing and resilience. The song transforms her into an international icon, carrying the sound of France to the world.",
  key: 'A♭ major',
  keyRoot: 68,
  mode: 'major',
  tempo: 120,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['pop'],
  techniques: [],
  credits: [
    { name: 'Louiguy', role: 'songwriter', artistGlobeId: 'louiguy' },
    { name: 'Guy Luypaerts', role: 'conductor' },
    {
      name: 'Édith Piaf',
      role: 'vocals',
      artistGlobeId: 'edith-piaf',
      primary: true,
    },
    {
      name: 'Guy Luypaert and His Orchestra',
      role: 'performer',
      ensemble: true,
    },
    { name: 'Robert Chauvigny', role: 'performer', instrument: 'piano' },
    { name: 'Édith Piaf', role: 'songwriter', artistGlobeId: 'edith-piaf' },
  ],
  releases: [{ releaseId: 'edith-piaf-chansons-parisiennes' }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 dom7', chordName: 'F7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯1 dim7', chordName: 'Adim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        { chords: [] },
        {
          chords: [
            { degree: '1 maj7', chordName: 'A♭maj7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
        {
          chords: [
            { degree: '1 maj6', chordName: 'A♭6', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
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
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
        {
          chords: [
            { degree: '5 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        { chords: [] },
        {
          chords: [
            { degree: '1 maj7', chordName: 'A♭maj7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
        {
          chords: [
            { degree: '1 maj6', chordName: 'A♭6', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'D♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        { chords: [] },
        {
          chords: [
            { degree: '1 maj7', chordName: 'A♭maj7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=qPU8mENUBXk' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/edith-piaf.webp',
  popularity: 50,
};
