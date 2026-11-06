import type { GuidedChapter } from '../types';

// ── Pop, Level 1 ───────────────────────────────────────────────────────────
// Its four sections, each one sitting. Pop's flows are written in C, and these
// spell out what they really play: see the flow in data/activityFlows/pop_v2.ts.

const MELODY: GuidedChapter = {
  id: 'A',
  name: 'Melody',
  hook: {
    kind: 'hook',
    id: 'hook',
    hear: 'A2.2',
    title: 'Most pop melodies get by on five notes.',
    body: 'Hear it once. Everything in that line comes from one five-note scale, and by the end of this you’ll be the one playing it.',
  },
  screens: [
    {
      kind: 'play',
      id: 'five-notes',
      body: 'This is **C major pentatonic**: C, D, E, G, A, and C again at the top. Take it up at your own pace, then back down.',
      rungs: [
        { step: 'A1.1', label: 'Going up' },
        { step: 'A1.2', label: 'Coming down' },
      ],
      right:
        'That’s the whole scale, both ways: five notes, and the C they start from.',
      faults: {
        wrong:
          'That one isn’t in the five. The scale jumps over F and B, so watch for the gaps.',
      },
      why: {
        title: 'Why “pentatonic”',
        paragraphs: [
          '“Penta” means five. It’s five different notes before the scale starts again on C.',
          'Scales like this turn up in music all over the world, long before pop existed. They’re easy to sing, and easy to hear.',
        ],
      },
    },
    {
      kind: 'choose',
      id: 'left-out',
      body: 'A full C major scale has seven notes. This one keeps five.',
      question: 'Which two does it leave out?',
      correct: 'f-b',
      right:
        'F and B. Without them, no two notes in the scale are a half step apart.',
      choices: [
        { id: 'f-b', text: 'F and B' },
        {
          id: 'd-a',
          text: 'D and A',
          feedback:
            'You just played both of those. Look for the two it jumped over.',
        },
        {
          id: 'e-g',
          text: 'E and G',
          feedback:
            'Those are in it too. Between E and G, which white key got skipped?',
        },
      ],
      why: {
        title: 'What’s missing, and why it helps',
        paragraphs: [
          'F sits a half step above E, and B a half step below C. Half steps are the notes that can rub against a chord.',
          'Take those two away, and almost anything you play sits comfortably over the usual pop chords. That’s why it’s where so many melodies, and so many first solos, begin.',
        ],
      },
    },
    {
      kind: 'play',
      id: 'in-time',
      body: 'Now straight up and straight back down, in time. Count along with the click, then start on C.',
      rungs: [{ step: 'A1.3', label: 'In time', credits: ['A1.1', 'A1.2'] }],
      right:
        'Up and down, in time. Evenness is what lets a melody sit on the beat.',
      why: {
        title: 'Why bother playing a scale in time',
        paragraphs: [
          'Finding the notes and placing them are two separate skills. At your own pace you’re finding them. With a click you’re placing them.',
          'A melody is mostly placement. The same notes in the wrong places aren’t the same tune.',
        ],
      },
    },
    {
      kind: 'play',
      id: 'three-notes',
      body: 'Three notes: E, G, then back to E, and that last one rings for two beats. It’s short, but it’s already a tune.',
      rungs: [{ step: 'A2.1', label: '3 notes' }],
      right:
        'Hear how that long E settles it? The held note is what makes it feel finished.',
      faults: {
        short:
          'Hold that last E for its full two beats. The long note is the point.',
      },
      why: {
        title: 'Why it ends on a long note',
        paragraphs: [
          'Short notes move, and long notes arrive. Ending on a long note tells the ear the phrase is over.',
          'E is also part of the C chord, so it sounds at rest there. It’s a safe place to land.',
        ],
      },
    },
    {
      kind: 'play',
      id: 'six-notes',
      body: 'Now two bars, with the track: G, A, G, then E, D, C. It lifts a little, then steps down to the C the scale started from.',
      rungs: [{ step: 'A2.2', label: '6 notes' }],
      right: 'That’s the line from the top of this lesson, and now it’s yours.',
      faults: {
        short:
          'Both bars end on a long note. Hold the G and the C for two beats each.',
      },
      why: {
        title: 'Question and answer',
        paragraphs: [
          'The first bar stops on G, which leaves you waiting. The second bar comes down and lands on C, which answers it.',
          'A lot of melodies are built that way: one phrase that asks, and one that resolves.',
        ],
      },
    },
  ],
  takeaway: {
    kind: 'takeaway',
    id: 'takeaway',
    body: 'Five notes, and you’ve already got two melodies out of them.',
    points: [
      '**C major pentatonic** is C, D, E, G and A: the major scale without F and B.',
      'With no half steps in it, it’s hard to clash with the usual pop chords.',
      'Both of your melodies ended on a long note, on a note of the C chord.',
    ],
    inSession:
      'Put on a song in C and make up lines with just these five notes. Land on C or E, and leave gaps between phrases to breathe.',
    limits:
      'Plenty of pop melodies use F and B as well. Five notes is a starting point, not a rule.',
    next: 'Next, the chords those melodies sit on.',
  },
  practice: [
    {
      kind: 'choose',
      id: 'check-in-scale',
      body: 'No hints from here.',
      question: 'Which of these is in C major pentatonic?',
      correct: 'a',
      right: 'A. The five are C, D, E, G and A.',
      choices: [
        {
          id: 'f',
          text: 'F',
          feedback: 'F is one of the two it leaves out, along with B.',
        },
        { id: 'a', text: 'A' },
        {
          id: 'b',
          text: 'B',
          feedback: 'B is one of the two it leaves out, along with F.',
        },
      ],
      why: {
        title: 'The five',
        paragraphs: ['C, D, E, G and A: the C major scale without F and B.'],
      },
    },
    {
      kind: 'choose',
      id: 'check-landing',
      body: 'Your phrase is over a C chord, and it keeps sounding unfinished.',
      question: 'Which note is the surest place to land?',
      correct: 'c',
      right: 'C. It’s the chord’s own root, so nothing feels more at rest.',
      choices: [
        { id: 'c', text: 'C' },
        {
          id: 'd',
          text: 'D',
          feedback:
            'D is in the scale, but not in a C chord, so it wants to move on.',
        },
        {
          id: 'a',
          text: 'A',
          feedback:
            'A is in the scale, but not in a C chord. It colours it rather than ending it.',
        },
      ],
      why: {
        title: 'Landing on chord notes',
        paragraphs: [
          'A C chord is C, E and G. Land on any of those and the phrase feels settled, with C the most settled of all.',
        ],
      },
    },
    {
      kind: 'play',
      id: 'check-memory',
      fromMemory: true,
      body: 'From memory: C major pentatonic, up and back down, in time. Nothing on the screen this time.',
      rungs: [{ step: 'A1.3', label: 'In time' }],
      right: 'From memory, and in time. That scale is yours now.',
      why: {
        title: 'Why from memory',
        paragraphs: [
          'Reading notes and knowing them are different. Once it’s in your hands you can listen to the music instead of watching for the next note.',
        ],
      },
    },
  ],
};

