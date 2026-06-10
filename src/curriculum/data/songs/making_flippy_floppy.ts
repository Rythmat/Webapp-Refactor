import type { Song } from '@/curriculum/types/songLibrary';

export const making_flippy_floppy: Song = {
  id: 'making_flippy_floppy',
  title: 'Making Flippy Floppy',
  artist: 'Talking Heads',
  year: 1983,
  historicalDescription:
    "Talking Heads release 'Making Flippy Floppy' on their landmark album 'Speaking in Tongues' — their first record written and recorded entirely as a full band. The track pulses with polyrhythmic funk grooves and David Byrne's jittery, stream-of-consciousness lyricism, capturing the New York art-rock scene at its most restless and danceable. It signals Talking Heads pushing deeper into the Afrobeat and funk territory that defines their early 1980s peak.",
  key: 'F major',
  keyRoot: 65,
  mode: 'major',
  tempo: 123,
  timeSignature: [4, 4],

  difficulty: 1,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      repeatCount: 8,
      bars: [
        {
          chords: [
            { degree: '1 maj/2', chordName: 'F/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'F/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'F/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'F/G', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      repeatCount: 4,
      bars: [
        {
          chords: [
            { degree: '1 maj/2', chordName: 'F/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'F/G', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      repeatCount: 4,
      bars: [
        {
          chords: [
            { degree: '1 maj/2', chordName: 'F/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'F/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'F/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'F/G', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      repeatCount: 4,
      bars: [
        {
          chords: [
            { degree: '1 maj/2', chordName: 'F/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'F/G', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      repeatCount: 8,
      bars: [
        {
          chords: [
            { degree: '1 maj/2', chordName: 'F/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'F/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'F/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'F/G', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      repeatCount: 8,
      bars: [
        {
          chords: [
            { degree: '1 maj/2', chordName: 'F/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'F/G', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      bars: [
        {
          chords: [
            { degree: '1 maj/2', chordName: 'F/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'F/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'F/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/2', chordName: 'F/G', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=xphLY5ucIpQ' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/talking-heads.webp',
  popularity: 50,
};
