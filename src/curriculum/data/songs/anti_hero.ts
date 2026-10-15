import type { Song } from '@/curriculum/types/songLibrary';

export const anti_hero: Song = {
  id: 'anti_hero',
  title: 'Anti-Hero',
  artist: 'Taylor Swift',
  composer: 'Taylor Swift and Jack Antonoff',
  year: 2022,
  historicalDescription:
    "Taylor Swift releases 'Anti-Hero', the lead single from 'Midnights', a self-lacerating synth-pop confession built on four plain chords and a chorus that names herself as the problem. It debuts at No. 1 on the Billboard Hot 100 and holds the top for eight weeks, and at the 2024 Grammy Awards it is nominated for Record of the Year, Song of the Year and Best Pop Solo Performance.",
  key: 'E major',
  keyRoot: 64,
  mode: 'major',
  tempo: 194,
  timeSignature: [4, 4],
  difficulty: 1,
  genreTags: ['pop'],
  techniques: [],
  credits: [
    {
      name: 'Taylor Swift',
      role: 'vocals',
      primary: true,
      artistGlobeId: 'taylor-swift',
    },
    { name: 'Taylor Swift', role: 'songwriter', artistGlobeId: 'taylor-swift' },
    {
      name: 'Jack Antonoff',
      role: 'songwriter',
      artistGlobeId: 'jack-antonoff',
    },
    { name: 'Taylor Swift', role: 'producer', artistGlobeId: 'taylor-swift' },
    { name: 'Jack Antonoff', role: 'producer', artistGlobeId: 'jack-antonoff' },
  ],
  releases: [{ releaseId: 'taylor-swift-midnights' }],
  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      notes:
        "Written in double time, as the map counts it (194): each bar here is half a bar at the recording's 97 BPM. The A and the C♯ minor are anticipated by an eighth note.",
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min', chordName: 'C♯min', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
          repeatTimes: 4,
        },
      ],
    },
    {
      id: 'pre_chorus_1',
      label: 'Pre-Chorus 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min', chordName: 'C♯min', beat: 1, duration: 4 },
          ],
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
          chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min', chordName: 'C♯min', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
          repeatTimes: 4,
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      notes:
        "Written in double time, as the map counts it (194): each bar here is half a bar at the recording's 97 BPM. The A and the C♯ minor are anticipated by an eighth note.",
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min', chordName: 'C♯min', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
          repeatTimes: 4,
        },
      ],
    },
    {
      id: 'pre_chorus_2',
      label: 'Pre-Chorus 2',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min', chordName: 'C♯min', beat: 1, duration: 4 },
          ],
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
          chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min', chordName: 'C♯min', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
          repeatTimes: 4,
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min', chordName: 'C♯min', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
          repeatTimes: 4,
        },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 3',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min', chordName: 'C♯min', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
          repeatTimes: 4,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=b1kbLwvqugk' },
  ],
  artistImageSource: 'manual',
  artistImageRef: '/artists/svg/taylor-swift.webp',
  popularity: 50,
};