const CHORDS: GuidedChapter = {
  id: 'B',
  name: 'Chords',
  hook: {
    kind: 'hook',
    id: 'hook',
    hear: 'B5.3',
    title: 'Four chords run under a huge amount of pop.',
    body: 'Hear it once: C, A minor, F and G. You’ll build each of them, then play that very loop.',
  },
  screens: [
    {
      kind: 'play',
      id: 'c-major',
      body: 'Start with **C major**: C, E and G. Play them one at a time, first at your own pace, then up and back in time.',
      rungs: [
        { step: 'B1.1', label: 'At your own pace' },
        { step: 'B1.2', label: 'In time', credits: ['B1.1'] },
      ],
      right: 'That’s a chord taken apart: root, third and fifth.',
      why: {
        title: 'Why play a chord one note at a time',
        paragraphs: [
          'Playing the notes one by one is called an **arpeggio**. It’s the quickest way to learn what’s inside a chord, and it’s how your hand learns the shape.',
          'Songs use it too: a lot of ballad piano parts are just arpeggios.',
        ],
      },
    },
    {
      kind: 'play',
      id: 'a-minor',
      body: 'Same idea on **A minor**: A, C and E.',
      rungs: [
        { step: 'B1.3', label: 'At your own pace' },
        { step: 'B1.4', label: 'In time', credits: ['B1.3'] },
      ],
      right: 'A minor: same shape under your hand, and a darker sound.',
      why: {
        title: 'Why it sounds darker',
        paragraphs: [
          'In a major chord the bottom gap is the wider one, four half steps. In a minor chord it’s the narrower one, three half steps.',
          'That single half step is the whole difference between bright and dark.',
        ],
      },
    },
    {
      kind: 'choose',
      id: 'shared',
      body: 'You’ve played two chords now: C, E, G and A, C, E.',
      question: 'Which notes do they share?',
      correct: 'c-e',
      right:
        'C and E. Only one note changes, so moving between them sounds smooth.',
      choices: [
        {
          id: 'a-c',
          text: 'A and C',
          feedback: 'A is only in A minor. Look at what’s in both lists.',
        },
        { id: 'c-e', text: 'C and E' },
        {
          id: 'e-g',
          text: 'E and G',
          feedback: 'G is only in C major. Look at what’s in both lists.',
        },
      ],
      why: {
        title: 'Close relatives',
        paragraphs: [
          'A minor is built on the sixth note of the C major scale, and uses the same notes as C major. The two are so close that songs often move between them for a change of mood without changing key.',
        ],
      },
    },
    {
      kind: 'play',
      id: 'block',
      body: 'Now all at once: left hand on the low root, right hand on the chord. Striking it on every beat is called **chunking**.',
      rungs: [
        { step: 'B2.1', label: 'C, own pace' },
        { step: 'B2.2', label: 'C, in time', credits: ['B2.1'] },
        { step: 'B2.3', label: 'Am, own pace' },
        { step: 'B2.4', label: 'Am, in time', credits: ['B2.3'] },
      ],
      right:
        'Both hands, on the beat. That’s the heartbeat of a pop piano part.',
      faults: {
        missed:
          'Both hands land together. Try the left hand’s root alone, then add the right.',
      },
      why: {
        title: 'Why the left hand plays the root',
        paragraphs: [
          'A low note is what the ear hears the chord as being built on. With the root in the bass, the chord is unmistakable.',
          'It also fills out the sound, so one player can cover what a band’s bass and keys would do.',
        ],
      },
    },
    {
      kind: 'play',
      id: 'f-and-g',
      body: 'Two more: **F major** is F, A, C, and **G major** is G, B, D. For each one: up, then up and back, then chunked.',
      rungs: [
        { step: 'B3.1', label: 'F, up' },
        { step: 'B3.2', label: 'F, up and back', credits: ['B3.1'] },
        { step: 'B3.3', label: 'F, chunked' },
        { step: 'B3.4', label: 'G, up' },
        { step: 'B3.5', label: 'G, up and back', credits: ['B3.4'] },
        { step: 'B3.6', label: 'G, chunked' },
      ],
      right: 'That’s all four: C, Am, F and G, under your hands.',
      why: {
        title: 'Why these four',
        paragraphs: [
          'They’re chords 1, 6, 4 and 5 of C major. Between them they use all seven notes of the scale, so any melody in the key has a chord that fits.',
          'Written as numbers, the same loop works in any key: 1 maj, 6 min, 4 maj, 5 maj.',
        ],
      },
    },
    {
      kind: 'choose',
      id: 'home-pull',
      body: 'Each of these chords has its own job. Play them if you like, and listen for which one wants to go back to C.',
      question: 'Which pulls home to C most strongly?',
      correct: 'g',
      right: 'G. Its B sits a half step under C, and pulls right up to it.',
      choices: [
        {
          id: 'f',
          text: 'F',
          feedback:
            'F feels like stepping away from home more than heading back to it.',
        },
        { id: 'g', text: 'G' },
        {
          id: 'am',
          text: 'Am',
          feedback:
            'Am shares two notes with C, so it’s more of a darker home than a pull.',
        },
      ],
      why: {
        title: 'Tension and release',
        paragraphs: [
          'The B in a G chord is a half step below C, and half steps want to close up. Play G then C and you can feel that B move.',
          'Most chord loops are built around that: leaving home, building tension on the 5, and coming back.',
        ],
      },
    },
    {
      kind: 'play',
      id: 'power',
      body: 'A **power chord** is just a root and a 5th, with no 3rd: C and G together. Hold it, chunk it, then add a moving bass.',
      rungs: [
        { step: 'B4.1', label: 'Hold' },
        { step: 'B4.2', label: 'Chunked', credits: ['B4.1'] },
        { step: 'B4.3', label: 'With a moving bass' },
      ],
      right:
        'Two hands, two jobs: the chord stays put, and the bass does the moving.',
      why: {
        title: 'Why leave out the 3rd',
        paragraphs: [
          'The 3rd is the note that makes a chord major or minor. Without it, the chord is neither, so it sounds strong and open, and fits either way.',
          'It’s why rock and pop guitar use them so much, and piano can borrow the same sound.',
        ],
      },
    },
    {
      kind: 'play',
      id: 'loops',
      body: 'Now the loops, with the track. Keep chunking in quarter notes, and change right on the first beat of each new chord.',
      rungs: [
        { step: 'B5.1', label: 'C F C' },
        { step: 'B5.2', label: 'C G F G' },
        { step: 'B5.3', label: 'C Am F G' },
        { step: 'B5.4', label: 'C G Am F' },
      ],
      right:
        'Four loops, and the last two are behind more hit songs than anyone could count.',
      faults: {
        late: 'You’re arriving late on the changes. Look ahead, and get the next shape ready before the bar ends.',
        missed:
          'You’re dropping some notes at the changes. Slow it down until each new shape lands whole.',
      },
      why: {
        title: 'Same chords, different story',
        paragraphs: [
          'C Am F G and C G Am F use the same four chords. Starting the turn differently changes how they feel: the first one sounds nostalgic, the second more lifted.',
          'That’s why it’s worth knowing them by number. Songwriters reorder them all the time.',
        ],
      },
    },
    {
      kind: 'play',
      id: 'jams',
      body: 'Four bars with both hands: a power chord on top, and the bass changing on every bar underneath. The second one uses a **3-3-2** rhythm.',
      rungs: [
        { step: 'B5.5', label: 'Quarter notes' },
        { step: 'B5.6', label: '3-3-2' },
      ],
      right: 'Four bars, two hands. That’s a whole section of a song.',
      why: {
        title: 'What 3-3-2 is',
        paragraphs: [
          'Count eight eighth notes in a bar, and strike on 1, 4 and 7. Those gaps are three, three and two.',
          'It’s still four beats, but the accents fall against them, which gives the bar a push forward. You’ll hear it all over pop and rock.',
        ],
      },
    },
  ],
  takeaway: {
    kind: 'takeaway',
    id: 'takeaway',
    body: 'Four chords and a power chord: that’s a working pop vocabulary.',
    points: [
      '**C, Am, F and G** are chords 1, 6, 4 and 5 of C major.',
      'G pulls home to C, because its B wants to rise a half step.',
      'A **power chord** has no 3rd, so it’s neither major nor minor.',
    ],
    inSession:
      'Loop C, Am, F, G and sing or hum anything over it. Then swap the order, and listen to how the mood changes.',
    limits:
      'Real pop parts rarely chunk every beat for a whole song. This is the skeleton, and the rhythm comes next.',
    next: 'Next, the bass that sits under all of it.',
  },
  practice: [
    {
      kind: 'choose',
      id: 'check-f',
      body: 'No hints from here.',
      question: 'Which notes make F major?',
      correct: 'f-a-c',
      right: 'F, A and C: root, third and fifth.',
      choices: [
        { id: 'f-a-c', text: 'F, A, C' },
        {
          id: 'g-b-d',
          text: 'G, B, D',
          feedback: 'Those are G major, the 5 chord. F is the one below it.',
        },
        {
          id: 'a-c-e',
          text: 'A, C, E',
          feedback:
            'Those are A minor. Build it up from F, skipping a note each time.',
        },
      ],
      why: {
        title: 'Building a triad',
        paragraphs: [
          'Start on the chord’s name and take every other note of the scale: F, skip G, A, skip B, C.',
        ],
      },
    },
    {
      kind: 'choose',
      id: 'check-power',
      body: 'A C major chord is C, E and G.',
      question: 'Which note do you drop to make it a power chord?',
      correct: 'e',
      right: 'E, the 3rd. That leaves the root and the 5th.',
      choices: [
        {
          id: 'c',
          text: 'C',
          feedback: 'C is the root. A power chord keeps its root and its 5th.',
        },
        { id: 'e', text: 'E' },
        {
          id: 'g',
          text: 'G',
          feedback: 'G is the 5th, and a power chord is a root and a 5th.',
        },
      ],
      why: {
        title: 'What the 3rd does',
        paragraphs: [
          'The 3rd decides major or minor. Take it away and the chord could be either, which is what makes it sound so open.',
        ],
      },
    },
    {
      kind: 'play',
      id: 'check-memory',
      fromMemory: true,
      body: 'From memory: C, Am, F, G, chunking in quarter notes with the track. A bar of each.',
      rungs: [{ step: 'B5.3', label: 'C Am F G' }],
      right: 'From memory, in the pocket. You can play a pop song now.',
      why: {
        title: 'Why from memory',
        paragraphs: [
          'When you don’t have to look for the next chord, you can listen to the band, and that’s when it starts to feel like playing.',
        ],
      },
    },
  ],
};

