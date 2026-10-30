import { LessonInsightPanel } from '@/curriculum/guitar/layout/LessonInsightPanel';
import {
  INSIGHT_DIM,
  INSIGHT_TEXT,
  InsightCard,
} from '@/daw/components/Library/InsightCard';
import type { AnatomyInstrument } from './anatomyTypes';

// ── About an instrument's anatomy ──────────────────────────────────────────
// What the activity teaches, on request: the lesson's Insight panel.

export function AnatomyAbout({
  open,
  onClose,
  instrument,
}: {
  open: boolean;
  onClose: () => void;
  instrument: AnatomyInstrument;
}) {
  return (
    <LessonInsightPanel
      open={open}
      onClose={onClose}
      name="about"
      title={`About ${instrument} anatomy`}
    >
      <InsightCard title="Reading the diagram">
        <p className={INSIGHT_TEXT}>
          Every part sits above the place it belongs, on a shared line, the way
          a repair manual draws it.
        </p>
        <p className={INSIGHT_DIM}>
          Choose a part and the rest goes back together around it. The slider
          takes the whole {instrument} apart by hand.
        </p>
      </InsightCard>
      {instrument === 'keyboard' ? (
        <>
          <InsightCard title="A piano with no strings">
            <p className={INSIGHT_TEXT}>
              The keys look the same, but there are no hammers. Each key closes
              a contact, and the main board plays the sound through the
              speakers.
            </p>
            <p className={INSIGHT_DIM}>
              It never needs tuning, and one keyboard can hold hundreds of
              sounds.
            </p>
          </InsightCard>
          <InsightCard title="Keyboard or piano?">
            <p className={INSIGHT_TEXT}>
              The note pattern is identical, so what you learn on one carries to
              the other.
            </p>
            <p className={INSIGHT_DIM}>
              The feel is not: these keys are light and unweighted. If you are
              working toward piano, practice on weighted keys when you can.
            </p>
          </InsightCard>
        </>
      ) : instrument === 'synth' ? (
        <>
          <InsightCard title="Follow the sound">
            <p className={INSIGHT_TEXT}>
              Oscillators make a raw wave, the filter shapes its tone, and the
              amplifier sets its loudness.
            </p>
            <p className={INSIGHT_DIM}>
              The envelope and LFO don’t make sound. They move those settings
              over time, which is what brings it to life.
            </p>
          </InsightCard>
          <InsightCard title="Try it in the Studio">
            <p className={INSIGHT_TEXT}>
              The Oracle synth in the Studio has the same kinds of controls:
              oscillators, a filter, envelopes and LFOs.
            </p>
            <p className={INSIGHT_DIM}>
              This drawing is a generic layout. Real synths arrange and name
              their panels in their own ways, but the sound path is the same
              idea.
            </p>
          </InsightCard>
        </>
      ) : instrument === 'piano' ? (
        <>
          <InsightCard title="From key to sound">
            <p className={INSIGHT_TEXT}>
              A key is a lever. It throws a hammer at the strings and lifts a
              damper out of the way.
            </p>
            <p className={INSIGHT_DIM}>
              The strings pass their vibration through the bridges to the
              soundboard, which moves the air. Letting go drops the damper and
              stops the note.
            </p>
          </InsightCard>
          <InsightCard title="Grand and upright">
            <p className={INSIGHT_TEXT}>
              They hold the same parts. A grand lays them flat; an upright
              stands them on end to fit against a wall.
            </p>
            <p className={INSIGHT_DIM}>
              Choose Hammers, then switch pianos: one strikes upward and falls
              back by gravity, the other strikes forward and returns on springs.
            </p>
          </InsightCard>
        </>
      ) : instrument === 'ukulele' ? (
        <>
          <InsightCard title="Not a small guitar">
            <p className={INSIGHT_TEXT}>
              A ukulele’s four nylon strings pull far less than a guitar’s steel
              ones, so it needs less to hold it together.
            </p>
            <p className={INSIGHT_DIM}>
              Most have no truss rod, the bracing is light, and the strings tie
              straight onto the bridge with no pins.
            </p>
          </InsightCard>
          <InsightCard title="The high G">
            <p className={INSIGHT_TEXT}>
              The strings are G, C, E, A, but the G is tuned above the C and E.
              It is called re-entrant tuning.
            </p>
            <p className={INSIGHT_DIM}>
              That jump is why a strum sounds bright and chiming rather than low
              and full.
            </p>
          </InsightCard>
        </>
      ) : (
        <>
          {instrument === 'bass' ? (
            <InsightCard title="Two ways to make a sound">
              <p className={INSIGHT_TEXT}>
                An electric bass’s solid body stays nearly silent. Its pickup
                turns the strings’ movement into a signal for the amp to make
                loud.
              </p>
              <p className={INSIGHT_DIM}>
                An acoustic bass is a hollow box, but low notes need a lot of
                air to move, so it is quiet next to a guitar. Most carry a
                pickup under the saddle for playing with a band.
              </p>
            </InsightCard>
          ) : (
            <InsightCard title="Two ways to make a sound">
              <p className={INSIGHT_TEXT}>
                An acoustic guitar is a hollow box: the bridge passes the
                strings’ vibration into a thin top, which moves the air.
              </p>
              <p className={INSIGHT_DIM}>
                An electric guitar’s solid body stays nearly silent. Its pickups
                turn the strings’ movement into a signal for the amp to make
                loud.
              </p>
            </InsightCard>
          )}
          <InsightCard title="What they share">
            <p className={INSIGHT_TEXT}>
              The neck is nearly the same on both: a truss rod inside, a
              fretboard on top, frets to scale.
            </p>
            <p className={INSIGHT_DIM}>
              Choose Fretboard or Bridge, then switch instruments to compare
              them.
            </p>
          </InsightCard>
        </>
      )}
    </LessonInsightPanel>
  );
}
