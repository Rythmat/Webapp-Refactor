import type { ModelKind } from './anatomyTypes';
import { KEYBOARD_COPY, SYNTH_COPY } from './keyboardCopy';
import { GRAND_PIANO_COPY, PIANO_COPY, UPRIGHT_PIANO_COPY } from './pianoCopy';

// ── What each word means ───────────────────────────────────────────────────
// One line on what the part does, one on why a player cares. An instrument's
// own entry wins; then, on a bass, what is true of both basses; then the rest.

export interface TermCopy {
  what: string;
  why: string;
}

const SHARED: Readonly<Record<string, TermCopy>> = {
  neck: {
    what: 'The long arm your fretting hand wraps around, joining the headstock to the body.',
    why: 'Its thickness and shape decide how chords feel under your hand.',
  },
  headstock: {
    what: 'The end of the neck, where the tuners are mounted.',
    why: 'Its layout sets how straight each string runs from the nut to its tuner, which helps it stay in tune.',
  },
  tuningPegs: {
    what: 'Geared machines that wind each string tighter or looser.',
    why: 'Tighter raises the pitch. Tune up to the note, not down to it, so the gears stay snug.',
  },
  nut: {
    what: 'The slotted strip at the top of the fretboard. It spaces the strings and marks one end of their ringing length.',
    why: 'Open strings that buzz, or a first fret that is hard to press, often trace back to the nut.',
  },
  fretboard: {
    what: 'The hard wooden face glued on top of the neck, where you press the strings.',
    why: 'Its wood and its curve change how bends and fast runs feel.',
  },
  frets: {
    what: 'Metal wires across the fretboard. Pressing behind one stops the string there and sets the note.',
    why: 'Each fret is one half step. Press just behind the wire for a clean note with the least effort.',
  },
  fretMarkers: {
    what: 'Inlays at frets 3, 5, 7, 9 and 15 and up, with a double at the 12th.',
    why: 'They are your map of the neck: the 12th fret is the octave of the open string.',
  },
  trussRod: {
    what: 'A steel rod inside the neck, under the fretboard, that counters the pull of the strings.',
    why: 'Necks shift with the seasons. A small turn of the rod corrects the curve; leave big changes to a repair tech.',
  },
  pickguard: {
    what: 'A thin plate that protects the top from your pick.',
    why: 'Strumming hard scratches a finish quickly. This takes the wear instead.',
  },
  body: {
    what: 'The large part of the guitar that the neck joins and the bridge sits on.',
    why: 'Its size and shape decide how the guitar sits against you.',
  },
  tonewood: {
    what: 'The woods a guitar is made from, chosen for how they look, weigh and vibrate.',
    why: 'Woods change the weight and feel of a guitar as well as its character, so try several.',
  },
  bridge: {
    what: 'The hardware on the body that anchors the far end of the strings.',
    why: 'It sets how high the strings sit over the frets, which is much of how easy a guitar is to play.',
  },
  strings: {
    what: 'Six steel strings, from the thick low E on the bass side to the thin high E.',
    why: 'Their vibration is where every sound begins. Gauge and age change both tone and how hard they are to press.',
  },
};