const BASS: GuidedChapter = {
  id: 'C',
  name: 'Bass',
  hook: {
    kind: 'hook',
    id: 'hook',
    hear: 'C3.1',
    title: 'Without a bass, a song seems to float.',
    body: 'Hear it: one low note at a time, and the whole band has something to stand on. Your left hand is about to take that job.',
  },
  screens: [
    {
      kind: 'play',
      id: 'low-five',
      body: 'The same five notes as before, two octaves lower: C, D, E, G, A and C. Up, down, then both in time.',
      rungs: [
        { step: 'C1.1', label: 'Going up' },
        { step: 'C1.2', label: 'Coming down' },
        {
          step: 'C1.3',
          label: 'Up and back, in time',
          credits: ['C1.1', 'C1.2'],
        },
      ],
      right: 'Same scale, in the register where the bass lives.',
      why: {
        title: 'Why the left hand, down here',
        paragraphs: [
          'Low notes need more room. Clustered close together down here they turn to mud, which is why bass lines tend to move by clear steps and leaps.',
        ],
      },
    },
    {
      kind: 'play',
      id: 'low-seven',
      body: 'Now the full **C major scale** down here: all seven notes, with F and B back in, from C to C.',
      rungs: [
        { step: 'C1.4', label: 'Going up' },
        { step: 'C1.5', label: 'Coming down' },
        {
          step: 'C1.6',
          label: 'Up and back, in time',
          credits: ['C1.4', 'C1.5'],
        },
      ],
      right:
        'All eight steps, both ways. The whole ladder is under your left hand.',
      why: {
        title: 'Why a bass player needs the full scale',
        paragraphs: [
          'Bass lines mostly land on roots, but they travel between them. Those passing notes come from the scale, including the F and B the pentatonic leaves out.',
        ],
      },
    },
    {
      kind: 'choose',
      id: 'root-of',
      body: 'The loop is C, G, Am, F. A bass player mostly plays each chord’s **root**: the note it’s named after.',
      question: 'What does the bass play under Am?',
      correct: 'a',
      right: 'A. An A minor chord is built on A, so that’s its root.',
      choices: [
        {
          id: 'c',
          text: 'C',
          feedback:
            'C is in the chord, but it’s the middle note. Its root is its name.',
        },
        { id: 'a', text: 'A' },
        {
          id: 'e',
          text: 'E',
          feedback:
            'E is in the chord, but it’s the top note. Its root is its name.',
        },
      ],
      why: {
        title: 'Why roots',
        paragraphs: [
          'The lowest note tells the ear what chord this is. Play the root, and even a sparse part makes the harmony clear.',
          'Put a different note down there and you change how the whole chord sounds.',
        ],
      },
    },
    {
      kind: 'play',
      id: 'roots',
      body: 'Here’s the job itself: one root for each chord. Find them at your own pace, then one bar each, in time.',
      rungs: [
        { step: 'C2.1', label: 'At your own pace' },
        { step: 'C2.2', label: 'In time', credits: ['C2.1'] },
      ],
      right: 'Roots, in time. That’s the most important job in the band.',
      why: {
        title: 'Why so few notes',
        paragraphs: [
          'A bass part isn’t there to be noticed. It locks with the kick drum, and marks where each chord begins.',
          'Plenty of hit songs do little more than this.',
        ],
      },
    },
    {
      kind: 'play',
      id: 'pulse',
      body: 'Now give it a pulse: first the root on beats 1 and 3, then a long-short rhythm, a dotted quarter and an eighth.',
      rungs: [
        { step: 'C2.3', label: 'Beats 1 and 3' },
        { step: 'C2.4', label: 'Long-short' },
      ],
      right:
        'That long-short lean is what makes a bass line feel like it’s going somewhere.',
      faults: {
        long: 'Lift off before the short note. It needs a little air in front of it.',
      },
      why: {
        title: 'Why it pushes forward',
        paragraphs: [
          'The short note sits just ahead of the next beat, so it leads the ear into it. Your hand is pointing at beat 3 before it gets there.',
        ],
      },
    },
    {
      kind: 'play',
      id: 'with-band',
      body: 'Now with the full band: each root, then the **5th** above it, over the same loop.',
      rungs: [{ step: 'C3.1', label: 'With the band' }],
      right: 'Bass locked in with the band. You’re holding down the low end.',
      why: {
        title: 'Why the 5th',
        paragraphs: [
          'The 5th is in the chord, so it can’t clash, and it’s the note that sounds most like the root. It adds movement without changing the harmony.',
          'Root and 5th is one of the oldest bass patterns there is.',
        ],
      },
    },
  ],
  takeaway: {
    kind: 'takeaway',
    id: 'takeaway',
    body: 'Quiet job, huge effect: your left hand now knows how to carry a song.',
    points: [
      'The bass mostly plays each chord’s **root**.',
      'The **5th** adds movement without changing the chord.',
      'A long-short rhythm leans the line into the next beat.',
    ],
    inSession:
      'Over any four-chord loop, play only roots for a full round. Then add 5ths, and notice how little it takes to fill the room.',
    limits:
      'Real bass parts rest more, and pass through more notes, than these do. This is the frame they hang on.',
    next: 'Next, both hands at once.',
  },
  practice: [
    {
      kind: 'choose',
      id: 'check-root',
      body: 'No hints from here.',
      question: 'What’s the root of a G major chord?',
      correct: 'g',
      right: 'G. A chord’s root is the note it’s named after.',
      choices: [
        {
          id: 'b',
          text: 'B',
          feedback: 'B is the 3rd of G major, the middle note.',
        },
        {
          id: 'd',
          text: 'D',
          feedback: 'D is the 5th of G major, the top note.',
        },
        { id: 'g', text: 'G' },
      ],
      why: {
        title: 'Roots',
        paragraphs: ['G major is G, B and D, and it’s built up from G.'],
      },
    },
    {
      kind: 'choose',
      id: 'check-fifth',
      body: 'You’re playing root and 5th under A minor.',
      question: 'Which two notes is that?',
      correct: 'a-e',
      right: 'A and E: the bottom and top of the chord.',
      choices: [
        {
          id: 'a-c',
          text: 'A and C',
          feedback: 'C is the 3rd. The 5th is the top note of the chord.',
        },
        { id: 'a-e', text: 'A and E' },
        {
          id: 'c-e',
          text: 'C and E',
          feedback:
            'That leaves out the root, which is the note the bass needs most.',
        },
      ],
      why: {
        title: 'Root and 5th',
        paragraphs: ['A minor is A, C and E. The root is A, and the 5th is E.'],
      },
    },
    {
      kind: 'play',
      id: 'check-memory',
      fromMemory: true,
      body: 'From memory: C major pentatonic in the bass, up and back down, in time.',
      rungs: [{ step: 'C1.3', label: 'In time' }],
      right: 'From memory, down where the bass lives.',
      why: {
        title: 'Why from memory',
        paragraphs: [
          'The left hand gets much less practice than the right. Knowing this without looking is what frees it up for bass lines.',
        ],
      },
    },
  ],
};

