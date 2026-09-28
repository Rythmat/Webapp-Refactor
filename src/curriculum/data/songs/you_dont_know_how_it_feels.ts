import type { Song } from '@/curriculum/types/songLibrary';

export const you_dont_know_how_it_feels: Song = {
  id: 'you_dont_know_how_it_feels',
  title: 'You Don’t Know How It Feels',
  artist: 'Tom Petty',
  year: 1994,
  historicalDescription:
    "Tom Petty releases 'You Don't Know How It Feels' as the lead single from his album Wildflowers in 1994. Its laid-back, rolling groove and defiant spirit capture Petty at his most relaxed and self-assured — a reminder that great rock and roll doesn't always need to shout. The song becomes one of his signature solo-era anthems, earning him a Grammy for Best Male Rock Vocal Performance.",
  key: 'E major',
  keyRoot: 64,
  mode: 'major',
  tempo: 73,
  timeSignature: [4, 4],

  difficulty: 1,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }],
          fermata: true,
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 1 },
            { degree: '♭7 maj', chordName: 'D', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 1 },
            { degree: '♭7 maj', chordName: 'D', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 1 },
            { degree: '♭7 maj', chordName: 'D', beat: 2, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 1 },
            { degree: '♭7 maj', chordName: 'D', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 1 },
            { degree: '♭7 maj', chordName: 'D', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 1 },
            { degree: '♭7 maj', chordName: 'D', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 1 },
            { degree: '♭7 maj', chordName: 'D', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 1 },
            { degree: '♭7 maj', chordName: 'D', beat: 2, duration: 3 },
          ],
        },
        { chords: [] },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 5',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 1 },
            { degree: '♭7 maj', chordName: 'D', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 1 },
            { degree: '♭7 maj', chordName: 'D', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 1 },
            { degree: '♭7 maj', chordName: 'D', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 1 },
            { degree: '♭7 maj', chordName: 'D', beat: 2, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 1 },
            { degree: '♭7 maj', chordName: 'D', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 1 },
            { degree: '♭7 maj', chordName: 'D', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 1 },
            { degree: '♭7 maj', chordName: 'D', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 1 },
            { degree: '♭7 maj', chordName: 'D', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 1 },
            { degree: '♭7 maj', chordName: 'D', beat: 2, duration: 3 },
          ],
        },
      ],
    },
    {
      id: 'verse_6',
      label: 'Verse 6',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=ygfA1A45tn8' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/tom-petty.webp',
  popularity: 50,
};
