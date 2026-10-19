import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '@/daw/store';
import type { AnchorRack, Target } from '../anchorRegistry';
import type { TutorialStep } from '../tutorials';
import { DemoPlayer, type DemoFrame } from './demoPlayer';

// ── useStepDemo ─────────────────────────────────────────────────────────────
// Plays the running step's demo while the lesson is in its 'watch' phase
// (tutorialSlice), and hands over to the student when it ends: the phase
// turns to 'turn', which arms the step's check (TutorialLayer). A new play
// starts each time the phase enters 'watch' (the step arriving, "Show me
// again"); leaving the step, quitting or a project switch aborts it where it
// is. Skip runs the beats left at once (DemoPlayer.skip), so the Studio ends
// as the demo would leave it.

export interface StepDemo {
  /** What the stage draws; null when no demo is playing. */
  frame: DemoFrame | null;
  /** The caption the coach card reads out, while the demo plays. */
  caption: string | null;
  /**
   * The beat the cursor last arrived on, for the spotlight and the card to
   * frame (kept while the cursor glides on to the next); null before the
   * first.
   */
  spot: { target?: Target; rack?: AnchorRack } | null;
  /** Run the beats left at once and give the student their turn. */
  skip(): void;
}

export function useStepDemo(
  step: TutorialStep | null,
  watching: boolean,
  reducedMotion: boolean,
): StepDemo {
  const run = useStore((s) => s.tutorialDemoRun);
  const endDemo = useStore((s) => s.endTutorialDemo);
  const [frame, setFrame] = useState<DemoFrame | null>(null);
  const [caption, setCaption] = useState<string | null>(null);
  const [spot, setSpot] = useState<StepDemo['spot']>(null);
  const player = useRef<DemoPlayer | null>(null);
  // Read when the cursor moves, so a change in the setting mid-demo applies
  // without starting the demo over.
  const motion = useRef(reducedMotion);
  motion.current = reducedMotion;

  const beats = step?.demo;
  const playing = watching && !!beats && beats.length > 0;

  useEffect(() => {
    if (!playing || !beats) return;
    const current = new DemoPlayer(beats, {
      onFrame: (next) => {
        setFrame(next);
        if (next.caption) setCaption(next.caption);
        if (next.target) {
          const arrived = { target: next.target, rack: next.rack };
          setSpot((prev) =>
            prev?.target === arrived.target && prev?.rack === arrived.rack
              ? prev
              : arrived,
          );
        }
      },
      reducedMotion: () => motion.current,
    });
    player.current = current;
    let live = true;
    void current.play().then((outcome) => {
      if (!live || outcome === 'aborted') return;
      endDemo();
    });
    return () => {
      live = false;
      current.abort();
      if (player.current === current) player.current = null;
      setFrame(null);
      setCaption(null);
      setSpot(null);
    };
    // A play per entry into 'watch' (run counts them) for this step.
  }, [playing, beats, run, endDemo]);

  // A step with no demo to play (or a phase left over from a step that had
  // one) is the student's turn at once.
  useEffect(() => {
    if (watching && !playing) endDemo();
  }, [watching, playing, endDemo]);

  const skip = useCallback(() => {
    if (player.current) player.current.skip();
    else endDemo();
  }, [endDemo]);

  return {
    frame: playing ? frame : null,
    caption: playing ? caption : null,
    spot: playing ? spot : null,
    skip,
  };
}
