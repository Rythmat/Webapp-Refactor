import type { Song } from '@/curriculum/types/songLibrary';

export const living_for_the_city: Song = {
  id: 'living_for_the_city',
  title: 'Living For The City',
  artist: 'Stevie Wonder',
  year: 1973,
  historicalDescription:
    "Stevie Wonder releases 'Living For The City' as part of his landmark album Innervisions, painting a vivid portrait of a young Black man's journey from rural poverty to the brutal indifference of New York City. The track's blistering funk grooves frame one of the most politically charged narratives of the 1970s soul era — a cinematic indictment of systemic racism that cements Wonder's transformation from Motown prodigy to visionary auteur.",
  key: 'F♯ mixolydian',
  keyRoot: 66,
  mode: 'mixolydian',
  tempo: 100,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['funk'],
  techniques: [],
  credits: [
    {
      name: 'Stevie Wonder',
      role: 'songwriter',
      artistGlobeId: 'stevie-wonder',
    },
    { name: 'Stevie Wonder', role: 'arranger', artistGlobeId: 'stevie-wonder' },
    { name: 'Stevie Wonder', role: 'producer', artistGlobeId: 'stevie-wonder' },
    {
      name: 'Stevie Wonder',
      role: 'vocals',
      artistGlobeId: 'stevie-wonder',
      primary: true,
    },
  ],
  releases: [{ releaseId: 'stevie-wonder-innervisions' }],

  sections: [
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '2 min7/1',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/1',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '2 min7/1',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/1',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '2 min7/1',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/1',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '2 min7/1',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/1',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '2 min7/1',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/1',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '2 min7/1',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/1',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj', chordName: 'C♯', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'C♯7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '2 min7/1',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/1',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
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
            { degree: '1 maj/♭7', chordName: 'F♯/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'D♯min7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭5 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'pre_chorus_1',
      label: 'Pre-Chorus 1',
      bars: [
        {
          chords: [
            { degree: '♭5 maj/3', chordName: 'C/A♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '2 min7/1',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/1',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '2 min7/1',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/1',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '2 min7/1',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/1',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '2 min7/1',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/1',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj', chordName: 'C♯', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'C♯7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '2 min7/1',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/1',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '2 min7/1',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/1',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [
            { degree: '1 maj/♭7', chordName: 'F♯/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'D♯min7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭5 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'pre_chorus_2',
      label: 'Pre-Chorus 2',
      bars: [
        {
          chords: [
            { degree: '♭5 maj/3', chordName: 'C/A♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 3',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '2 min7/1',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/1',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '2 min7/1',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/1',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        {
          chords: [
            { degree: '1 maj/♭7', chordName: 'F♯/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'D♯min7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭5 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'pre_chorus_3',
      label: 'Pre-Chorus 3',
      bars: [
        {
          chords: [
            { degree: '♭5 maj/3', chordName: 'C/A♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
    {
      id: 'chorus_4',
      label: 'Chorus 4',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '2 min7/1',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/1',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '2 min7/1',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/1',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '2 min7/1',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/1',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '2 min7/1',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/1',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 5',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj', chordName: 'C♯', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'C♯7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '2 min7/1',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/1',
              chordName: 'G♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
      ],
    },
    {
      id: 'verse_6',
      label: 'Verse 6',
      bars: [
        {
          chords: [
            { degree: '1 maj/♭7', chordName: 'F♯/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'D♯min7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭5 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_7',
      label: 'Verse 7',
      bars: [
        {
          chords: [
            { degree: '♭5 maj/3', chordName: 'C/A♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_8',
      label: 'Verse 8',
      bars: [
        {
          chords: [
            { degree: '1 maj/♭7', chordName: 'F♯/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'D♯min7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭5 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_9',
      label: 'Verse 9',
      bars: [
        {
          chords: [
            { degree: '♭5 maj/3', chordName: 'C/A♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [{ degree: '5 maj', chordName: 'C♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'C♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭6 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '♭2 maj', chordName: 'G', beat: 2, duration: 1 },
            { degree: '♭6 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'G', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=ghLWjyOOLno' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/stevie-wonder.webp',
  popularity: 50,
};
