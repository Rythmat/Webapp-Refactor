/**
 * Which written note a pressed key is answering, in a free-time activity.
 *
 * Out of time there is no clock to match against, so the only way to know what
 * a key press means is position in the sequence. The rule is that you cannot
 * skip ahead: only notes at the earliest unfinished onset are up for grabs, so
 * jabbing at bar 4 while bar 1 is unplayed earns nothing.
 *
 * The part that needs care is what "unfinished" means for a note you are still
 * holding down. Two hands do not move in lockstep — a left-hand root rings
 * through an octave pop above it, a pedal tone sits under a whole phrase. If a
 * sustained note counts as unfinished, it pins the gate to its own onset and
 * every later note, in either hand, is rejected until the finger lifts. That is
 * precisely the bug this module exists to prevent: the student plays the right
 * thing and the app ignores it.
 *
 * So a note under a finger is IN PROGRESS, not outstanding. It has been started
 * correctly; it is simply not finished yet. It stops holding the gate shut, and
 * it is credited on release if it was held long enough. Nothing is given away
 * by this: a held note only frees the gate for the notes that come AFTER it,
 * and a wrong note claims nothing because it matches no event at the gate.
 */

export interface GateEvent {
  id: string;
  midi?: number;
  startTicks: number;
  durationTicks: number;
}

export interface GateMatch<E extends GateEvent> {
  event: E;
  index: number;
}

/**
 * The event a pitch should answer next, free-time.
 *
 * @param events   every note written for the step, in any order
 * @param midi     the pitch just pressed
 * @param completed ids already credited
 * @param held     ids currently under a finger — in progress, not outstanding
 */
export function currentEventForMidi<E extends GateEvent>(
  events: readonly E[],
  midi: number,
  completed: ReadonlySet<string>,
  held: ReadonlySet<string> = new Set(),
): GateMatch<E> | null {
  // The gate sits at the earliest onset still genuinely outstanding. Notes
  // being held are skipped, so they cannot pin it behind the other hand.
  let gateOnset = Infinity;
  for (const event of events) {
    if (completed.has(event.id) || held.has(event.id)) continue;
    if (event.startTicks < gateOnset) gateOnset = event.startTicks;
  }
  if (gateOnset === Infinity) return null;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (event.midi !== midi) continue;
    if (completed.has(event.id) || held.has(event.id)) continue;
    if (event.startTicks !== gateOnset) continue;
    return { event, index: i };
  }
  return null;
}

/**
 * The next uncompleted event for a pitch, in time.
 *
 * In-time steps have a clock, and the piano roll playhead already says where
 * the student is, so order is enforced by the music rather than by a gate.
 */
export function nextEventForMidi<E extends GateEvent>(
  events: readonly E[],
  midi: number,
  completed: ReadonlySet<string>,
): GateMatch<E> | null {
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (event.midi === midi && !completed.has(event.id)) {
      return { event, index: i };
    }
  }
  return null;
}