const OWN: Readonly<Record<ModelKind, Readonly<Record<string, TermCopy>>>> = {
  keyboard: KEYBOARD_COPY,
  synth: SYNTH_COPY,
  grandPiano: GRAND_PIANO_COPY,
  uprightPiano: UPRIGHT_PIANO_COPY,
  electricBass: {
    body: {
      what: 'A solid slab of wood that carries the bridge and the pickguard.',
      why: 'With no hollow chamber it is quiet unplugged. The sound you hear comes from the pickup and the amp.',
    },
    tonewood: {
      what: 'The wood of the body and neck, chosen for how it looks, weighs and vibrates.',
      why: 'Weight and feel change the most. A lighter body can spare your shoulder on a long gig.',
    },
    neckPocket: {
      what: 'The recess cut into the body where the neck bolts on.',
      why: 'A snug pocket passes vibration from neck to body, and a bolt-on neck can be replaced.',
    },
    pickguard: {
      what: 'One large plate that protects the finish and holds the pickup, the knobs and the jack.',
      why: 'Lift it and the wiring comes with it, so repairs and upgrades are easy.',
    },
    strapButtons: {
      what: 'Two metal posts that hold a strap, one on the butt of the body and one on the upper horn.',
      why: 'A bass is heavy. Check the strap is on tight before you stand up: a fall can snap a headstock.',
    },
    stringTree: {
      what: 'A small guide that holds the thinner strings down behind the nut.',
      why: 'On a four-in-line headstock they run at a shallow angle and need it to stay seated in the nut.',
    },
    pickup: {
      what: 'Magnets wrapped in fine wire, in two offset halves: one for the E and A strings, one for the D and G.',
      why: 'This is how an electric bass makes its sound, and this split design is the round, full sound under countless records.',
    },
    volume: {
      what: 'A knob that sets how much signal leaves the bass.',
      why: 'Keep it near full for the strongest signal, and turn the amp to set how loud you are.',
    },
    tone: {
      what: 'A knob that rolls off the high frequencies.',
      why: 'Turn it down for a darker, thumpier sound. Try it before changing anything on the amp.',
    },
    outputJack: {
      what: 'The socket where the cable plugs in and the signal leaves for the amp.',
      why: 'Crackling usually means a loose jack or a worn cable. Turn the amp down before you plug in.',
    },
    bridge: {
      what: 'The plate at the tail of the body that anchors the strings and holds the saddles.',
      why: 'It sets string height and length, so it is where a setup is adjusted.',
    },
    saddle: {
      what: 'Four small blocks, one per string, that mark the far end of the ringing length.',
      why: 'Each one moves separately for height and intonation, so notes stay in tune up the neck.',
    },
  },
  ukulele: {
    neck: {
      what: 'The short, slim arm your fretting hand wraps around. On this concert size the strings run 15 inches from nut to bridge.',
      why: 'The short reach puts chords within easy stretch, which is why so many people start here.',
    },
    headstock: {
      what: 'The small end of the neck, with two tuners on each side.',
      why: 'It is light, so the ukulele balances easily when you hold it against you.',
    },
    tuningPegs: {
      what: 'Small pegs that wind each string tighter or looser, either geared like these or simple friction pegs.',
      why: 'New nylon strings stretch for days, so expect to retune often at first. Tune up to the note.',
    },
    nut: {
      what: 'The slotted strip at the top of the fretboard. It spaces the strings and marks one end of their ringing length.',
      why: 'Open strings that buzz, or a first fret that is hard to press, often trace back to the nut.',
    },
    fretboard: {
      what: 'The hard wooden face glued on top of the neck, where you press the strings.',
      why: 'Nylon strings are gentle on fingertips, so you can play here longer as a beginner.',
    },
    frets: {
      what: 'Metal wires across the fretboard. Pressing behind one stops the string there and sets the note.',
      why: 'Each fret is one half step. Press just behind the wire for a clean note with the least effort.',
    },
    fretSpaces: {
      what: 'The gaps between the frets, where your fingertip goes. The third fret means the space just behind the third wire.',
      why: 'They are small on a ukulele, so one finger per fret comes easily, though big hands may need to arch more.',
    },
    fretMarkers: {
      what: 'Dots at frets 5, 7, 10, 12 and 15.',
      why: 'They are your map of the neck: the 12th fret is the octave of the open string.',
    },
    body: {
      what: 'A small hollow box of top, back and sides, in a rounded figure-eight.',
      why: 'Most players hold it against the chest with the forearm, with no strap needed.',
    },
    top: {
      what: 'The thin plate on the front, also called the soundboard, often koa, mahogany or spruce.',
      why: 'It does most of the speaker’s work, so it most shapes how the ukulele sounds.',
    },
    soundHole: {
      what: 'The opening in the top that lets air move in and out of the body.',
      why: 'Strum over the end of the neck, just above it, for a sweet, warm sound.',
    },
    rosette: {
      what: 'The decorative ring around the sound hole.',
      why: 'It also reinforces the edge of the opening, where the thin top is cut.',
    },
    bracing: {
      what: 'Light wooden struts glued under the top, here running mostly straight across.',
      why: 'Nylon strings pull gently, so a light frame can hold the top and still let it vibrate.',
    },
    backSides: {
      what: 'The curved sides and the back close the box and hold its air.',
      why: 'They reflect the top’s sound outward. Larger sizes hold more air and sound fuller.',
    },
    tonewood: {
      what: 'The woods of the ukulele. Koa is the traditional Hawaiian choice; mahogany and spruce are common too.',
      why: 'Koa tends to sound bright and sweet, mahogany warm, spruce clear and loud.',
    },
    bridge: {
      what: 'The wooden block glued to the top. The strings knot or tie onto it, with no pins.',
      why: 'It passes every vibration into the top. Check your knots: a slipping string goes flat.',
    },
    saddle: {
      what: 'The thin strip set into the bridge, where the strings’ ringing length ends.',
      why: 'Its height sets how far the strings are from the frets, so it decides how easily chords press down.',
    },
    strings: {
      what: 'Four nylon strings tuned G, C, E, A. The G is tuned high, above the C and E beside it.',
      why: 'That high G is the ukulele’s signature: it gives a strum its bright, chiming sound.',
    },
  },
  acousticBass: {
    body: {
      what: 'A large hollow box of top, back and sides that makes the strings audible without electronics.',
      why: 'Low notes need a lot of air to move, so even a big body is quiet next to a guitar.',
    },
    top: {
      what: 'The thin plate on the front, also called the soundboard, usually spruce or cedar.',
      why: 'It does most of the speaker’s work, so it most shapes how the bass sounds unplugged.',
    },
    soundHole: {
      what: 'The opening in the top that lets air move in and out of the body.',
      why: 'Pluck near it for a warm, full sound; move toward the bridge for a tighter one.',
    },
    rosette: {
      what: 'The decorative ring around the sound hole.',
      why: 'It also reinforces the edge of the opening, where the thin top is cut.',
    },
    pickguard: {
      what: 'A thin plate on the top beside the sound hole.',
      why: 'Your plucking hand brushes the top with every note. This takes the wear instead.',
    },
    bracing: {
      what: 'Wooden struts glued under the top in a pattern, here an X.',
      why: 'They let a thin top survive the pull of four heavy strings and still vibrate.',
    },
    backSides: {
      what: 'The curved sides and the back close the box and hold its air.',
      why: 'They reflect the top’s sound outward, and a deep rim helps the low end.',
    },
    tonewood: {
      what: 'The woods of the bass: often spruce for the top, mahogany or maple for the back and sides.',
      why: 'Unplugged, the wood is much of the sound. Plugged in, the pickup shapes it more.',
    },
    bridge: {
      what: 'The wooden block glued to the top that anchors the strings.',
      why: 'It passes every vibration from the strings into the top, which is how the bass gets loud.',
    },
    saddle: {
      what: 'The thin strip set into the bridge, where the strings’ ringing length ends.',
      why: 'Its height sets how far the strings are from the frets, and its slant helps notes stay in tune.',
    },
    bridgePins: {
      what: 'Four pegs that hold the ball end of each string inside the bridge.',
      why: 'When changing strings, make sure each ball end seats under the top before you tune up.',
    },
    piezo: {
      what: 'A thin pickup strip under the saddle. The strings press down on it through the saddle with every note.',
      why: 'An acoustic bass struggles to be heard over a band, so this lets you plug in.',
    },
    outputJack: {
      what: 'A socket in the end of the body, which also holds one end of a strap.',
      why: 'Turn the amp down before you plug in. A cable also tugs on it, so loop it through your strap.',
    },
  },
  electric: {
    body: {
      what: 'A solid slab of wood that carries the bridge, the pickups and the controls.',
      why: 'With no hollow chamber it is quiet unplugged. The sound you hear comes from the pickups and the amp.',
    },
    tonewood: {
      what: 'The wood of the body and neck, chosen for how it looks, weighs and vibrates.',
      why: 'Weight and feel change the most. On an electric, the pickups and amp shape the sound far more.',
    },
    pickguard: {
      what: 'The plate that protects the finish and, on this design, carries the pickups and controls.',
      why: 'Lift it and the wiring comes with it, so repairs and upgrades are easy.',
    },
    neckPocket: {
      what: 'The recess cut into the body where the neck bolts on.',
      why: 'A snug pocket passes vibration from neck to body, and a bolt-on neck can be replaced.',
    },
    strapButtons: {
      what: 'Two metal posts that hold a strap, one on the butt of the body and one on the upper horn.',
      why: 'Check that the strap is on tight before you stand up: a fall can snap a headstock.',
    },
    stringTree: {
      what: 'A small guide that holds the thinner strings down behind the nut.',
      why: 'On a six-in-line headstock they run at a shallow angle and need it to stay seated in the nut.',
    },
    pickups: {
      what: 'Magnets wrapped in fine wire. A vibrating steel string disturbs the field and makes an electric signal.',
      why: 'This is how an electric guitar makes its sound: where the pickup sits decides the tone.',
    },
    neckPickup: {
      what: 'The pickup nearest the neck, where the string swings the widest.',
      why: 'It sounds warm and round, a natural choice for rhythm and blues.',
    },
    middlePickup: {
      what: 'The pickup between the other two.',
      why: 'On its own it is balanced, and combined with a neighbour it gives a thinner, glassy tone.',
    },
    bridgePickup: {
      what: 'The pickup nearest the bridge, where the string moves the least. It is angled to balance the strings.',
      why: 'It sounds bright and cutting, a natural choice for lead lines and driven tones.',
    },
    pickupSelector: {
      what: 'A switch that chooses which pickups are heard.',
      why: 'It is the fastest tone change on the guitar: flip from warm neck to bright bridge mid-song.',
    },
    volume: {
      what: 'A knob that sets how much signal leaves the guitar.',
      why: 'Rolling it back also cleans up a driven amp, so it is a tone control as well.',
    },
    tone: {
      what: 'Knobs that roll off the high frequencies.',
      why: 'Turn down for a darker, softer sound. Try it before changing anything on the amp.',
    },
    outputJack: {
      what: 'The socket where the cable plugs in and the signal leaves for the amp.',
      why: 'Crackling usually means a loose jack or a worn cable. Turn the amp down before you plug in.',
    },
    bridge: {
      what: 'The plate that anchors the strings and holds the saddles. On this design it can rock on a pivot.',
      why: 'It sets string height and length, so it is where a setup is adjusted.',
    },
    saddle: {
      what: 'Six small blocks, one per string, that mark the far end of the ringing length.',
      why: 'Each one moves separately for height and intonation, so notes stay in tune up the neck.',
    },
    tremoloArm: {
      what: 'A lever that rocks the bridge, slackening or tightening the strings.',
      why: 'It bends whole chords and adds vibrato. Press gently: a hard dive can knock the guitar out of tune.',
    },
  },
  acoustic: {
    body: {
      what: 'A hollow box of top, back and sides that makes the strings loud without any electronics.',
      why: 'Bigger bodies tend to sound deeper and louder; smaller ones are comfortable and focused.',
    },
    top: {
      what: 'The thin plate on the front, also called the soundboard, usually spruce or cedar.',
      why: 'It does most of the speaker’s work. It is the part that most shapes how a guitar sounds.',
    },
    soundHole: {
      what: 'The opening in the top that lets air move in and out of the body.',
      why: 'Pick near it for a warm, full sound; move toward the bridge for a brighter one.',
    },
    rosette: {
      what: 'The decorative ring around the sound hole.',
      why: 'It also reinforces the edge of the opening, where the thin top is cut.',
    },
    pickguard: {
      what: 'A thin plate on the top beside the sound hole.',
      why: 'Strumming hard scratches a soft spruce top quickly. This takes the wear instead.',
    },
    bracing: {
      what: 'Wooden struts glued under the top in a pattern, here an X.',
      why: 'They let a thin top survive the pull of the strings and still vibrate. The pattern shapes the tone.',
    },
    backSides: {
      what: 'The curved sides and the back close the box and hold its air.',
      why: 'They reflect the top’s sound outward, and a deeper rim gives more low end.',
    },
    tonewood: {
      what: 'The woods of the guitar: often spruce or cedar for the top, mahogany or rosewood for the back and sides.',
      why: 'On an acoustic, the wood is the sound. Mahogany tends to be warm, rosewood rich and ringing.',
    },
    bridge: {
      what: 'The wooden block glued to the top that anchors the strings.',
      why: 'It passes every vibration from the strings into the top, which is how the guitar gets loud.',
    },
    saddle: {
      what: 'The thin strip set into the bridge, where the strings’ ringing length ends.',
      why: 'Its height sets how far the strings are from the frets, and its slant helps notes stay in tune.',
    },
    bridgePins: {
      what: 'Six pegs that hold the ball end of each string inside the bridge.',
      why: 'When changing strings, make sure each ball end seats under the top before you tune up.',
    },
  },
};

