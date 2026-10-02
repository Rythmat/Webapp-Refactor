import type { Song } from '@/curriculum/types/songLibrary';

export const stay_with_me: Song = {
  id: 'stay_with_me',
  title: 'Stay With Me',
  artist: 'Sam Smith',
  year: 2014,
  historicalDescription:
    "Sam Smith releases 'Stay With Me' in 2014, and the gospel-tinged soul ballad becomes an instant global phenomenon. Smith's raw, confessional vulnerability — pleading for connection after a one-night stand — resonates with millions, turning the track into one of the decade's defining pop moments and launching Smith to international stardom.",
  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 85,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop'],
  techniques: [],
  credits: [
    { name: 'Jimmy Napes', role: 'songwriter', artistGlobeId: 'jimmy-napes' },
    {
      name: 'Will Phillips',
      role: 'songwriter',
      artistGlobeId: 'will-phillips',
    },
    { name: 'Jeff Lynne', role: 'songwriter', artistGlobeId: 'jeff-lynne' },
    { name: 'Sam Smith', role: 'songwriter', artistGlobeId: 'sam-smith' },
    { name: 'Tom Petty', role: 'songwriter', artistGlobeId: 'tom-petty' },
  ],
  releases: [{ releaseId: 'sam-smith-in-the-lonely-hour', track: 3 }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'G', beat: 3, duration: 2 },
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
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '3 dom7/♯5', chordName: 'E7/G♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'G', beat: 3, duration: 2 },
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
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '3 dom7/♯5', chordName: 'E7/G♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=pB-5XG-DbAA' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/sam-smith.webp',
  popularity: 50,
};
