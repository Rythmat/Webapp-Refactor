// Per-preset fidelity report: what mapped cleanly, what was approximated,
// what was dropped — plus a weighted score used to rank curation candidates.

export interface FidelityReport {
  preset: string;
  category: string;
  mapped: string[];
  approximated: string[];
  dropped: string[];
  score: number; // 0 (unusable) .. 100 (near-faithful)
}

export interface FidelityCollector {
  mapped: (note: string) => void;
  approx: (note: string, penalty?: number) => void;
  drop: (note: string, penalty?: number) => void;
  finish: (preset: string, category: string) => FidelityReport;
}

export function createCollector(): FidelityCollector {
  const mapped: string[] = [];
  const approximated: string[] = [];
  const dropped: string[] = [];
  let penalty = 0;

  return {
    mapped: (note) => {
      mapped.push(note);
    },
    approx: (note, p = 1) => {
      approximated.push(note);
      penalty += p;
    },
    drop: (note, p = 2) => {
      dropped.push(note);
      penalty += p;
    },
    finish: (preset, category) => ({
      preset,
      category,
      mapped,
      approximated,
      dropped,
      // Exponential decay so the score stays informative across the whole
      // range (a linear −k·penalty saturates at 0 for feature-rich presets
      // and can't distinguish "mostly faithful" from "gutted"). Divisor
      // tuned against real conversions: a near-clean preset (penalty ~3,
      // e.g. only EQ + a close filter approximation lost) ≈ 82; the library
      // median (~penalty 9) ≈ 55; a gutted preset (penalty ~20) ≈ 26.
      score: Math.round(100 * Math.exp(-penalty / 15)),
    }),
  };
}

export function formatReport(r: FidelityReport): string {
  const lines = [
    `## ${r.preset} (${r.category || 'uncategorized'}) — fidelity ${r.score}/100`,
  ];
  if (r.dropped.length) {
    lines.push('', '**Dropped:**', ...r.dropped.map((d) => `- ${d}`));
  }
  if (r.approximated.length) {
    lines.push('', '**Approximated:**', ...r.approximated.map((a) => `- ${a}`));
  }
  lines.push('', `Mapped: ${r.mapped.length} features`);
  return lines.join('\n');
}