/** What is true of both basses. */
const BASS: Readonly<Record<string, TermCopy>> = {
  neck: {
    what: 'The long arm your fretting hand wraps around. A bass’s strings run about 34 inches from nut to bridge, far longer than a guitar’s.',
    why: 'Thick, low strings need that length to ring clearly. It is also why the frets are spaced so wide.',
  },
  headstock: {
    what: 'The end of the neck, where the large tuners are mounted.',
    why: 'It is heavy for its size, so a bass can dip toward the floor. A wide strap helps hold it level.',
  },
  tuningPegs: {
    what: 'Large geared machines, also called machine heads, that wind each thick string tighter or looser.',
    why: 'Tighter raises the pitch. Tune up to the note, not down to it, so the gears stay snug.',
  },
  fretboard: {
    what: 'The hard wooden face glued on top of the neck, where you press the strings.',
    why: 'Its long reach is why many bassists use three fingers across four frets low on the neck, and spread out higher up.',
  },
  frets: {
    what: 'Metal wires across the fretboard. Pressing behind one stops the string there and sets the note.',
    why: 'Each fret is one half step. They are wide apart low on the neck, so let your whole hand shift.',
  },
  fretSpaces: {
    what: 'The gaps between the frets, where your fingertip goes. The third fret means the space just behind the third wire.',
    why: 'They are wide low on a bass and narrow as you climb the neck, so your hand shape changes as you move.',
  },
  strings: {
    what: 'Four thick strings tuned E, A, D, G, an octave below the same four strings on a guitar.',
    why: 'Their weight is where the low end comes from. Pluck with your fingers or a pick, and try both.',
  },
  tonewood: {
    what: 'The woods a bass is made from, chosen for how they look, weigh and vibrate.',
    why: 'A bass is heavy, so a lighter wood can spare your shoulder on a long gig.',
  },
};

export function termCopy(kind: ModelKind, id: string): TermCopy | undefined {
  const onBass = kind === 'electricBass' || kind === 'acousticBass';
  const onPiano = kind === 'grandPiano' || kind === 'uprightPiano';
  if (onPiano) return OWN[kind][id] ?? PIANO_COPY[id];
  if (kind === 'keyboard' || kind === 'synth') return OWN[kind][id];
  return OWN[kind][id] ?? (onBass ? BASS[id] : undefined) ?? SHARED[id];
}
