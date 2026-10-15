# Studio editor audit and overhaul plan (October 2026)

A read-only audit of the Studio editor (`/studio/editor`, `src/daw`: 436 files, about 104k lines),
competitor research, and the phased overhaul plan built from them. Run on 2026-10-06.

**The plan is [`plan.md`](plan.md).** It holds the decisions, the three stages and their milestones,
the integration rules and the verification gates. Approving it started Stage A.

## Files

| File                           | What it holds                                                                                                                    |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `plan.md`                      | The approved program plan (copied from the planning session)                                                                     |
| `register.md`                  | All 622 verified findings, one line each, by severity and area                                                                   |
| `findings.json`                | The same findings with full evidence, impact, recommendation and verifier notes                                                  |
| `phase-map.json`               | The ledger: finding id → owning milestone and status                                                                             |
| `synthesis.md`                 | The root-cause themes, quick wins, design principles, layout sketch and risks                                                    |
| `areas.md`                     | Per-area summaries, strengths to keep, proposals and open questions                                                              |
| `components.md`                | Every component with a keep / refine / redesign / split / merge / remove verdict                                                 |
| `research.md`, `research.json` | BandLab, Soundtrap, Soundation, Audiotool, openDAW, Suno, Ableton and Logic: layout, tech, persistence, what to borrow and avoid |
| `design.json`                  | The per-milestone designs for all three stages (steps, files, code to reuse, verification) and the critic's review               |

## How the findings were verified

- **Audit.** 21 auditors covered the code areas and 3 more looked across the whole editor (design
  system, load path, layout and flows). Each cited the file and line for every finding.
- **Code check.** An adversarial verifier per area re-read the cited code and tried to refute each
  finding. 559 were confirmed, 63 were adjusted (severity or details) and none were refuted.
- **Impact check.** Critical and high findings got a second, impact-focused check: would a student
  on a school Chromebook notice it?
- **Hand checks.** Four critical findings were re-checked by hand during planning.

`originalSeverity` in `findings.json` is the auditor's rating, and `severity` is the verified one.

## The ledger (`phase-map.json`)

- **Fields.** `designMilestone` is the milestone that owned the finding in the design step.
  `plan.md`'s integration rules override it where they move work. For example:
  - generator safety moves into 1.1;
  - dead-code deletions move into 1.2;
  - the tutorial anchor registry moves into 1.7.
- **Closing a finding.** When a PR fixes it, set `status` to `"closed"` and add `"pr": <number>`.
- **Unowned findings.** Four medium/low findings have no owner yet. Triage them in milestone 3.0:
  - `instruments-14`: drum pad polyphony. Polish sweep.
  - `practice-tutorial-12`: phone-sized keyboard labels. Out of scope: the targets are Chromebooks
    and laptops.
  - `synth-store-12`: account-level synth preset library. Deferred; needs a music-atlas-api
    endpoint.
  - `audio-analysis-19`: NAM 48 kHz resampling and loudness metadata. Deferred.

## Related

- Accessibility audit of the same surfaces:
  [`../ux-research/Music-Atlas-Accessibility-Audit-2026-09-20.md`](../ux-research/Music-Atlas-Accessibility-Audit-2026-09-20.md).
  Findings that overlap it cite `A11Y#n`.
- Earlier bundle baseline: [`../optimization/baseline-2026-06-10/`](../optimization/baseline-2026-06-10/).
