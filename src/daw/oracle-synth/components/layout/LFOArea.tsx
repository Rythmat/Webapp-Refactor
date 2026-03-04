import React, { useCallback, useState } from 'react';
import { useSynthStore } from '../../store';
import { LFONodeEditor } from '../visualizers/LFONodeEditor';
import { LFOWaveformBuilder } from '../../audio/LFOWaveformBuilder';
import { Knob } from '../controls/Knob';
import { LFONode, RateDiv, QuarterRates } from '../../audio/types';
import { RATE_DIV_OPTIONS, divToRepeats } from '../../audio/rateDivisions';
import styles from './LFOArea.module.css';

const ACCENT = '#7ecfcf';

/** Map numeric knob index → rate division */
function indexToRateDiv(index: number): RateDiv {
  const clamped = Math.round(Math.max(0, Math.min(RATE_DIV_OPTIONS.length - 1, index)));
  return RATE_DIV_OPTIONS[clamped].value;
}

/** Map rate division → knob index */
function rateDivToIndex(div: RateDiv): number {
  const idx = RATE_DIV_OPTIONS.findIndex((o) => o.value === div);
  return idx >= 0 ? idx : 7; // default to 1/4
}

interface BarSegment {
  startQ: number; // starting quarter index (0-3)
  span: number;   // number of quarter slots consumed
  rate: RateDiv;
}

/** How many quarter-note slots does a rate division span? */
function rateQuarterSpan(rate: RateDiv): number {
  const repeatsPerBar = divToRepeats(rate);
  const quartersPerCycle = 4 / repeatsPerBar;
  if (quartersPerCycle <= 1) return 1;
  return Math.min(4, Math.ceil(quartersPerCycle));
}

/** Compute layout segments for a bar based on quarter rates and their spans */
function computeQuarterLayout(rates: QuarterRates): BarSegment[] {
  const layout: BarSegment[] = [];
  let q = 0;
  while (q < 4) {
    const span = Math.min(4 - q, rateQuarterSpan(rates[q]));
    layout.push({ startQ: q, span, rate: rates[q] });
    q += span;
  }
  return layout;
}

/** Build a full bar's nodes using layout-aware segments */
function buildBarFromQuarterRates(rates: QuarterRates): LFONode[] {
  const layout = computeQuarterLayout(rates);
  const allNodes: LFONode[] = [];

  for (const seg of layout) {
    const segFraction = seg.span / 4;
    const start = seg.startQ / 4;
    const repeatsPerBar = divToRepeats(seg.rate);
    const repeatsInSeg = Math.max(1, Math.round(repeatsPerBar * segFraction));
    const segNodes = LFOWaveformBuilder.presetNodes('triangle', repeatsInSeg);

    for (let i = 0; i < segNodes.length; i++) {
      const t = start + segNodes[i].time * segFraction;
      if (allNodes.length > 0 && i === 0 && Math.abs(t - allNodes[allNodes.length - 1].time) < 0.001) continue;
      allNodes.push({ time: Math.min(1, t), value: segNodes[i].value });
    }
  }

  return allNodes;
}

/** Extract nodes for a layout segment, remapped to 0..1 */
function extractSegmentNodes(barNodes: LFONode[], seg: BarSegment): LFONode[] {
  const start = seg.startQ / 4;
  const segFraction = seg.span / 4;
  const end = start + segFraction;
  const result: LFONode[] = [];

  for (const node of barNodes) {
    if (node.time >= start - 0.001 && node.time <= end + 0.001) {
      const remapped: LFONode = {
        time: Math.max(0, Math.min(1, (node.time - start) / segFraction)),
        value: node.value,
      };
      if (node.curve !== undefined) remapped.curve = node.curve;
      result.push(remapped);
    }
  }

  if (result.length === 0 || result[0].time > 0.01) {
    result.unshift({ time: 0, value: 0 });
  }
  if (result[result.length - 1].time < 0.99) {
    result.push({ time: 1, value: 0 });
  }

  return result;
}

/** Merge edited segment nodes back into the full bar */
function mergeSegmentNodes(
  barNodes: LFONode[],
  seg: BarSegment,
  newSegNodes: LFONode[]
): LFONode[] {
  const start = seg.startQ / 4;
  const segFraction = seg.span / 4;
  const end = start + segFraction;

  const outside = barNodes.filter(
    (n) => n.time < start - 0.001 || n.time > end + 0.001
  );

  const remapped = newSegNodes.map((n) => {
    const node: LFONode = {
      time: Math.min(1, start + n.time * segFraction),
      value: n.value,
    };
    if (n.curve !== undefined) node.curve = n.curve;
    return node;
  });

  const merged = [...outside, ...remapped];
  merged.sort((a, b) => a.time - b.time);

  return merged;
}

