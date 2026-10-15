import type { Song } from '@/curriculum/types/songLibrary';

export const new_light: Song = {
  id: 'new_light',
  title: 'New Light',
  artist: 'John Mayer',
  composer: 'John Mayer and No I.D.',
  year: 2018,
  historicalDescription:
    "John Mayer releases 'New Light', a breezy soft-rock single co-produced with No I.D., the hip-hop producer behind records by Common and Jay-Z. Its gliding 1980s-radio feel, and a tongue-in-cheek green-screen video in which Mayer dances in pajamas, win the song an audience well beyond his guitar fans, and it later anchors his 2021 album 'Sob Rock'.",
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 124,
  timeSignature: [4, 4],
  difficulty: 2,
  genreTags: ['pop', 'rock'],
  techniques: [],
  credits: [
    {
      name: 'John Mayer',
      role: 'vocals',
      primary: true,
      artistGlobeId: 'john-mayer',
    },
    {
      name: 'John Mayer',
      role: 'performer',
      instrument: 'electric-guitar',
      artistGlobeId: 'john-mayer',
    },
    { name: 'John Mayer', role: 'songwriter', artistGlobeId: 'john-mayer' },
    { name: 'No I.D.', role: 'songwriter', artistGlobeId: 'no-i-d' },
    { name: 'John Mayer', role: 'producer', artistGlobeId: 'john-mayer' },
    { name: 'No I.D.', role: 'producer', artistGlobeId: 'no-i-d' },
  ],
  releases: [{ releaseId: 'john-mayer-sob-rock' }],
  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            {
              degree: '5 maj',
              chordName: 'D',
              beat: 1,
              duration: 4,
              voicingHint: '5-1-3',
            },
          ],
        },
        {
          chords: [
            { degree: '1 maj7', chordName: 'Gmaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '4 maj7',
              chordName: 'Cmaj7',
              beat: 1,
              duration: 4,
              voicingHint: '5-7-1-3',
            },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '5 maj',
              chordName: 'D',
              beat: 1,
              duration: 4,
              voicingHint: '5-1-3',
            },
          ],
        },
        {
          chords: [
            { degree: '1 maj7', chordName: 'Gmaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '3 dom7',
              chordName: 'B7',
              beat: 1,
              duration: 4,
              voicingHint: '7-1-3-5',
            },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            {
              degree: '5 maj',
              chordName: 'D',
              beat: 1,
              duration: 4,
              voicingHint: '5-1-3',
            },
          ],
        },
        {
          chords: [
            { degree: '1 maj7', chordName: 'Gmaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '4 maj7',
              chordName: 'Cmaj7',
              beat: 1,
              duration: 4,
              voicingHint: '5-7-1-3',
            },
          ],
          repeatEnd: true,
          repeatTimes: 3,
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '5 maj',
              chordName: 'D',
              beat: 1,
              duration: 4,
              voicingHint: '5-1-3',
            },
          ],
        },
        {
          chords: [
            { degree: '1 maj7', chordName: 'Gmaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj7', chordName: 'Gmaj7', beat: 1, duration: 4 },
          ],
        },
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
          repeatStart: true,
        },
        {
          chords: [
            {
              degree: '5 maj',
              chordName: 'D',
              beat: 1,
              duration: 4,
              voicingHint: '5-1-3',
            },
          ],
        },
        {
          chords: [
            { degree: '1 maj7', chordName: 'Gmaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '4 maj7',
              chordName: 'Cmaj7',
              beat: 1,
              duration: 4,
              voicingHint: '5-7-1-3',
            },
          ],
          repeatEnd: true,
          repeatTimes: 2,
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '5 maj',
              chordName: 'D',
              beat: 1,
              duration: 4,
              voicingHint: '5-1-3',
            },
          ],
        },
        {
          chords: [
            { degree: '1 maj7', chordName: 'Gmaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '3 dom7',
              chordName: 'B7',
              beat: 1,
              duration: 4,
              voicingHint: '7-1-3-5',
            },
          ],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            {
              degree: '5 maj',
              chordName: 'D',
              beat: 1,
              duration: 4,
              voicingHint: '5-1-3',
            },
          ],
        },
        {
          chords: [
            { degree: '1 maj7', chordName: 'Gmaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '4 maj7',
              chordName: 'Cmaj7',
              beat: 1,
              duration: 4,
              voicingHint: '5-7-1-3',
            },
          ],
          repeatEnd: true,
          repeatTimes: 3,
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '5 maj',
              chordName: 'D',
              beat: 1,
              duration: 4,
              voicingHint: '5-1-3',
            },
          ],
        },
        {
          chords: [
            { degree: '1 maj7', chordName: 'Gmaj7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj7', chordName: 'Gmaj7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=2PH7dK6SLC8' },
  ],
  artistImageSource: 'manual',
  artistImageRef: '/artists/svg/john-mayer.webp',
  popularity: 50,
};
