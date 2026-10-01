---
name: genre-sync
description: Consolidate the Genre activity-flow planning work into docs/genre-activities/PLANNING-LEDGER.md (decisions, open questions, to-dos, per-genre status) and print a resume summary. Use when the user runs /genre-sync, or when a hook says they have returned from a break of more than an hour during genre planning.
argument-hint: "[optional: genre to focus on next, or 'summary' to only read]"
---

# /genre-sync — checkpoint and resume summary for Genre activity planning

The ledger is `docs/genre-activities/PLANNING-LEDGER.md`. It is the single source
of truth for this effort; the chat is not. Read it in full before doing anything.

Arguments: `$ARGUMENTS`

## Step 1 — Consolidate (skip if the argument is `summary`)

Scan the conversation since the last `/genre-sync` (or since the start, if none)
and merge what was settled into the ledger:

- **Decisions** — anything the user agreed to or stated as the rule. Give each the
  next `D-###` id, today's date, a scope (`all` or the genre name), the decision in
  one sentence, and the reason in a few words. Only record what the user actually
  decided; a suggestion of yours they didn't confirm is an open question, not a decision.
- **Superseded decisions** — if something reverses an earlier decision, strike the
  old row and point it at the new id. Never silently edit an old decision.
- **Open questions** — new unresolved questions get a `Q-###` id. Questions that
  were answered are removed and become decisions.
- **To-dos** — new work items get a `T-###` id; update statuses. Rows marked `done`
  since the last sync move into the session log entry.
- **Genre status table** — update status and "current focus / next step" for any
  genre touched.
- **Cross-genre principles** — when a decision made for one genre clearly applies
  to all of them (or the user says so), promote it here and note the source `D-###`.
- **Current focus** and **Last synced** header lines (use real date and time).
- **Session log** — add one short entry, newest first: what was covered, not a
  transcript.

Keep the ledger terse: one line per row, no prose paragraphs. Keep the user's own
wording for musical terms (see the memory notes on chord symbols, "scale degrees"
vs "intervals", funk9, etc.) — don't normalise their vocabulary.

If something in the conversation is ambiguous (was that a decision or musing?),
record it as an open question rather than guessing.

## Step 2 — Print the resume summary

Reply in chat with this shape, and nothing longer than it needs to be:

1. **Where we are** — one or two sentences: current focus, which genre is next.
2. **Since the last sync** — the new decisions (ids + one line each), and anything
   reversed.
3. **Open questions** — all of them, blocking ones first, flag which genre they block.
4. **Next up** — the to-dos in `doing` or `todo` for the current focus, then a
   one-line count of what remains elsewhere.
5. **Across the whole** — a one-line glance at the genre status table (e.g.
   "2 of 14 planned, 1 building") and any cross-genre principle added this session.

If `$ARGUMENTS` names a genre, set it as the current focus and end with the
open questions and to-dos for that genre, so work can pick up immediately.

## Step 3 — Commit nothing

Don't commit the ledger unless the user asks. Mention in one line that it changed.
