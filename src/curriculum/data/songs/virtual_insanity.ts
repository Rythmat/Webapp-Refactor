import type { Song } from '@/curriculum/types/songLibrary';

export const virtual_insanity: Song = {
  id: 'virtual_insanity',
  title: 'Virtual Insanity',
  artist: 'Jamiroquai',
  year: 1996,
  historicalDescription:
    "Jamiroquai releases 'Virtual Insanity' in 1996, a funk-driven warning about technology's creeping dominance over human life. Jay Kay's soulful vocals ride a loping, hypnotic groove that feels simultaneously retro and futuristic. The song's iconic music video — featuring a sliding room and Kay's signature hat — becomes one of the most celebrated clips of the MTV era, winning multiple MTV VMAs.",
  key: 'E♭ minor',
  keyRoot: 63,
  mode: 'minor',
  tempo: 92,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['funk'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [{ chords: [], restBars: 3 }, { chords: [] }],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Cmin7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♯5 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7(♯5)', beat: 1, duration: 4 },
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
        { chords: [{ degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Cmin7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♯5 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7(♯5)', beat: 1, duration: 4 },
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
        { chords: [{ degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 dom7', chordName: 'D♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Cmin7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♯5 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7(♯5)', beat: 1, duration: 4 },
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
        { chords: [{ degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 dom7', chordName: 'D♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Cmin7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♯5 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7(♯5)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7(♯5)', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '♯5 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '7 dim7', chordName: 'Ddim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'A♭min7', beat: 1, duration: 2 },
            { degree: '5 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♯5 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '7 dim7', chordName: 'Ddim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'A♭min7', beat: 1, duration: 2 },
            { degree: '5 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
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
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 dom7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 dom7', chordName: 'D♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Cmin7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♯5 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7(♯5)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        {
          chords: [{ degree: '♯5 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '7 dim7', chordName: 'Ddim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'A♭min7', beat: 1, duration: 2 },
            { degree: '5 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♯5 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '7 dim7', chordName: 'Ddim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'A♭min7', beat: 1, duration: 2 },
            { degree: '5 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'interlude',
      label: 'Interlude',
      instrumental: true,
      bars: [{ chords: [], restBars: 35 }],
    },
    {
      id: 'verse_5',
      label: 'Verse 5',
      bars: [
        {
          chords: [{ degree: '♯5 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '7 dim7', chordName: 'Ddim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'A♭min7', beat: 1, duration: 2 },
            { degree: '5 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♯5 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '7 dim7', chordName: 'Ddim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'A♭min7', beat: 1, duration: 2 },
            { degree: '5 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [{ degree: '♯5 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '7 dim7', chordName: 'Ddim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/2', chordName: 'D♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯5 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Cmin7b5', beat: 1, duration: 2 },
            { degree: '♯5 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7(♯5)', beat: 1, duration: 4 },
          ],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=OeTFAiYbR9o' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/jamiroquai.webp',
  popularity: 50,
};
