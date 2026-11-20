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
      id: 'section_4',
      label: 'Intro',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj7', chordName: 'A♭maj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'B♭min7♭5', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'A♭/E♭', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'E♭7', beat: 3, duration: 2 },
          ],
          rhythm: [
            { value: '4', plain: true },
            { value: '4', plain: true },
            { value: '2' },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A♭', beat: 1, duration: 3 },
            { degree: '6 dom7', chordName: 'F7', beat: 4, duration: 1 },
          ],
          segno: true,
        },
        {
          chords: [
            { degree: '2 min', chordName: 'B♭min', beat: 1, duration: 3 },
            { degree: '5 aug', chordName: 'E♭aug', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A♭', beat: 1, duration: 2 },
            { degree: '3 dom7/7', chordName: 'C7/G', beat: 2, duration: 2 },
            { degree: '6 dom7', chordName: 'F7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '♯5 dom7', chordName: 'E7', beat: 1, duration: 1 },
            { degree: '5 dom7', chordName: 'E♭7', beat: 2, duration: 1 },
            { degree: '5 dom7', chordName: 'E♭7', beat: 3, duration: 2 },
          ],
          rhythm: [
            { value: '4', plain: true },
            { value: '4', plain: true },
            { value: '2' },
          ],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj7', chordName: 'A♭maj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj6', chordName: 'A♭6', beat: 1, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 1 },
            { degree: '5 dom7', chordName: 'E♭7', beat: 3, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '2 min', chordName: 'B♭min', beat: 1, duration: 3 },
            { degree: '2 min7', chordName: 'B♭min7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '2 min6', chordName: 'B♭min6', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'E♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '♯1 dim7', chordName: 'Adim7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'B♭min7', beat: 3, duration: 1 },
            { degree: '5 dom7', chordName: 'E♭7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj7', chordName: 'A♭maj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj6', chordName: 'A♭6', beat: 1, duration: 2 },
            { degree: '1 dom7', chordName: 'A♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj9', chordName: 'D♭maj9', beat: 1, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '4 min6', chordName: 'D♭min6', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 dom7', chordName: 'B♭7♯5', beat: 1, duration: 1 },
            { degree: '2 dom7', chordName: 'B♭7', beat: 2, duration: 1 },
            { degree: '5 maj', chordName: 'E♭7sus4', beat: 3, duration: 1 },
            { degree: '5 dom7', chordName: 'E♭7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj7', chordName: 'A♭maj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭m7', beat: 1, duration: 1 },
            { degree: '5 dom7', chordName: 'E♭7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'B♭m7', beat: 3, duration: 1 },
            { degree: '5 dom7', chordName: 'E♭7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 maj6', chordName: 'A♭6', beat: 1, duration: 1 },
          ],
          jump: 'D.S. al Coda',
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Coda',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj7', chordName: 'A♭maj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭m7', beat: 1, duration: 1 },
            { degree: '5 dom7', chordName: 'E♭7', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'B♭m7', beat: 3, duration: 1 },
            { degree: '5 dom7', chordName: 'E♭7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 maj6', chordName: 'A♭6', beat: 1, duration: 1 },
            { degree: '♯1 dom7', chordName: 'A7', beat: 2, duration: 0.5 },
            { degree: '1 maj6', chordName: 'A♭6', beat: 2.5, duration: 2.5 },
          ],
          rhythm: [
            { value: '4', plain: true },
            { value: '8' },
            { value: '8', tie: true },
            { value: '2' },
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
