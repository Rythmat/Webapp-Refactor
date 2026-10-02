import type { Song } from '@/curriculum/types/songLibrary';

export const dont_you_worry_bout_a_thing: Song = {
  id: 'dont_you_worry_bout_a_thing',
  title: 'Don’t You Worry ‘Bout A Thing',
  artist: 'Stevie Wonder',
  year: 1974,
  historicalDescription:
    "Stevie Wonder releases 'Don't You Worry 'Bout A Thing' from his landmark Innervisions album, weaving Afro-Latin rhythms and cascading piano into a joyful reassurance. The track showcases Wonder at the height of his creative powers — blending funk, soul, and Latin influences into a sound that feels both worldly and deeply personal. It becomes one of his most beloved and enduring performances.",
  key: 'E♭ minor',
  keyRoot: 63,
  mode: 'minor',
  tempo: 126,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['funk', 'latin'],
  techniques: [],
  credits: [
    { name: 'Stevie Wonder', role: 'arranger', artistGlobeId: 'stevie-wonder' },
    {
      name: 'Stevie Wonder',
      role: 'songwriter',
      artistGlobeId: 'stevie-wonder',
    },
    { name: 'Yusuf Roahman', role: 'performer' },
    { name: 'Sheila Wilkerson', role: 'performer', instrument: 'bongos' },
    { name: 'Stevie Wonder', role: 'producer', artistGlobeId: 'stevie-wonder' },
  ],
  releases: [{ releaseId: 'stevie-wonder-innervisions' }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        { chords: [], restBars: 4 },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'D♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'G♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♯5 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯1 dom7', chordName: 'E7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'D♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'G♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♯5 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯1 dom7', chordName: 'E7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
          keyChange: 'F♯ major',
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F♯7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F♯7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'A♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'A♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '2 maj', chordName: 'G♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'G♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'C♯7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'C♯7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 dom7', chordName: 'A♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 dom7', chordName: 'A♯7', beat: 1, duration: 4 },
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
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
          keyChange: 'E♭ minor',
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'D♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'G♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♯5 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯1 dom7', chordName: 'E7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'D♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'G♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♯5 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯1 dom7', chordName: 'E7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
          keyChange: 'F♯ major',
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F♯7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F♯7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'A♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'A♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'A♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'A♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '2 maj', chordName: 'G♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'G♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'C♯7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'C♯7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'interlude_1',
      label: 'Interlude 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
          keyChange: 'E♭ minor',
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♯1 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'D♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'G♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♯5 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯1 dom7', chordName: 'E7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'D♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'G♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♯5 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯1 dom7', chordName: 'E7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 3',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
          keyChange: 'F♯ major',
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F♯7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F♯7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'A♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'A♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'A♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'A♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '2 maj', chordName: 'G♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'G♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'C♯7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'C♯7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'interlude_2',
      label: 'Interlude 2',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
          keyChange: 'E♭ minor',
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'D♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'G♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♯5 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯1 dom7', chordName: 'E7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'D♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'G♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♯5 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯1 dom7', chordName: 'E7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_4',
      label: 'Chorus 4',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
          keyChange: 'F♯ major',
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F♯7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'F♯7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'A♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'A♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '2 maj', chordName: 'G♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'G♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'C♯7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'C♯7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 dom7', chordName: 'A♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 dom7', chordName: 'A♯7', beat: 1, duration: 4 },
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
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
          keyChange: 'E♭ minor',
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♯1 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 min7', chordName: 'D♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dom7', chordName: 'G♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♯5 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯1 dom7', chordName: 'E7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=mMTkujnftIs' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/stevie-wonder.webp',
  popularity: 50,
};