const PERFORMANCE: GuidedChapter = {
  id: 'D',
  name: 'Performance',
  hook: {
    kind: 'hook',
    id: 'hook',
    hear: 'D1.3',
    title: 'Two hands, and you sound like a band.',
    body: 'Hear it: roots in the left hand, chords in the right, over a full track. It’s everything so far, at once.',
  },
  screens: [
    {
      kind: 'play',
      id: 'two-hands',
      body: 'Left hand on the root, right hand on the chord: C, G, Am, F. Find each change at your own pace, then a bar each in time.',
      rungs: [
        { step: 'D1.1', label: 'At your own pace' },
        { step: 'D1.2', label: 'In time', credits: ['D1.1'] },
      ],
      right: 'Two hands in time together. That’s a full piano arrangement.',
      faults: {
        missed:
          'Both hands land together on the change. Move your eyes to the next chord early.',
      },
      why: {
        title: 'Why this is harder than it looks',
        paragraphs: [
          'Each hand already knows its part. The new skill is moving them together, and your right hand wants to wait for your left.',
          'Getting the next shape ready before the bar ends fixes most of it.',
        ],
      },
    },
    {
      kind: 'choose',
      id: 'two-jobs',
      body: 'You’re playing alone and the song’s getting muddy, with lots of low notes.',
      question: 'What usually helps most?',
      correct: 'space',
      right:
        'Less in the left hand. Low notes need room, so one root often does it.',
      choices: [
        {
          id: 'more',
          text: 'Add more notes to the left hand',
          feedback:
            'Low notes close together blur into each other, so more makes it muddier.',
        },
        { id: 'space', text: 'Thin out the left hand' },
        {
          id: 'louder',
          text: 'Play everything louder',
          feedback:
            'Louder mud is still mud. The problem is too many low notes at once.',
        },
      ],
      why: {
        title: 'Why low notes get muddy',
        paragraphs: [
          'The lower two notes are, the rougher they sound together. That’s why pianists spread chords out: one note down low, and the rest higher up.',
        ],
      },
    },
    {
      kind: 'play',
      id: 'full',
      body: 'The full performance now, with the band. Left hand plays the roots, and the right hand comps in quarter notes.',
      rungs: [{ step: 'D1.3', label: 'With the band' }],
      right: 'Full band, both hands. You just played a pop song.',
      why: {
        title: 'What “comping” is',
        paragraphs: [
          'To comp is to accompany: to play the chords in a rhythm that supports whatever’s on top.',
          'It’s what a piano does for most of most songs. Solos are the small part.',
        ],
      },
    },
    {
      kind: 'play',
      id: 'jams',
      body: 'Two longer jams with power chords. The first has a long-short bass under quarter notes, and the second runs 3-3-2 over eight bars.',
      rungs: [
        { step: 'D2.1', label: '4 bars' },
        { step: 'D2.2', label: '8 bars, 3-3-2' },
      ],
      right: 'Eight bars without stopping. That’s a verse, start to finish.',
      why: {
        title: 'Why it matters to keep going',
        paragraphs: [
          'A band doesn’t stop when someone misses a note. Getting back in on the next chord is its own skill, and long takes are how you learn it.',
        ],
      },
    },
  ],
  takeaway: {
    kind: 'takeaway',
    id: 'takeaway',
    body: 'That’s Level 1: a scale, four chords, a bass line, and both hands at once.',
    points: [
      'Your left hand holds the root, and your right hand plays the rhythm.',
      'Get the next shape ready before the bar ends.',
      'Keep low notes spread out so that they stay clear.',
    ],
    inSession:
      'Pick a song built on these four chords, and play along with the recording. If you get lost, drop to the left hand alone until you’re back.',
    limits:
      'Recorded songs are often in other keys. Knowing these by number is what lets you move them, and that’s coming.',
    next: 'Next, Level 2 builds on all of this.',
  },
  practice: [
    {
      kind: 'choose',
      id: 'check-hands',
      body: 'No hints from here.',
      question: 'Over an F chord, what’s the usual left-hand note?',
      correct: 'f',
      right: 'F, the chord’s root.',
      choices: [
        { id: 'f', text: 'F' },
        {
          id: 'a',
          text: 'A',
          feedback:
            'A is in the chord, but the bass usually takes the root, its name.',
        },
        {
          id: 'g',
          text: 'G',
          feedback: 'G isn’t in an F chord at all. F major is F, A and C.',
        },
      ],
      why: {
        title: 'Left hand, root',
        paragraphs: [
          'With the root in the bass, the chord is clear, however the right hand plays it.',
        ],
      },
    },
    {
      kind: 'choose',
      id: 'check-change',
      body: 'You keep arriving late on each chord change.',
      question: 'What’s most likely to fix it?',
      correct: 'ahead',
      right:
        'Looking ahead. Your hand has to be moving before the new bar begins.',
      choices: [
        { id: 'ahead', text: 'Get the next shape ready before the bar ends' },
        {
          id: 'harder',
          text: 'Play the new chord harder',
          feedback:
            'That makes it louder, not earlier. The move has to start sooner.',
        },
        {
          id: 'hold',
          text: 'Hold the old chord until you hear the new bar',
          feedback: 'By the time you’ve heard it, you’re already late.',
        },
      ],
      why: {
        title: 'Changes start early',
        paragraphs: [
          'A change happens in the last moment of the old bar. Let go just before the beat, so that you land right on it.',
        ],
      },
    },
    {
      kind: 'play',
      id: 'check-memory',
      fromMemory: true,
      body: 'From memory: left-hand roots and right-hand chords, C, G, Am, F, one bar each, in time.',
      rungs: [{ step: 'D1.2', label: 'In time' }],
      right: 'Both hands, from memory. Level 1 is yours.',
      why: {
        title: 'Why from memory',
        paragraphs: [
          'This is the point of the level. With nothing to read, you’re free to listen, and that’s what playing with other people takes.',
        ],
      },
    },
  ],
};

export const POP_LEVEL_1: readonly GuidedChapter[] = [
  MELODY,
  CHORDS,
  BASS,
  PERFORMANCE,
];
