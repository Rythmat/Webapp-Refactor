#!/bin/bash
# UserPromptSubmit hook for Genre activity planning.
# Sessions opt in by running /genre-sync once. In an opted-in session, a prompt
# arriving more than an hour after the previous one tells Claude to run the
# /genre-sync consolidation and resume summary first.

STATE_DIR="$CLAUDE_PROJECT_DIR/.claude/genre-planning"
THRESHOLD=3600

input=$(cat)
session=$(printf '%s' "$input" | jq -r '.session_id // empty')
prompt=$(printf '%s' "$input" | jq -r '.prompt // empty')
[ -z "$session" ] && exit 0

mkdir -p "$STATE_DIR"
sessions_file="$STATE_DIR/sessions"
stamp_file="$STATE_DIR/last-prompt-$session"
now=$(date +%s)

# Running /genre-sync registers this session.
if printf '%s' "$prompt" | grep -q '^/genre-sync'; then
  grep -qx "$session" "$sessions_file" 2>/dev/null || echo "$session" >> "$sessions_file"
  echo "$now" > "$stamp_file"
  exit 0
fi

grep -qx "$session" "$sessions_file" 2>/dev/null || exit 0

last=$(cat "$stamp_file" 2>/dev/null || echo "$now")
echo "$now" > "$stamp_file"
gap=$((now - last))
[ "$gap" -le "$THRESHOLD" ] && exit 0

hours=$((gap / 3600))
mins=$(((gap % 3600) / 60))
msg="The user is back after a break of ${hours}h ${mins}m in the Genre activity-flow planning session. Before answering their message, run the genre-sync skill (consolidate into docs/genre-activities/PLANNING-LEDGER.md, then print the resume summary), then address what they asked."

jq -n --arg ctx "$msg" --arg sys "Back after ${hours}h ${mins}m — running the genre planning summary." \
  '{systemMessage: $sys, hookSpecificOutput: {hookEventName: "UserPromptSubmit", additionalContext: $ctx}}'
