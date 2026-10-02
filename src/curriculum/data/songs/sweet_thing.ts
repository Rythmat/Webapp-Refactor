import type { Song } from '@/curriculum/types/songLibrary';

export const sweet_thing: Song = {
  id: 'sweet_thing',
  title: 'Sweet Thing',
  artist: 'Rufus and Chaka Khan',
  year: 1975,
  // The billing as the record prints it. The act is the band Rufus (Chaka
  // Khan is her own artist too), so the lead act is linked here rather than
  // read from the billing.
  origin: { artistGlobeId: 'rufus' },

  historicalDescription:
    "Rufus and Chaka Khan release 'Sweet Thing', a velvet-smooth R&B ballad that showcases Chaka Khan's extraordinary vocal power in its most intimate setting. The song becomes one of the defining slow jams of the mid-1970s, cementing Khan's status as one of soul music's greatest voices and Rufus as a premier funk and R&B outfit.",
  key: 'A major',
  keyRoot: 69,
  mode: 'major',
  tempo: 82,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rnb'],
  techniques: [],
  credits: [
    { name: 'Tony Maiden', role: 'songwriter', artistGlobeId: 'tony-maiden' },
    { name: 'Chaka Khan', role: 'songwriter', artistGlobeId: 'chaka-khan' },
    {
      name: 'Rufus',
      role: 'performer',
      ensemble: true,
      primary: true,
      artistGlobeId: 'rufus',
    },
    {
      name: 'Chaka Khan',
      role: 'performer',
      primary: true,
      artistGlobeId: 'chaka-khan',
    },
  ],
  releases: [{ releaseId: 'rufus-rufus-featuring-chaka-khan', track: 6 }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus',
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 3',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [
            { degree: '♭2 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '♭5 maj', chordName: 'E♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭2 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '♭5 maj', chordName: 'E♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭2 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '♭5 maj', chordName: 'E♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭2 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '♭5 maj', chordName: 'E♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭2 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '♭5 maj', chordName: 'E♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭2 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '♭5 maj', chordName: 'E♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭2 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '♭5 maj', chordName: 'E♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Dmin7', beat: 1, duration: 1 },
            { degree: '3 dom7', chordName: 'D♭7', beat: 2, duration: 1 },
            { degree: '♭3 min7', chordName: 'Cmin7', beat: 3, duration: 1 },
            { degree: '2 dom7', chordName: 'B7', beat: 4, duration: 1 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=Y7dwufE72UE' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/rufus-and-chaka-khan.webp',
  popularity: 50,
};
