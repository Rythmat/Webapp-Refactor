# S9: The prompt bar and its agent

**Owner gates:**

- the agent's budget;
- whether the prompt bar is Premium;
- the per-class on/off default.

**Goal:** a floating prompt bar like [s04–s07, s15–s19, s42–s45] that edits the project through our undoable commands and starts generation jobs. Its suggestions come from music theory.

**Read first:**

- `../generation.md` §3 (the agent loop and tools);
- `../anatomy.md` §6;
- `help/CommandPalette.tsx`, `commands/`;
- `harmony/*`, `prism-engine/`, `src/unison/engine/arrangeForStyle.ts`.

## Build

1. **UI** in `shell/prompt/`:
   - `PromptBar`: 648×99, radius 20, translucent, floating low over the timeline.
   - `TargetChip`: the selection, in its pale track colour.
   - `+` menu: Style, Lyrics, Controls, **Chords**.
   - Model/mode picker: "Theory (instant)" and "AI (generate)".
   - Send/Stop.
   - `StatusCard`: the plan plus plain progress text, not playful verbs.
   - `ReplyCard`: the summary plus action buttons such as "Keep take 1" and "Hear take 2".
   - Escape collapses it to a sparkle button.
2. **Suggestions model:** placeholders fitted to the selection and the theory context, e.g.:
   - an empty instrument track in C major → "Write a bass line that follows the chords";
   - a clip → "Make it swing";
   - a section → "Add a pre-chorus".
3. **Agent gateway** `/api/studio/agent/step`:
   - Anthropic TypeScript SDK, `model: "claude-opus-5-5"`, `thinking: {type:"adaptive"}`, `output_config.effort` set explicitly.
   - Tools with `strict: true` + `eager_input_streaming: true`, and `tool_choice: auto`.
   - Cache the frozen system prompt and tool list; send the project snapshot after the breakpoint.
   - Refusal fallback on.
   - Append-only history.
   - SSE status to the browser.
4. **Client tool runner:**
   - Validates each `tool_use`.
   - Runs all of a turn's tools in **one edit transaction**, so one Undo reverts the step.
   - Posts all the tool results in one message.
   - The tools are the table in generation.md §3. `arrange_for_style` brings UNISON accompaniment into Studio for the first time.
5. **Offline outbox:** queue prompts while offline. The bar is disabled when generation is off for the class, and it says why.
6. **⌘K:** the palette stays for commands. The prompt bar can open a command from the palette.

## Verify

- vitest: the suggestions model, the tool schemas, and the tool runner against a fixture store (each tool is undoable, and one step is one Undo).
- Agent evals: 20 typical student prompts against a fixture project. Check that the right tools are called and the right keys and chords are used.
- Chrome with the mock: "write a bass line in E minor" → MIDI takes; "add a drum loop" → audio takes; commit; Undo.
