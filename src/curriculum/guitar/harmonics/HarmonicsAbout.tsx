import {
  INSIGHT_DIM,
  INSIGHT_TEXT,
  InsightCard,
} from '@/daw/components/Library/InsightCard';
import { LessonInsightPanel } from '../layout/LessonInsightPanel';

// ── About harmonics ────────────────────────────────────────────────────────
// What the activity teaches, on request: the lesson's Insight panel.

export function HarmonicsAbout({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <LessonInsightPanel
      open={open}
      onClose={onClose}
      name="about"
      title="About harmonics"
    >
      <InsightCard title="Touch, don't press">
        <p className={INSIGHT_TEXT}>
          A natural harmonic rings when a finger rests on the string without
          pushing it to the fret.
        </p>
        <p className={INSIGHT_DIM}>
          The light touch stops every way the string can vibrate except those
          that are still at that point. Pluck near the bridge, then lift the
          finger so the harmonic rings on.
        </p>
      </InsightCard>
      <InsightCard title="Nodes">
        <p className={INSIGHT_TEXT}>
          A string vibrates as a whole and in halves, thirds, quarters… at once.
        </p>
        <p className={INSIGHT_DIM}>
          Partial n divides it into n equal parts. The points between them
          (nodes) are where touching leaves partial n ringing: half the string
          (12th fret) gives the octave, a third (7th and 19th frets) an octave
          and a 5th, a quarter (5th fret) two octaves. A node is shared with a
          lower partial when its fraction reduces (2/4 is 1/2).
        </p>
      </InsightCard>
      <InsightCard title="Press vs touch">
        <p className={INSIGHT_TEXT}>
          At the same spot, pressing and touching give different notes.
        </p>
        <p className={INSIGHT_DIM}>
          Pressed, only the part from the finger to the bridge sounds: 2/3 of
          the string is a 5th above the open string. Touched there, the whole
          string rings in thirds: three times the open string's frequency.
        </p>
      </InsightCard>
      <InsightCard title="Off the frets">
        <p className={INSIGHT_TEXT}>
          Harmonics are pure whole-number ratios; frets are equal temperament.
        </p>
        <p className={INSIGHT_DIM}>
          So most harmonics sit a few cents away from the fretted note of the
          same name: the 5th partial (a major 3rd) is about 14 cents flat, the
          7th (a minor 7th) 31 cents flat, the 11th almost a quarter tone off.
          The 2nd, 4th and 8th are exact octaves.
        </p>
      </InsightCard>
    </LessonInsightPanel>
  );
}
