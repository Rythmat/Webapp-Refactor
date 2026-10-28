import { useMemo } from 'react';
import {
  describeNodeFret,
  HARMONIC_PARTIALS,
  harmonicNodes,
  partialInfo,
  type HarmonicNode,
} from '@/lib/guitar/harmonics';
import type { GuitarStringNumber } from '@/lib/guitar/types';
import { HarmonicNeck, nodeId, type NodeMark } from './HarmonicNeck';
import {
  openMidiOf,
  PartialChips,
  StringPicker,
  stringLetter,
} from './HarmonicsControls';
import { PartialDetail } from './PartialDetail';
import { noteName } from './spelling';

// ── Node map ───────────────────────────────────────────────────────────────
// Every natural harmonic on the string, to scale: press a node to hear it
// and see what it is.

export interface NodeMapTabProps {
  string: GuitarStringNumber;
  onStringChange: (string: GuitarStringNumber) => void;
  partials: ReadonlySet<number>;
  onPartialsChange: (next: Set<number>) => void;
  selected: HarmonicNode;
  onSelect: (node: HarmonicNode) => void;
  ringing: number | null;
  onHear: (node: HarmonicNode) => void;
  keyColor: string;
  mirrored: boolean;
  showBody: boolean;
  labels: 'fret' | 'ratio';
}

export function NodeMapTab({
  string,
  onStringChange,
  partials,
  onPartialsChange,
  selected,
  onSelect,
  ringing,
  onHear,
  keyColor,
  mirrored,
  showBody,
  labels,
}: NodeMapTabProps) {
  const openMidi = openMidiOf(string);
  const shown = useMemo(
    () => HARMONIC_PARTIALS.filter((n) => partials.has(n)),
    [partials],
  );

  const marks = useMemo(() => {
    const map = new Map<string, NodeMark>();
    for (const node of harmonicNodes(selected.partial)) {
      map.set(nodeId(node), 'related');
    }
    map.set(nodeId(selected), 'selected');
    return map;
  }, [selected]);

  const press = (node: HarmonicNode) => {
    onSelect(node);
    onHear(node);
  };

  const describe = (node: HarmonicNode) => {
    const info = partialInfo(openMidi, node.partial);
    return `Partial ${node.partial}: ${describeNodeFret(node.fret)}, sounds ${noteName(info.nearestMidi, openMidi)}`;
  };

  return (
    <div data-harmonics-tab="nodes" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StringPicker value={string} onChange={onStringChange} />
        <PartialChips
          partials={HARMONIC_PARTIALS}
          value={partials}
          onChange={onPartialsChange}
        />
      </div>
      <div
        data-neck-scroller
        className="-mx-1 overflow-x-auto px-1 pb-1"
        style={{ scrollbarWidth: 'thin' }}
      >
        <HarmonicNeck
          string={string}
          partials={shown}
          marks={marks}
          ringing={ringing}
          keyColor={keyColor}
          mirrored={mirrored}
          showBody={showBody}
          labels={labels}
          onNodePress={press}
          describeNode={describe}
        />
      </div>
      <PartialDetail
        openMidi={openMidi}
        stringName={stringLetter(string)}
        node={selected}
        keyColor={keyColor}
        onPickNode={press}
        onHear={() => onHear(selected)}
      />
    </div>
  );
}