export const LFOArea: React.FC = React.memo(() => {
  const [zoomedBar, setZoomedBar] = useState<number | null>(null);

  const activeLFOIndex = useSynthStore((s) => s.activeLFOIndex);
  const setActiveLFOIndex = useSynthStore((s) => s.setActiveLFOIndex);

  const lfo = useSynthStore((s) => s.lfos[s.activeLFOIndex]);
  const setLFOQuarterRateDiv = useSynthStore((s) => s.setLFOQuarterRateDiv);
  const setLFOBarSmooth = useSynthStore((s) => s.setLFOBarSmooth);
  const setLFONodes = useSynthStore((s) => s.setLFONodes);

  const handleBarLabelDoubleClick = useCallback((barIndex: number) => {
    setZoomedBar((prev) => (prev === barIndex ? null : barIndex));
  }, []);

  const handleBarNodesChange = useCallback(
    (barIndex: number, nodes: LFONode[]) => {
      setLFONodes(activeLFOIndex, barIndex, nodes);
    },
    [activeLFOIndex, setLFONodes]
  );

  const handleQuarterRateChange = useCallback(
    (barIndex: number, quarterIndex: number, rate: RateDiv) => {
      setLFOQuarterRateDiv(activeLFOIndex, barIndex, quarterIndex, rate);
      const currentRates = [...lfo.rateDivs[barIndex]] as QuarterRates;
      currentRates[quarterIndex] = rate;
      const nodes = buildBarFromQuarterRates(currentRates);
      setLFONodes(activeLFOIndex, barIndex, nodes);
    },
    [activeLFOIndex, lfo.rateDivs, setLFOQuarterRateDiv, setLFONodes]
  );

  const handleSmoothChange = useCallback(
    (barIndex: number, smooth: number) => {
      setLFOBarSmooth(activeLFOIndex, barIndex, smooth);
    },
    [activeLFOIndex, setLFOBarSmooth]
  );

  const handleSegmentNodesChange = useCallback(
    (barIndex: number, seg: BarSegment, segNodes: LFONode[]) => {
      const merged = mergeSegmentNodes(lfo.bars[barIndex], seg, segNodes);
      setLFONodes(activeLFOIndex, barIndex, merged);
    },
    [activeLFOIndex, lfo.bars, setLFONodes]
  );

  return (
    <div className={styles.area}>
      {/* Top row: LFO title + selector */}
      <span className={styles.title}>LFO</span>
      <div className={styles.lfoTabs}>
        {[0, 1, 2, 3].map((i) => (
          <button
            key={i}
            className={`${styles.lfoTab} ${activeLFOIndex === i ? styles.active : ''}`}
            onClick={() => setActiveLFOIndex(i)}
          >
            LFO {i + 1}
          </button>
        ))}
      </div>

      {/* Columns: bars (normal) or segments (zoomed) */}
      <div className={styles.barsRow}>
        {zoomedBar !== null
          ? (() => {
              const layout = computeQuarterLayout(lfo.rateDivs[zoomedBar]);
              return layout.map((seg) => (
                <div key={seg.startQ} className={styles.barColumn} style={{ flex: seg.span }}>
                  <span
                    className={styles.barLabel}
                    onDoubleClick={() => handleBarLabelDoubleClick(zoomedBar)}
                    style={{ cursor: 'pointer' }}
                  >
                    BAR {zoomedBar + 1} : {seg.span > 1 ? `Q${seg.startQ + 1}-${seg.startQ + seg.span}` : `Q${seg.startQ + 1}`}
                  </span>
                  <div className={styles.editorWrapper}>
                    <LFONodeEditor
                      nodes={extractSegmentNodes(lfo.bars[zoomedBar], seg)}
                      onChange={(nodes) => handleSegmentNodesChange(zoomedBar, seg, nodes)}
                      color={ACCENT}
                    />
                  </div>
                  <div className={styles.barControls}>
                    <Knob
                      label="RATE"
                      value={rateDivToIndex(seg.rate)}
                      min={0}
                      max={RATE_DIV_OPTIONS.length - 1}
                      step={1}
                      defaultValue={7}
                      accent={ACCENT}
                      size={28}
                      formatValue={(v) => RATE_DIV_OPTIONS[Math.round(v)]?.label ?? '1/4'}
                      onChange={(v) => handleQuarterRateChange(zoomedBar, seg.startQ, indexToRateDiv(v))}
                    />
                    <Knob
                      label="SMOOTH"
                      value={lfo.smooths[zoomedBar]}
                      min={0}
                      max={1}
                      defaultValue={0}
                      accent={ACCENT}
                      size={28}
                      formatValue={(v) => `${Math.round(v * 100)}%`}
                      onChange={(v) => handleSmoothChange(zoomedBar, v)}
                    />
                  </div>
                </div>
              ));
            })()
          : [0, 1, 2, 3].map((barIdx) => {
              const layout = computeQuarterLayout(lfo.rateDivs[barIdx]);
              return (
                <div key={barIdx} className={styles.barColumn}>
                  <span
                    className={styles.barLabel}
                    onDoubleClick={() => handleBarLabelDoubleClick(barIdx)}
                    style={{ cursor: 'pointer' }}
                  >
                    BAR {barIdx + 1}
                  </span>
                  <div className={styles.editorWrapper}>
                    <LFONodeEditor
                      nodes={lfo.bars[barIdx]}
                      onChange={(nodes) => handleBarNodesChange(barIdx, nodes)}
                      color={ACCENT}
                    />
                  </div>
                  <div className={styles.quarterRates}>
                    {layout.map((seg) => (
                      <Knob
                        key={seg.startQ}
                        label={seg.span > 1 ? `R${seg.startQ + 1}-${seg.startQ + seg.span}` : `R${seg.startQ + 1}`}
                        value={rateDivToIndex(seg.rate)}
                        min={0}
                        max={RATE_DIV_OPTIONS.length - 1}
                        step={1}
                        defaultValue={7}
                        accent={ACCENT}
                        size={22}
                        formatValue={(v) => RATE_DIV_OPTIONS[Math.round(v)]?.label ?? '1/4'}
                        onChange={(v) => handleQuarterRateChange(barIdx, seg.startQ, indexToRateDiv(v))}
                      />
                    ))}
                  </div>
                  <div className={styles.barControls}>
                    <Knob
                      label="SMOOTH"
                      value={lfo.smooths[barIdx]}
                      min={0}
                      max={1}
                      defaultValue={0}
                      accent={ACCENT}
                      size={28}
                      formatValue={(v) => `${Math.round(v * 100)}%`}
                      onChange={(v) => handleSmoothChange(barIdx, v)}
                    />
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
});
