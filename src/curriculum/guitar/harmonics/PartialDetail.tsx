import { useMemo } from 'react';
import { midiNameInKey } from '@prism/engine';
import { FixedDigits } from '@/components/common/FixedDigits';
import { GrandStaff } from '@/components/notation/GrandStaff';
import { cn } from '@/components/utilities';
import {
  describeNodeFret,
  formatCents,
  harmonicNodes,
  partialInfo,
  type HarmonicNode,
} from '@/lib/guitar/harmonics';
import { buildScore } from '@/lib/notation';
import { nodeId } from './HarmonicNeck';
import { noteName } from './spelling';

// ── A partial, explained ───────────────────────────────────────────────────
// What the chosen node rings: the partial and its interval over the open
// string, where to touch (and its other places), the pitch in Hz and on the
// staff (guitar's treble clef, written an octave up, with the 8 under it),
// and how far equal temperament's nearest note is from it, in cents.

export interface PartialDetailProps {
  openMidi: number;
  /** The open string's name: "A". */
  stringName: string;
  node: HarmonicNode;
  keyColor: string;
  /** Another node of the same partial was chosen. */
  onPickNode?: (node: HarmonicNode) => void;
  /** Hear the partial again. */
  onHear?: () => void;
  className?: string;
}

export function PartialDetail({
  openMidi,
  stringName,
  node,
  keyColor,
  onPickNode,
  onHear,
  className,
}: PartialDetailProps) {
  const info = partialInfo(openMidi, node.partial);
  const others = harmonicNodes(node.partial);
  const name = noteName(info.nearestMidi, openMidi);
  const inTune = Math.abs(info.cents) < 0.05;

  const score = useMemo(() => {
    // Guitar is written an octave above where it sounds.
    const written = info.nearestMidi + 12;
    return buildScore(
      [
        {
          id: 'partial',
          midi: written,
          startTick: 0,
          durationTicks: 1920,
          name: midiNameInKey(written, openMidi % 12),
        },
      ],
      {
        staves: 'treble',
        minMeasures: 1,
        timeSignature: [4, 4] as [number, number],
        // No key signature: the accidental on the note, as one pitch reads.
        keyFifths: 0,
      },
    );
  }, [info.nearestMidi, openMidi]);

  return (
    <section
      data-partial-detail={node.partial}
      aria-live="polite"
      className={cn(
        'flex flex-col gap-4 rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-5 sm:flex-row sm:items-stretch',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div>
          <p className="text-sm leading-5 text-white/55">
            Partial {node.partial} · {node.k}/{node.partial} of the string
          </p>
          <h2 className="text-xl leading-7 text-[#e8e8f0]">{info.interval}</h2>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm leading-5">
          <dt className="text-white/55">Touch</dt>
          <dd className="text-[#e8e8f0]">{describeNodeFret(node.fret)}</dd>
          <dt className="text-white/55">Sounds</dt>
          <dd className="text-[#e8e8f0]">
            {name} ·{' '}
            <FixedDigits text={info.hz.toFixed(info.hz < 1000 ? 1 : 0)} /> Hz
            <span className="text-white/55">
              {' '}
              ({stringName} × {node.partial})
            </span>
          </dd>
          <dt className="text-white/55">vs. {name}</dt>
          <dd className="flex items-center gap-2">
            <span
              data-cents
              className="inline-flex h-6 items-center rounded-full border px-2.5 text-xs"
              style={
                inTune
                  ? { borderColor: 'rgba(255,255,255,0.15)', color: '#e8e8f0' }
                  : { borderColor: keyColor, color: '#e8e8f0' }
              }
            >
              <FixedDigits text={`${formatCents(info.cents)} ¢`} />
            </span>
            <span className="text-xs leading-4 text-white/55">
              {inTune
                ? 'In tune with equal temperament'
                : info.cents < 0
                  ? 'Flatter than the fretted note'
                  : 'Sharper than the fretted note'}
            </span>
          </dd>
        </dl>
        {others.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs leading-4 text-white/55">
              Also rings at
            </span>
            {others.map((other) => {
              const current = nodeId(other) === nodeId(node);
              return (
                <button
                  key={nodeId(other)}
                  type="button"
                  aria-pressed={current}
                  onClick={() => onPickNode?.(other)}
                  className={cn(
                    'h-7 rounded-full border px-2.5 text-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/40',
                    current
                      ? 'border-white bg-white text-[#101012]'
                      : 'border-white/10 text-white/80 hover:bg-white/[0.06]',
                  )}
                >
                  {other.onNeck
                    ? `fret ${Math.abs(other.fret - Math.round(other.fret)) < 0.1 ? Math.round(other.fret) : other.fret.toFixed(1)}`
                    : 'over the body'}
                </button>
              );
            })}
          </div>
        )}
        {onHear && (
          <div>
            <button
              type="button"
              onClick={onHear}
              className="inline-flex h-9 items-center rounded-full bg-white px-4 text-sm text-[#101012] outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white/60"
            >
              Hear it
            </button>
          </div>
        )}
      </div>
      <div
        className="h-[9.5rem] w-full shrink-0 sm:w-44"
        aria-label={`${name} on the staff`}
        role="img"
      >
        <GrandStaff
          score={score}
          clefAnnotation="8vb"
          fitHeight
          className="h-full"
        />
      </div>
    </section>
  );
}
