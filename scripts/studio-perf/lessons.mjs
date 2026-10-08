/* eslint-env node */
/**
 * The lesson walkthrough of the Studio editor (milestone 1.0 baseline):
 * every lesson in src/daw/components/Tutorial/tutorials.ts, step by step, in
 * the window a school Chromebook gives the editor, as the premium user and as
 * a free student, recorded as the editor behaves today. Known problems are
 * measured and written down, not fixed.
 *
 *   node scripts/studio-perf/lessons.mjs --reuse=http://localhost:5263
 *     [--profile=chromebook|laptop|small|all]   default: chromebook
 *     [--persona=premium|free|all]              default: all (both)
 *     [--lesson=make-first-track,...]           default: every lesson
 *     [--idle-seconds=3]   record the editor idling on step 1 (0 turns it off)
 *     [--step-timeout=15]  seconds a step may take to advance after its driver
 *     [--shots=false]      no screenshots of failing steps
 *     [--strict]           also fail on the known failures (any failing step)
 *     [--baseline=path]    also fail on any regression against that earlier
 *                          report.json (see compareWithBaseline)
 *     [--out=dir] [--port=5263] [--gpu=metal|swiftshader] [--headed]
 *
 * (`npm run studio:lessons -- --reuse=…` runs the same.) Without --reuse the
 * harness starts a bypass dev server of its own (see harness.mjs).
 *
 * Exit status 1 when a lesson stops with an error (each step it did not get
 * to counts as failed), when a step or a gate check fails that
 * KNOWN_FAILURES in lessonDrivers.mjs does not list, when the editor's DEV
 * note-id check warns ('[noteIds] …', kept with the console errors), and,
 * with --baseline, on any regression.
 * A listed step that passes now is reported as fixed, so the list shrinks as
 * fixes land.
 *
 * The lessons come from the running app: the script imports tutorials.ts
 * through the dev server, so it always walks the lessons the editor has. Each
 * lesson runs in a fresh browser context from /studio/editor?tutorial=<id>.
 * Both personas are the dev bypass's user, with the bypass module
 * (src/auth/devBypass.ts) served to that page only with its plan flag
 * (VITE_DEV_AUTH_BYPASS_PLAN) read as the persona's: the premium user, or a
 * free student, whose account has no subscription, so Prism's premium lock
 * covers the Prism panel as it does for a real free student.
 *
 * For the free student, a Premium lesson (`requiresPremium` in
 * tutorialCatalog.ts: the lessons with steps in Prism) is expected not to run
 * (owner decision 8), so its gate is checked instead of its steps, each in a
 * fresh context (see runGatedLesson):
 *
 * - tile: on the Production tab (/studio/production) its tile wears the
 *   Premium chip, and a click opens the upgrade prompt (the white-pill See
 *   plans, and Not now, which closes it) without leaving the page;
 * - link: a /studio/editor?tutorial=<id> link, opened over work the editor
 *   has saved, starts no lesson, keeps that work open, and shows the same
 *   prompt; after Not now the editor takes clicks again.
 *
 * A gate that holds is the lesson's pass. The free student walks the other
 * lessons like the premium user, and the premium user walks them all.
 *
 * For every step the walkthrough:
 *
 * 1. waits for the coach card to show the step;
 * 2. checks the step's anchor: the first id of the step's `target` list that
 *    is in the DOM must be on screen. Its box must lie inside the window, no
 *    scrolling or overflow-hidden ancestor may clip it, and nothing may cover
 *    it: of a 3×3 grid of points over it, the centre and all but two of the
 *    others must hit the anchor itself (so the coach card, a dialog or the
 *    premium lock on top counts as covering it; a smaller overlap warns);
 * 3. performs the step with its driver (lessonDrivers.mjs): a real click
 *    when the step is about clicking its anchor, a store action when it is
 *    about a drag or a long menu, Next on a free-form step;
 * 4. checks that the store's tutorialStepIndex advanced, or that the lesson
 *    finished after its last step.
 *
 * A step that cannot be done is recorded with its reasons, a screenshot and
 * whether its check holds in the page at that moment. The walkthrough then
 * makes the change another way (the driver's fallback: the store, or the
 * keyboard) or moves the lesson on (goToTutorialStep), so one broken step
 * never stops the rest. A step whose check already holds when it begins
 * completes quietly and advances by itself within about 300 ms (the page's
 * trace says so); its anchor is measured in the page while it is up, and it
 * passes with a warning, since its copy cannot be read in that time.
 *
 * Each lesson also records the editor idling on its first step for
 * --idle-seconds (rAF calls, React commits, store writes, frame times; see
 * probes.mjs), against the same empty editor without a lesson (?new=1), both
 * once the editor is quiet, so the difference is what the lesson overlay
 * costs while a student reads. (Only the first persona run records it: the
 * overlay is the same for both.)
 *
 * Writes report.json (every measurement) and summary.md (per lesson and per
 * step) to docs/studio-perf/runs/lessons/, and screenshots of failing steps
 * (and gate checks) to shots/<profile>/<persona>/<lesson>/ beside them.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as prettier from 'prettier';
import {
  PROFILES,
  ROOT,
  newPage,
  openEditor,
  profilesFrom,
  startAudio,
  withStudio,
  writeJson,
} from './harness.mjs';
import {
  KNOWN_FAILURES,
  driverFor,
  knownFailureFor,
} from './lessonDrivers.mjs';
import { startRecording, stopRecording } from './probes.mjs';

/** tutorials.ts as the dev server serves it to the page. */
const TUTORIALS_MODULE = '/src/daw/components/Tutorial/tutorials.ts';

/** The dev auth bypass module, at the URL the app imports it from. */
const BYPASS_MODULE = '/src/auth/devBypass.ts';

/** How the bypass module reads its plan (VITE_DEV_AUTH_BYPASS_PLAN). */
const BYPASS_PLAN_FLAG = /import\.meta\.env\.VITE_DEV_AUTH_BYPASS_PLAN\b/g;

/** The personas, in the order a run takes them. */
export const PERSONAS = ['premium', 'free'];

/** The Studio dashboard's Production tab, where the lesson tiles are. */
const PRODUCTION_PATH = '/studio/production';

/** The upgrade prompt's title (src/daw/components/Tutorial/UpgradeLessonDialog.tsx). */
const UPGRADE_TITLE = 'This lesson uses Prism, part of Premium';

/** The editor's crash copy in localStorage (localSession.ts). */
const AUTOSAVE_KEY = 'musicAtlas:daw:autosave';

/** The work a gate's link is opened over: a named project with a track. */
const GATE_WORK = { project: 'Lesson gate check', track: 'Gate check synth' };

/** Playwright's own wait for a click, a pick or a menu to open. */
const ACTION_TIMEOUT = 10_000;

/**
 * The same wait on a step whose anchor was measured as covered (by the coach
 * card, a dialog, the premium lock): the step fails on its anchor already,
 * and a click under the cover can only fail the same way, only later.
 */
const COVERED_ACTION_TIMEOUT = 3_000;

/**
 * Warning kinds that do not depend on timing, so the ratchet compares them.
 * The others (covered-while-up, measured-late, unsettled) come and go with
 * how fast a frame lands next to a 300 ms step, and are only reported.
 */
const STABLE_WARNINGS = new Set([
  'advanced-on-arrival',
  'completed-early',
  'spotlight-elsewhere',
  'ring-off-anchor',
  'partly-covered',
  'extra-not-visible',
]);

// ── In the page ─────────────────────────────────────────────────────────

/**
 * Runs in the page (installed as window.__MA_MEASURE_ANCHOR__), so it must be
 * self-contained. Resolves a step's anchor as the walkthrough's contract
 * reads it, the first of `ids` present in the DOM, and says whether a
 * student can see it. Also returns the id the spotlight itself uses (the
 * first with a non-zero box, targetRect.ts), where the coach card is and
 * which step it shows, and whether the spotlight ring sits on the anchor.
 */
function measureAnchor(ids) {
  const round = (n) => Math.round(n * 10) / 10;
  const toBox = (r) => ({
    x: round(r.left),
    y: round(r.top),
    w: round(r.width),
    h: round(r.height),
  });
  const describe = (node) => {
    if (!node || node.nodeType !== 1) return String(node);
    const id = node.getAttribute('data-tutorial-id');
    const label = node.getAttribute('aria-label') || node.getAttribute('title');
    const classes =
      typeof node.className === 'string'
        ? node.className.trim().split(/\s+/).slice(0, 3).join('.')
        : '';
    const text = (node.textContent || '').trim().replace(/\s+/g, ' ');
    return [
      node.tagName.toLowerCase(),
      id ? `[data-tutorial-id=${id}]` : '',
      label ? `[${label}]` : '',
      classes ? `.${classes}` : '',
      text ? ` "${text.slice(0, 40)}"` : '',
    ].join('');
  };
  const find = (id) => document.querySelectorAll(`[data-tutorial-id="${id}"]`);
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const state = window.__MA_STORE__?.getState();
  const quit = document.querySelector('button[aria-label="Quit tutorial"]');
  const card = quit ? quit.closest('div[style*="position: fixed"]') : null;
  const counter = card ? /(\d+)\s*\/\s*(\d+)/.exec(card.innerText) : null;
  const present = ids
    .map((id) => ({ id, count: find(id).length }))
    .filter((p) => p.count > 0);
  const out = {
    targets: ids,
    present,
    anchorId: present[0]?.id ?? null,
    spotlightId:
      ids.find((id) => {
        const el = find(id)[0];
        const r = el?.getBoundingClientRect();
        return !!r && (r.width > 0 || r.height > 0);
      }) ?? null,
    store: state
      ? { lesson: state.activeTutorialId, step: state.tutorialStepIndex }
      : null,
    card: card
      ? {
          step: counter ? Number(counter[1]) : null,
          box: toBox(card.getBoundingClientRect()),
        }
      : null,
    viewport: { w: vw, h: vh },
    box: null,
    visibleFraction: null,
    clippedBy: [],
    covered: [],
    coveredFraction: null,
    centreCovered: false,
    // An overlap too small to fail the step (see below), in words.
    partlyCovered: null,
    ring: null,
    visible: false,
    // Why not, in words, and what kind: missing, empty, hidden, outside,
    // clipped or covered.
    reasons: [],
    kinds: [],
  };
  const fail = (kind, reason) => {
    out.kinds.push(kind);
    out.reasons.push(reason);
  };
  if (ids.length === 0) {
    // A centred card with no spotlight: nothing to find.
    out.visible = true;
    return out;
  }
  if (!out.anchorId) {
    fail('missing', `none of ${ids.join(', ')} is in the DOM`);
    return out;
  }
  const el = find(out.anchorId)[0];
  const r = el.getBoundingClientRect();
  out.box = toBox(r);
  const ringEl = document.querySelector(
    'div[aria-hidden="true"][style*="tutorialPulse"]',
  );
  if (ringEl) {
    // Spotlight.tsx draws its ring 6 px outside the target's box.
    const g = ringEl.getBoundingClientRect();
    out.ring = {
      box: toBox(g),
      onAnchor:
        Math.abs(g.left + 6 - r.left) <= 2 &&
        Math.abs(g.top + 6 - r.top) <= 2 &&
        Math.abs(g.width - 12 - r.width) <= 2 &&
        Math.abs(g.height - 12 - r.height) <= 2,
    };
  }
  if (r.width < 1 || r.height < 1) {
    fail('empty', 'its box is empty (nothing drawn on screen)');
    return out;
  }
  const style = getComputedStyle(el);
  if (style.visibility !== 'visible') {
    fail('hidden', `it is visibility: ${style.visibility}`);
  }
  let opacity = 1;
  for (let a = el; a; a = a.parentElement) {
    opacity *= Number(getComputedStyle(a).opacity);
  }
  if (opacity < 0.1) fail('hidden', `it is transparent (${opacity})`);

  // Clip by every ancestor in the anchor's containing-block chain whose
  // overflow is not visible (an absolute box escapes ancestors up to the
  // nearest positioned one, a fixed box escapes all but a transformed one),
  // then by the window. Each one that hides part of the anchor is named.
  const shown = (c) => ({
    l: Math.max(c.l, r.left),
    t: Math.max(c.t, r.top),
    r: Math.min(c.r, r.right),
    b: Math.min(c.b, r.bottom),
  });
  const widthIn = (c) =>
    Math.max(0, Math.min(c.r, r.right) - Math.max(c.l, r.left));
  const heightIn = (c) =>
    Math.max(0, Math.min(c.b, r.bottom) - Math.max(c.t, r.top));
  const visibleArea = (c) => widthIn(c) * heightIn(c);
  let clip = { l: -Infinity, t: -Infinity, r: Infinity, b: Infinity };
  let mode = style.position;
  for (
    let a = el.parentElement;
    a && a !== document.body && a !== document.documentElement;
    a = a.parentElement
  ) {
    const s = getComputedStyle(a);
    const holdsFixed =
      s.transform !== 'none' ||
      s.perspective !== 'none' ||
      s.filter !== 'none' ||
      (s.backdropFilter && s.backdropFilter !== 'none') ||
      /paint|layout|strict|content/.test(s.contain) ||
      /transform|filter/.test(s.willChange);
    const holdsAbsolute = holdsFixed || s.position !== 'static';
    const inChain =
      mode === 'fixed'
        ? holdsFixed
        : mode === 'absolute'
          ? holdsAbsolute
          : true;
    if (!inChain) continue;
    mode =
      s.position === 'fixed' || s.position === 'absolute'
        ? s.position
        : 'static';
    const clipsX = s.overflowX !== 'visible';
    const clipsY = s.overflowY !== 'visible';
    if (!clipsX && !clipsY) continue;
    const box = a.getBoundingClientRect();
    const left = box.left + a.clientLeft;
    const top = box.top + a.clientTop;
    const next = {
      l: clipsX ? Math.max(clip.l, left) : clip.l,
      t: clipsY ? Math.max(clip.t, top) : clip.t,
      r: clipsX ? Math.min(clip.r, left + a.clientWidth) : clip.r,
      b: clipsY ? Math.min(clip.b, top + a.clientHeight) : clip.b,
    };
    const lost = visibleArea(clip) - visibleArea(next);
    const cutX = widthIn(next) < widthIn(clip) - 0.5;
    const cutY = heightIn(next) < heightIn(clip) - 0.5;
    clip = next;
    if (lost > 1) {
      // A student can scroll the anchor into view only on an axis that
      // cuts it, whose overflow is auto or scroll (not hidden or clip), and
      // whose content is larger than the box.
      const scrollsX =
        /auto|scroll/.test(s.overflowX) && a.scrollWidth > a.clientWidth + 1;
      const scrollsY =
        /auto|scroll/.test(s.overflowY) && a.scrollHeight > a.clientHeight + 1;
      out.clippedBy.push({
        by: describe(a),
        overflow: `${s.overflowX} ${s.overflowY}`,
        scrolls: (cutX && scrollsX) || (cutY && scrollsY),
      });
    }
  }
  const inWindow = {
    l: Math.max(clip.l, 0),
    t: Math.max(clip.t, 0),
    r: Math.min(clip.r, vw),
    b: Math.min(clip.b, vh),
  };
  if (visibleArea(clip) - visibleArea(inWindow) > 1) {
    const s = shown(clip);
    const sides = [
      s.l < 0 && `${Math.round(-s.l)} px off the left`,
      s.t < 0 && `${Math.round(-s.t)} px above the top`,
      s.r > vw && `${Math.round(s.r - vw)} px off the right`,
      s.b > vh && `${Math.round(s.b - vh)} px below the bottom`,
    ].filter(Boolean);
    out.clippedBy.push({
      by: `the window (${sides.join(', ')})`,
      window: true,
    });
  }
  clip = inWindow;
  const v = shown(clip);
  const shownW = Math.max(0, v.r - v.l);
  const shownH = Math.max(0, v.b - v.t);
  out.visibleFraction =
    Math.round(((shownW * shownH) / (r.width * r.height)) * 1000) / 1000;
  // A cut counts once it hides more than 4 px and 5% of a side: a control
  // trimmed by a pixel at a panel's edge still works.
  const hiddenW = r.width - shownW;
  const hiddenH = r.height - shownH;
  if (
    (hiddenW > 4 && hiddenW > 0.05 * r.width) ||
    (hiddenH > 4 && hiddenH > 0.05 * r.height)
  ) {
    const cutters = out.clippedBy.map((c) =>
      c.window
        ? c.by
        : `${c.by} (${c.scrolls ? 'scrolls' : 'does not scroll'})`,
    );
    if (out.clippedBy.some((c) => !c.window)) out.kinds.push('clipped');
    fail(
      out.clippedBy.some((c) => c.window) ? 'outside' : 'clipped',
      `only ${Math.round(out.visibleFraction * 100)}% of it shows: cut by ${cutters.join('; ')}`,
    );
  }

  // Covered: what is on top at a 3×3 grid of points over the visible part.
  // A student clicks near the middle, so a covered centre fails on its own;
  // otherwise it takes three covered points (a third of the anchor) to fail,
  // as a cut takes 5% of a side. A smaller overlap is a warning.
  if (shownW >= 1 && shownH >= 1) {
    const grid = [1 / 6, 1 / 2, 5 / 6];
    const cover = new Map();
    let missed = 0;
    grid.forEach((fy, iy) =>
      grid.forEach((fx, ix) => {
        const hit = document.elementFromPoint(
          v.l + fx * (v.r - v.l),
          v.t + fy * (v.b - v.t),
        );
        if (hit && (hit === el || el.contains(hit))) return;
        missed += 1;
        if (ix === 1 && iy === 1) out.centreCovered = true;
        const who = !hit
          ? 'nothing'
          : card && card.contains(hit)
            ? 'the coach card'
            : hit.contains(el)
              ? `${describe(hit)} (the anchor takes no pointer events)`
              : describe(hit);
        cover.set(who, (cover.get(who) ?? 0) + 1);
      }),
    );
    out.covered = [...cover].map(([by, points]) => ({ by, points }));
    out.coveredFraction = Math.round((missed / grid.length ** 2) * 1000) / 1000;
    if (missed) {
      const text = `it is covered at ${missed}/${grid.length ** 2} points${out.centreCovered ? ' (its centre among them)' : ''} by ${out.covered
        .map((c) => c.by)
        .join('; ')}`;
      if (missed >= 3 || out.centreCovered) fail('covered', text);
      else out.partlyCovered = text;
    }
  }
  out.kinds = [...new Set(out.kinds)];
  out.visible = out.reasons.length === 0;
  return out;
}

/**
 * Runs in the page before any app code (page.addInitScript), so it must be
 * self-contained. Logs every change of the running lesson's step and status
 * with its time, from the first step the editor shows, and measures each
 * step's anchor once, two frames and 100 ms after the step begins: the
 * moment a student first sees it. That early measurement is the only one a
 * step that advances by itself gets.
 */
function installLessonTrace(targetsByStep) {
  if (window !== window.top || window.__MA_LESSON_TRACE__) return;
  const trace = { events: [], early: {}, attachedAt: null };
  window.__MA_LESSON_TRACE__ = trace;
  let attached = false;
  const attach = (store) => {
    if (attached || typeof store?.subscribe !== 'function') return;
    attached = true;
    trace.attachedAt = Math.round(performance.now());
    let lastKey = '';
    let lastIndex = null;
    const onState = (s) => {
      const key = `${s.activeTutorialId}|${s.tutorialStepIndex}|${s.tutorialStepStatus}`;
      if (key === lastKey) return;
      lastKey = key;
      const t = Math.round(performance.now());
      trace.events.push({
        t,
        lesson: s.activeTutorialId,
        index: s.tutorialStepIndex,
        status: s.tutorialStepStatus,
        celebrate: s.tutorialStepCelebrate,
      });
      const index = s.tutorialStepIndex;
      if (!s.activeTutorialId || index === lastIndex) return;
      lastIndex = index;
      requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          setTimeout(() => {
            if (index in trace.early || !window.__MA_MEASURE_ANCHOR__) return;
            const now = store.getState();
            const at = Math.round(performance.now());
            trace.early[index] = {
              ...window.__MA_MEASURE_ANCHOR__(targetsByStep[index] ?? []),
              atMs: at,
              afterMs: at - t,
              stillUp:
                now.activeTutorialId !== null &&
                now.tutorialStepIndex === index,
            };
          }, 100),
        ),
      );
    };
    onState(store.getState());
    store.subscribe(onState);
  };
  // DawApp exposes its store in an effect (dev bypass only). Catching that
  // assignment starts the trace on the first step the editor shows, not
  // whenever the script gets round to it.
  let current = window.__MA_STORE__;
  Object.defineProperty(window, '__MA_STORE__', {
    configurable: true,
    enumerable: true,
    get: () => current,
    set: (value) => {
      current = value;
      attach(value);
    },
  });
  attach(current);
}

// ── Node side ───────────────────────────────────────────────────────────

/**
 * An error in one line: its first line, plus the most telling line of
 * Playwright's call log (what intercepts the pointer, what is not visible),
 * or failing that, the last thing it waited for.
 */
const short = (error) => {
  const lines = String(error?.message ?? error)
    .split('\n')
    .map((l) => l.trim().replace(/^-\s*/, ''));
  const telling = lines.filter((l) =>
    /intercepts pointer events|not visible|outside of the viewport|not enabled|not stable|detached/i.test(
      l,
    ),
  );
  const waited = lines.filter((l) => /^(\d+ × )?waiting for/i.test(l));
  const why = telling.at(-1) ?? waited.at(-1);
  return [lines[0], why].filter(Boolean).join(' — ').slice(0, 500);
};

const seconds = (ms) => (ms == null ? '' : `${(ms / 1000).toFixed(1)} s`);

/** A boolean flag: `--strict` or `--strict=true` (not `--strict=false`). */
const flag = (value) => value !== undefined && !/^(false|0|no)$/i.test(value);

/**
 * The DEV note-id check's prefix (watchNoteIds in src/daw/model/noteIds.ts,
 * mounted in DawApp, decision D2). It warns rather than errs, so the console
 * handlers keep its lines with the errors (keptConsoleLine): a note-id
 * regression in a lesson's flows then reaches errorSignatures and the
 * --baseline comparison, and fails the run (verdictOf).
 */
const NOTE_ID_WARNING = '[noteIds]';

/** A console message the run records (cut to 400 characters), or null. */
function keptConsoleLine(msg) {
  const text = msg.text();
  const kept =
    msg.type() === 'error' ||
    (msg.type() === 'warning' && text.startsWith(NOTE_ID_WARNING));
  return kept ? text.slice(0, 400) : null;
}

/** How many of a run's console lines are note-id warnings. */
const noteIdWarningsIn = (lines) =>
  lines.filter((line) => line.startsWith(NOTE_ID_WARNING)).length;

/**
 * A console or page error as a stable signature, so runs can be compared:
 * its first line without the origin, cache-busting queries or long ids.
 */
const errorSignature = (text) =>
  String(text)
    .split('\n')[0]
    .replace(/https?:\/\/[^/\s)'"]+/g, '')
    .replace(/\?[tv]=[\w.-]+/g, '')
    .replace(/\b[0-9a-f]{8,}\b/gi, '<id>')
    .replace(/\d{4,}/g, 'N')
    .trim()
    .slice(0, 200);

function gitInfo() {
  const git = (...a) => {
    try {
      return execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim();
    } catch {
      return null;
    }
  };
  return {
    commit: git('rev-parse', '--short', 'HEAD'),
    branch: git('rev-parse', '--abbrev-ref', 'HEAD'),
    dirty: Boolean(git('status', '--porcelain', '--', 'src')),
  };
}

/** The personas a run asked for (`--persona=all`, the default, runs both). */
function personasFrom(args) {
  const asked = args.persona ?? 'all';
  const names = asked === 'all' ? PERSONAS : asked.split(',');
  for (const name of names) {
    if (!PERSONAS.includes(name)) {
      throw new Error(
        `unknown persona "${name}"; the personas are ${PERSONAS.join(', ')}`,
      );
    }
  }
  return PERSONAS.filter((name) => names.includes(name));
}

/**
 * Signs `page` in as `persona` before it navigates. The dev bypass's plan
 * comes from VITE_DEV_AUTH_BYPASS_PLAN (src/auth/devBypass.ts: 'free' gives a
 * free account's subscription, which useIsPremium reads as not premium);
 * the module is served to this page with that flag read as the persona's,
 * whatever the server was started with. No product code changes, and no
 * other page or server sees it.
 */
async function applyPersona(page, persona) {
  await page.route(
    (url) => url.pathname === BYPASS_MODULE,
    async (route) => {
      const response = await route.fetch();
      const source = await response.text();
      const body = source.replace(BYPASS_PLAN_FLAG, JSON.stringify(persona));
      if (body === source) {
        // checkPersona then stops the lesson with the same question.
        console.warn(
          `${BYPASS_MODULE} no longer reads VITE_DEV_AUTH_BYPASS_PLAN; has it changed?`,
        );
      }
      // Playwright keeps a content-length header it is given, and the body
      // changed length.
      const headers = { ...response.headers() };
      delete headers['content-length'];
      await route.fulfill({ status: response.status(), headers, body });
    },
  );
}

/**
 * The subscription the app was served, read back from the page, which must
 * match `persona`: a free run that the app sees as premium would record the
 * wrong student, so it stops the lesson instead.
 */
async function checkPersona(page, persona) {
  const seen = await page.evaluate(async (path) => {
    const { DEV_BYPASS_SUBSCRIPTION: s } = await import(path);
    return s
      ? {
          hasPaidAccess: s.hasPaidAccess,
          subscriptionStatus: s.subscriptionStatus,
        }
      : null;
  }, BYPASS_MODULE);
  const ok =
    persona === 'premium'
      ? seen?.hasPaidAccess === true && seen.subscriptionStatus === 'active'
      : seen?.hasPaidAccess === false && !seen.subscriptionStatus;
  if (!ok) {
    throw new Error(
      `the page is not signed in as the ${persona} persona (it was served the subscription ${JSON.stringify(seen)}); has src/auth/devBypass.ts changed?`,
    );
  }
  return seen;
}

/**
 * The lessons as the app has them. Any page of the dev server's origin can
 * import its modules; /@vite/client is a small one that boots no app.
 */
async function readLessons(browser, base) {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.goto(`${base}/@vite/client`, { waitUntil: 'domcontentloaded' });
    return await page.evaluate(async (path) => {
      const { TUTORIALS } = await import(path);
      const idsOf = (t) => (!t ? [] : Array.isArray(t) ? t : [t]);
      return TUTORIALS.map((t) => ({
        id: t.id,
        title: t.title,
        difficulty: t.difficulty,
        requiresPremium: Boolean(t.requiresPremium),
        steps: t.steps.map((s) => ({
          id: s.id,
          stage: s.stage,
          instruction: s.instruction,
          targets: idsOf(s.target),
          requires: s.requires ?? null,
          detection: s.synthCheck ? 'synthCheck' : s.check ? 'check' : 'next',
        })),
      }));
    }, TUTORIALS_MODULE);
  } finally {
    await context.close();
  }
}

const tutorialState = (page) =>
  page.evaluate(() => {
    const s = window.__MA_STORE__.getState();
    return {
      lesson: s.activeTutorialId,
      index: s.tutorialStepIndex,
      status: s.tutorialStepStatus,
      celebrate: s.tutorialStepCelebrate,
    };
  });

/** True once the lesson has moved past step `index` (or ended). */
async function waitForAdvance(page, lessonId, index, timeout) {
  try {
    await page.waitForFunction(
      ({ id, i }) => {
        const s = window.__MA_STORE__.getState();
        return s.activeTutorialId !== id || s.tutorialStepIndex > i;
      },
      { id: lessonId, i: index },
      { timeout, polling: 100 },
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * The anchor once it, the coach card and the spotlight ring stop moving (the
 * dock opens with a spring, the card glides to its place), measured while
 * the card shows `stepNumber`.
 */
async function measureSettled(page, ids, stepNumber = null, timeout = 4000) {
  const started = Date.now();
  let previous = null;
  for (;;) {
    const m = await page.evaluate((t) => window.__MA_MEASURE_ANCHOR__(t), ids);
    const moved =
      stepNumber !== null && m.store && m.store.step !== stepNumber - 1;
    const ready = stepNumber === null || m.card?.step === stepNumber;
    const key = JSON.stringify([m.anchorId, m.box, m.card?.box, m.ring?.box]);
    if (
      moved ||
      (ready && key === previous) ||
      Date.now() - started > timeout
    ) {
      m.settleMs = Date.now() - started;
      if (!moved && !(ready && key === previous)) m.unsettled = true;
      return m;
    }
    previous = ready ? key : null;
    await page.waitForTimeout(200);
  }
}

/**
 * What the page's trace saw of step `index`: whether it was shown at all,
 * its first `done` (with `celebrate`: false when its check already held as
 * it began), the event that ended it, and its early anchor measurement.
 */
const traceOf = (page, index) =>
  page.evaluate((i) => {
    const trace = window.__MA_LESSON_TRACE__;
    if (!trace) return null;
    const from = trace.events.findIndex((e) => e.lesson && e.index === i);
    if (from < 0) return { shown: false };
    const rest = trace.events.slice(from);
    return {
      shown: true,
      began: rest[0].t,
      done: rest.find((e) => e.lesson && e.index === i && e.status === 'done'),
      end: rest.find((e) => !e.lesson || e.index !== i) ?? null,
      early: trace.early[i] ?? null,
    };
  }, index);

/**
 * The look at a step that completed before its driver ran: its early
 * measurement while it was still up, else a settled one taken while the card
 * showed it, else the early one marked late (taken after it moved on, so it
 * shows the next step's screen and proves nothing), else none.
 */
function arrivalLook(settled, early, lessonId, index) {
  if (early?.stillUp) return early;
  if (
    settled &&
    settled.store?.lesson === lessonId &&
    settled.store.step === index &&
    settled.card?.step === index + 1
  ) {
    return settled;
  }
  return early ? { ...early, late: true } : null;
}

/** The check of step `index` against the page's state right now. */
const checkNow = (page, lessonId, index) =>
  page.evaluate(
    async ({ path, id, i }) => {
      const { TUTORIALS } = await import(path);
      const step = TUTORIALS.find((t) => t.id === id)?.steps[i];
      const main = window.__MA_STORE__.getState();
      const synth = window.__MA_SYNTH_STORE__?.getState();
      try {
        if (step?.check) {
          return step.check(main, window.__MA_LESSON_ARMED__ ?? main);
        }
        if (step?.synthCheck) {
          return step.synthCheck(
            synth,
            window.__MA_LESSON_ARMED_SYNTH__ ?? synth,
          );
        }
        return null;
      } catch (error) {
        return `threw ${error}`;
      }
    },
    { path: TUTORIALS_MODULE, id: lessonId, i: index },
  );

/** The coach card's Next (Finish on the last step) button. */
const nextButton = (page) =>
  page
    .locator('button[aria-label="Quit tutorial"]')
    .locator('xpath=ancestor::div[contains(@style, "position: fixed")][1]')
    .getByRole('button', { name: /^(Next|Finish)$/ });

/**
 * The `ctx` every driver gets; see lessonDrivers.mjs. An action that fails
 * is recorded in res.actions and its error tagged `recorded`, so runStep can
 * tell those from errors a driver throws itself, which it records too.
 */
function makeDriverContext(page, res, actionTimeout) {
  const record = async (label, how, fn) => {
    const started = Date.now();
    try {
      const value = await fn();
      res.actions.push({ label, how, ok: true, ms: Date.now() - started });
      return value;
    } catch (error) {
      res.actions.push({
        label,
        how,
        ok: false,
        ms: Date.now() - started,
        error: short(error),
      });
      const tagged = error instanceof Error ? error : new Error(String(error));
      tagged.recorded = true;
      throw tagged;
    }
  };
  const anchorLocator = (id) =>
    page.locator(`[data-tutorial-id="${id}"]`).first();
  const ctx = {
    page,
    click: (locator, label) =>
      record(`click ${label}`, 'click', () =>
        locator.click({ timeout: actionTimeout }),
      ),
    clickAnchor: (id, label = id) => ctx.click(anchorLocator(id), label),
    clickAt: (locator, fx, fy, label) =>
      record(`click ${label}`, 'click', async () => {
        const box = await locator.boundingBox({ timeout: actionTimeout });
        if (!box) throw new Error(`${label}: no box to click in`);
        const x = box.x + fx * box.width;
        const y = box.y + fy * box.height;
        // page.mouse skips Playwright's checks; make the same one by hand.
        const onTop = await locator.evaluate(
          (el, [px, py]) => {
            const hit = document.elementFromPoint(px, py);
            return hit && (hit === el || el.contains(hit))
              ? null
              : (hit?.outerHTML.slice(0, 120) ?? 'nothing');
          },
          [x, y],
        );
        if (onTop) throw new Error(`${label}: ${onTop} is on top there`);
        await page.mouse.click(x, y);
      }),
    select: (locator, value, label) =>
      record(`pick ${label}`, 'select', async () => {
        // selectOption sets the value without a pointer, so first check what
        // a student's click on the menu would hit, as Playwright does for a
        // click: scrolled into view, nothing on top of its middle.
        await locator.scrollIntoViewIfNeeded({ timeout: actionTimeout });
        const onTop = await locator.evaluate((el) => {
          const r = el.getBoundingClientRect();
          const hit = document.elementFromPoint(
            r.left + r.width / 2,
            r.top + r.height / 2,
          );
          return hit && (hit === el || el.contains(hit))
            ? null
            : (hit?.outerHTML.slice(0, 120) ?? 'nothing');
        });
        if (onTop) throw new Error(`${label}: ${onTop} is on top of the menu`);
        await locator.selectOption(value, { timeout: actionTimeout });
      }),
    press: (key, label) => record(label, 'key', () => page.keyboard.press(key)),
    act: (label, fn, arg) =>
      record(label, 'store', () => page.evaluate(fn, arg)),
    read: (fn, arg) => page.evaluate(fn, arg),
    waitFor: (label, fn, arg, ms = ACTION_TIMEOUT) =>
      record(`wait for ${label}`, 'wait', () =>
        page.waitForFunction(fn, arg, { timeout: ms, polling: 100 }),
      ),
    measure: async (id) => {
      const found = await anchorLocator(id)
        .waitFor({ state: 'attached', timeout: ACTION_TIMEOUT })
        .then(
          () => true,
          () => false,
        );
      res.extraAnchors.push(
        found
          ? await measureSettled(page, [id])
          : {
              targets: [id],
              anchorId: null,
              visible: false,
              reasons: [`${id} never appeared`],
            },
      );
    },
    // The Next button is on the coach card, never under the anchor's cover.
    next: () =>
      record('click Next', 'next', () =>
        nextButton(page).click({ timeout: ACTION_TIMEOUT }),
      ),
    note: (text) => res.notes.push(text),
    problem: (text) => res.problems.push(text),
  };
  return ctx;
}

/** Moves a stuck lesson on, the way Next would if it were enabled. */
const forceAdvance = (page, index, total) =>
  page.evaluate(
    ({ i, n }) => {
      const s = window.__MA_STORE__.getState();
      if (i + 1 < n) s.goToTutorialStep(i + 1);
      else s.quitTutorial();
    },
    { i: index, n: total },
  );

async function shoot(page, env, res, kind) {
  if (!env.shots) return;
  const dir = join(
    env.outDir,
    'shots',
    env.profile,
    env.persona,
    env.lesson.id,
  );
  mkdirSync(dir, { recursive: true });
  const file = join(
    dir,
    `${String(res.index + 1).padStart(2, '0')}-${res.id}-${kind}.png`,
  );
  try {
    await page.screenshot({ path: file });
    res.shots.push(relative(env.outDir, file));
  } catch {
    // A closed or crashed page has nothing to show.
  }
}

/** A step's result before anything is known about it. */
const newStepResult = (step, index) => ({
  index,
  id: step.id,
  stage: step.stage,
  targets: step.targets,
  detection: step.detection,
  reached: true,
  driver: null,
  anchor: null,
  extraAnchors: [],
  actions: [],
  notes: [],
  problems: [],
  warnings: [],
  warningKinds: [],
  advanced: false,
  advancedOnArrival: false,
  completedEarly: false,
  endedOnIt: false,
  dwellMs: null,
  actionTimeoutMs: null,
  recoveredBy: null,
  forced: false,
  checkAtTimeout: null,
  consoleErrors: [],
  shots: [],
  ms: {},
  knownFailure: null,
  pass: false,
  reasons: [],
});

/** A step the lesson never showed, which fails with `why`. */
function unreachedStep(step, index, why) {
  const res = newStepResult(step, index);
  res.reached = false;
  res.reasons = [why];
  return res;
}

/** Decides pass or fail and why, from what the step recorded. */
function judge(res, step) {
  const reasons = [];
  const warn = (kind, text) => {
    res.warnings.push(text);
    if (!res.warningKinds.includes(kind)) res.warningKinds.push(kind);
  };
  const a = res.anchor;
  const early = res.advancedOnArrival || res.completedEarly;
  if (step.targets.length && !a) {
    // Only a step that completed before its driver ran can lack a look (the
    // others are measured before they act), so its anchor went unseen.
    reasons.push('its anchor was not measured while it was up');
  } else if (a?.late) {
    warn(
      'measured-late',
      `its anchor could only be measured ${a.afterMs} ms after it began, once it had moved on, so it is not judged`,
    );
  } else if (a && !a.visible) {
    const text = `anchor ${a.anchorId ?? step.targets.join(' | ')}: ${a.reasons.join('; ')}`;
    // A step that advances by itself is up for about 300 ms, while the coach
    // card is still gliding to its place (it re-anchors every 150 ms over a
    // 0.3 s transition), so the card or ring covering the anchor then is a
    // matter of timing. A missing, empty, hidden, off-window or clipped
    // anchor is not, nor is any cover on a step that waited for its driver.
    const transient =
      res.advancedOnArrival && a.kinds.every((kind) => kind === 'covered');
    if (transient) warn('covered-while-up', `while it was up, the ${text}`);
    else reasons.push(text);
  }
  if (a && !a.late && a.visible && a.partlyCovered) {
    warn('partly-covered', `anchor ${a.anchorId}: ${a.partlyCovered}`);
  }
  for (const extra of res.extraAnchors) {
    // A later target of the step itself (the spotlight follows into a menu
    // or dialog) must be visible too; other ids are informational.
    const id = extra.anchorId ?? extra.targets[0];
    if (extra.visible) {
      if (extra.partlyCovered) {
        warn('partly-covered', `then ${id}: ${extra.partlyCovered}`);
      }
      continue;
    }
    const text = `then ${id}: ${extra.reasons.join('; ')}`;
    if (step.targets.includes(extra.targets[0])) reasons.push(text);
    else warn('extra-not-visible', text);
  }
  reasons.push(...res.problems);
  for (const action of res.actions) {
    if (!action.ok) reasons.push(`${action.label} failed: ${action.error}`);
  }
  if (!res.advanced && !res.endedOnIt) {
    reasons.push(
      `it did not advance (its check is ${JSON.stringify(res.checkAtTimeout)} in the page)`,
    );
  }
  if (res.advancedOnArrival) {
    warn(
      'advanced-on-arrival',
      `it advanced by itself ${res.dwellMs ?? '?'} ms after it began, so its copy cannot be read`,
    );
  }
  if (res.completedEarly) {
    warn(
      'completed-early',
      'it was marked done, with confetti, before its driver ran: something other than the student completed it (a late effect of an earlier step)',
    );
  }
  if (a && !a.late && a.anchorId && a.spotlightId !== a.anchorId) {
    warn(
      'spotlight-elsewhere',
      `the spotlight rings ${a.spotlightId ?? 'nothing'}, not ${a.anchorId}`,
    );
  } else if (a?.ring && !a.ring.onAnchor && !early && !a.unsettled) {
    // (The ring moves over 120 ms, so it is only judged once settled.)
    warn('ring-off-anchor', 'the spotlight ring is not on the anchor');
  }
  if (a?.unsettled) {
    warn('unsettled', 'the anchor or the coach card was still moving');
  }
  res.reasons = reasons;
  res.pass = reasons.length === 0;
}

async function runStep(env, step, index) {
  const { page, lesson } = env;
  const res = newStepResult(step, index);
  const consoleMark = env.console.length;
  const started = Date.now();
  const passedBy = (s) => s.lesson !== lesson.id || s.index > index;
  await page
    .waitForFunction(
      ({ id, i }) => {
        const s = window.__MA_STORE__.getState();
        return s.activeTutorialId !== id || s.tutorialStepIndex >= i;
      },
      { id: lesson.id, i: index },
      { timeout: 20_000, polling: 100 },
    )
    .catch(() => {});
  let state = await tutorialState(page);
  const driver = driverFor(lesson.id, step.id);
  res.driver = driver
    ? {
        how: driver.how,
        describe: driver.describe,
        related: driver.related ?? [],
      }
    : null;
  if (state.lesson === lesson.id && state.index < index) {
    return finish(
      unreachedStep(
        step,
        index,
        `the lesson never reached this step (it stayed on step ${state.index + 1})`,
      ),
    );
  }

  if (!passedBy(state)) {
    res.anchor = await measureSettled(page, step.targets, index + 1);
    state = await tutorialState(page);
  }
  let seen = await traceOf(page, index);
  if (!seen) {
    // Without the trace no step can be judged: stop the lesson (its steps
    // then count as failed) rather than guess.
    throw new Error('the page has no lesson trace (__MA_LESSON_TRACE__)');
  }
  if (!seen.shown) {
    return finish(
      unreachedStep(
        step,
        index,
        state.lesson === lesson.id
          ? 'the lesson skipped this step'
          : 'the lesson ended before this step',
      ),
    );
  }
  if (seen.done || passedBy(state)) {
    // It completed before its driver ran. Quietly (no confetti, per the
    // trace) means its check held as it began, so it advances by itself;
    // with confetti, something completed it after it began (a late effect
    // of an earlier step), which is not the same and is judged in full.
    res.advancedOnArrival = seen.done?.celebrate === false;
    res.completedEarly = !res.advancedOnArrival;
    res.advanced =
      passedBy(await tutorialState(page)) ||
      (await waitForAdvance(page, lesson.id, index, 5000));
    seen = await traceOf(page, index);
    if (!seen.done && seen.end) {
      // It moved on without ever being done: the lesson was quit or skipped.
      res.completedEarly = false;
      res.endedOnIt = !seen.end.lesson;
      res.problems.push(
        res.endedOnIt
          ? 'the lesson ended while this step was up, before it was done'
          : `the lesson skipped from this step to step ${seen.end.index + 1}`,
      );
    }
    res.anchor = arrivalLook(res.anchor, seen.early, lesson.id, index);
  } else {
    if (!res.anchor.visible) await shoot(page, env, res, 'anchor');
    const driverStarted = await page.evaluate(() => {
      window.__MA_LESSON_ARMED__ = window.__MA_STORE__.getState();
      window.__MA_LESSON_ARMED_SYNTH__ = window.__MA_SYNTH_STORE__?.getState();
      return performance.now();
    });
    res.actionTimeoutMs = res.anchor.kinds.includes('covered')
      ? COVERED_ACTION_TIMEOUT
      : ACTION_TIMEOUT;
    const ctx = makeDriverContext(page, res, res.actionTimeoutMs);
    const acting = Date.now();
    let threw = false;
    try {
      if (driver) await driver.run(ctx);
      else if (step.detection !== 'next') {
        ctx.problem('no driver for this step in lessonDrivers.mjs');
      }
      // A free-form step still up after its driver advances on Next.
      if (step.detection === 'next' && !passedBy(await tutorialState(page))) {
        await ctx.next();
      }
    } catch (error) {
      threw = true;
      // A failed ctx action is already in res.actions; anything else the
      // driver threw (no G slice, no chord offered, a read that failed) is
      // the real cause, not "did not advance".
      if (!error?.recorded) res.problems.push(`driver threw: ${short(error)}`);
    }
    res.ms.action = Date.now() - acting;
    const waiting = Date.now();
    res.advanced = await waitForAdvance(
      page,
      lesson.id,
      index,
      threw ? 3000 : (driver?.advanceTimeoutMs ?? env.stepTimeout),
    );
    res.ms.advance = Date.now() - waiting;
    if (driver?.after) {
      await driver.after(ctx).catch((error) => {
        if (!error?.recorded) {
          res.problems.push(`after the step: ${short(error)}`);
        }
      });
    }
    // A quiet completion that landed before the driver started (a race with
    // the look above) means the step advanced by itself after all.
    seen = await traceOf(page, index);
    if (seen?.done?.celebrate === false && seen.done.t <= driverStarted) {
      res.advancedOnArrival = true;
      res.anchor = arrivalLook(res.anchor, seen.early, lesson.id, index);
    }
    if (!res.advanced) {
      res.checkAtTimeout = await checkNow(page, lesson.id, index).catch(
        (error) => `unknown: ${short(error)}`,
      );
      await shoot(page, env, res, 'stuck');
      if (driver?.fallback) {
        const recovering = Date.now();
        try {
          await driver.fallback(ctx);
          const wait = Math.max(10_000, driver.advanceTimeoutMs ?? 0);
          if (await waitForAdvance(page, lesson.id, index, wait)) {
            res.recoveredBy = 'its driver’s fallback';
          }
        } catch (error) {
          if (!error?.recorded) {
            res.problems.push(`fallback threw: ${short(error)}`);
          }
        }
        res.ms.fallback = Date.now() - recovering;
      }
      if (!res.recoveredBy) {
        await forceAdvance(page, index, lesson.steps.length);
        res.forced = true;
      }
    }
  }
  return finish(res);

  async function finish(result) {
    result.driver = res.driver;
    result.ms.total = Date.now() - started;
    if (result.reached) result.dwellMs = await dwellOf(page, index);
    result.consoleErrors = env.console.slice(consoleMark);
    if (result.reached) judge(result, step);
    return result;
  }
}

/**
 * Waits until the editor is quiet: no React commit and no store write in a
 * whole 500 ms window (for at most 10 s). Both idle recordings start from
 * this state, so neither includes boot work the other has finished.
 */
async function waitQuiet(page, timeout = 10_000) {
  const started = Date.now();
  for (;;) {
    await startRecording(page);
    await page.waitForTimeout(500);
    const sample = await stopRecording(page);
    const quiet =
      sample.reactCommitsPerSecond === 0 && sample.storeWritesPerSecond === 0;
    if (quiet || Date.now() - started > timeout) {
      return { quiet, ms: Date.now() - started };
    }
  }
}

/** The editor's per-second activity while nobody touches it. */
async function recordIdle(page, idleSeconds) {
  const quiet = await waitQuiet(page);
  await startRecording(page);
  await page.waitForTimeout(idleSeconds * 1000);
  const idle = await stopRecording(page);
  return {
    seconds: idle.seconds,
    quietAfterMs: quiet.ms,
    startedQuiet: quiet.quiet,
    appRafCallsPerSecond: idle.appRafCallsPerSecond,
    reactCommitsPerSecond: idle.reactCommitsPerSecond,
    storeWritesPerSecond: idle.storeWritesPerSecond,
    frameMs: idle.frameMs,
    longTasks: idle.longTasks,
    longAnimationFrames: idle.longAnimationFrames,
    storeKeys: idle.storeKeys.slice(0, 5),
  };
}

/** The control for the lessons' idle: an empty editor, no lesson. */
async function idleWithoutLesson(browser, base, profile, persona, idleSeconds) {
  const { context, page } = await newPage(browser, profile);
  try {
    await applyPersona(page, persona);
    await openEditor(page, base, '?new=1');
    await checkPersona(page, persona);
    await startAudio(page);
    return { persona, ...(await recordIdle(page, idleSeconds)) };
  } catch (error) {
    return { persona, error: short(error) };
  } finally {
    await context.close();
  }
}

/**
 * How long step `index` was up, from the page's trace: from the first event
 * on it to the first event past it (the next step, or the lesson ending).
 */
const dwellOf = (page, index) =>
  page.evaluate((i) => {
    const events = window.__MA_LESSON_TRACE__?.events ?? [];
    const start = events.find((e) => e.lesson && e.index === i);
    const end = events.find(
      (e) => start && e.t >= start.t && (!e.lesson || e.index > i),
    );
    return start && end ? end.t - start.t : null;
  }, index);

async function runLesson(env) {
  const { browser, base, profile, persona, lesson } = env;
  const run = {
    profile,
    persona,
    lesson: lesson.id,
    title: lesson.title,
    steps: [],
    // `ended`: no lesson is running at the end; `completed`: the lesson
    // recorded itself as completed (a forced last step only ends it).
    ended: false,
    completed: false,
    subscription: null,
    idle: null,
    sampleRate: null,
    error: null,
    pageErrors: [],
    consoleErrors: [],
    noteIdWarnings: 0,
    errorSignatures: [],
    ms: {},
  };
  const started = Date.now();
  const consoleErrors = [];
  let session = null;
  try {
    session = await newPage(browser, profile);
    const { page } = session;
    page.on('console', (msg) => {
      const line = keptConsoleLine(msg);
      if (line !== null) consoleErrors.push(line);
    });
    await applyPersona(page, persona);
    // Both before the editor loads, so the trace sees its first step.
    await page.addInitScript({
      content: `window.__MA_MEASURE_ANCHOR__ = ${measureAnchor};`,
    });
    await page.addInitScript(
      installLessonTrace,
      lesson.steps.map((s) => s.targets),
    );
    const stepEnv = { ...env, page, console: consoleErrors };
    await openEditor(page, base, `?tutorial=${encodeURIComponent(lesson.id)}`);
    run.ms.load = Date.now() - started;
    run.subscription = await checkPersona(page, persona);
    await startAudio(page);
    // The live context's rate (an export renders at it; see audio-core-01).
    run.sampleRate = await page.evaluate(
      () => window.__MA_AUDIO_ENGINE__?.getSampleRate?.() ?? null,
    );
    if (env.idleSeconds > 0) {
      // The lesson open on step 1 with nothing happening, against the same
      // empty editor without a lesson (report.idleWithoutLesson): the
      // difference is what the overlay costs while a student reads.
      await measureSettled(page, lesson.steps[0].targets, 1);
      run.idle = await recordIdle(page, env.idleSeconds);
    }
    for (let i = 0; i < lesson.steps.length; i++) {
      const res = await runStep(stepEnv, lesson.steps[i], i);
      run.steps.push(res);
      const label = !res.reached
        ? 'NOT REACHED'
        : res.pass
          ? res.warnings.length
            ? 'pass*'
            : 'pass'
          : 'FAIL';
      console.log(
        `[${profile}/${persona}] ${lesson.id} ${i + 1}/${lesson.steps.length} ${res.id}: ${label} (${seconds(res.ms.total)})${res.pass ? '' : ` — ${res.reasons[0]}`}`,
      );
    }
    const end = await page.evaluate((id) => {
      let progress = null;
      try {
        progress = JSON.parse(
          localStorage.getItem('music-atlas-tutorial-progress') ?? 'null',
        );
      } catch {
        // Unreadable progress is the same as none.
      }
      return {
        active: window.__MA_STORE__.getState().activeTutorialId,
        marked: progress?.state?.completedAt?.[id] != null,
      };
    }, lesson.id);
    run.ended = end.active === null;
    run.completed = end.marked;
  } catch (error) {
    run.error = short(error);
    console.log(`[${profile}/${persona}] ${lesson.id}: ERROR ${run.error}`);
  } finally {
    // A lesson that stops is the worst regression, so every step it did not
    // get to fails, rather than leaving a shorter report that looks fine.
    for (let i = run.steps.length; i < lesson.steps.length; i++) {
      run.steps.push(
        unreachedStep(
          lesson.steps[i],
          i,
          `not reached: the lesson stopped (${run.error ?? 'unknown error'})`,
        ),
      );
    }
    run.pageErrors = [...(session?.errors ?? [])];
    run.consoleErrors = [...new Set(consoleErrors)].slice(0, 20);
    run.noteIdWarnings = noteIdWarningsIn(consoleErrors);
    run.errorSignatures = [
      ...new Set([
        ...consoleErrors.map(errorSignature),
        ...run.pageErrors.map((e) => `uncaught: ${errorSignature(e)}`),
      ]),
    ].sort();
    run.ms.total = Date.now() - started;
    await session?.context.close().catch(() => {});
  }
  return run;
}

// ── Premium gate ────────────────────────────────────────────────────────

/** A gate check before anything is known about it. */
const newGateCheck = (id, describe) => ({
  id,
  describe,
  pass: false,
  reasons: [],
  notes: [],
  shots: [],
  ms: null,
  knownFailure: null,
});

/**
 * Judges the upgrade prompt that is up on `page` (it fits the window, See
 * plans is the white pill, Not now is there), then closes it with Not now.
 */
async function closeUpgradePrompt(page, check) {
  const dialog = page.getByRole('dialog', { name: UPGRADE_TITLE });
  const box = await dialog.boundingBox();
  const { width, height } = page.viewportSize();
  if (
    !box ||
    box.x < 0 ||
    box.y < 0 ||
    box.x + box.width > width + 0.5 ||
    box.y + box.height > height + 0.5
  ) {
    check.reasons.push(`the prompt does not fit the ${width}×${height} window`);
  }
  const seePlans = dialog.getByRole('button', { name: 'See plans' });
  if ((await seePlans.count()) !== 1) {
    check.reasons.push('the prompt has no See plans button');
  } else {
    const background = await seePlans.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    if (background !== 'rgb(255, 255, 255)') {
      check.reasons.push(
        `See plans is not the white pill (its background is ${background})`,
      );
    }
  }
  const notNow = dialog.getByRole('button', { name: 'Not now' });
  if ((await notNow.count()) !== 1) {
    check.reasons.push('the prompt has no Not now button');
    return;
  }
  await notNow.click({ timeout: ACTION_TIMEOUT });
  const closed = await dialog.waitFor({ state: 'hidden', timeout: 5000 }).then(
    () => true,
    () => false,
  );
  if (!closed) check.reasons.push('Not now did not close the prompt');
}

/** Whether the upgrade prompt is up: the boot shows it once it decides. */
const promptOrLessonUp = (title) =>
  window.__MA_STORE__?.getState().activeTutorialId != null ||
  [...document.querySelectorAll('[role="dialog"]')].some((d) =>
    d.textContent.includes(title),
  );

/**
 * The lesson's tile on the Production tab: it wears the Premium chip, offers
 * a dialog, and its click opens the upgrade prompt without leaving the page.
 */
async function tileGate(env, check) {
  const { page, base, lesson } = env;
  await page.goto(`${base}${PRODUCTION_PATH}`, {
    waitUntil: 'domcontentloaded',
    timeout: 180_000,
  });
  const tile = page.locator(`button[data-lesson-id="${lesson.id}"]`);
  await tile.waitFor({ state: 'visible', timeout: 120_000 });
  env.run.subscription ??= await checkPersona(page, env.persona);
  if ((await tile.getByText('Premium', { exact: true }).count()) === 0) {
    check.reasons.push('its tile has no Premium chip');
  }
  // Until the subscription is known the tile opens the editor, whose boot
  // decides; once it is known to be free, the tile offers the prompt.
  const offered = await page
    .waitForFunction(
      (id) =>
        document
          .querySelector(`button[data-lesson-id="${id}"]`)
          ?.getAttribute('aria-haspopup') === 'dialog',
      lesson.id,
      { timeout: 15_000, polling: 100 },
    )
    .then(
      () => true,
      () => false,
    );
  if (!offered) {
    check.reasons.push('its tile does not offer the upgrade prompt');
  }
  await tile.click({ timeout: ACTION_TIMEOUT });
  const dialog = page.getByRole('dialog', { name: UPGRADE_TITLE });
  const shown = await dialog
    .waitFor({ state: 'visible', timeout: 10_000 })
    .then(
      () => true,
      () => false,
    );
  const url = new URL(page.url());
  if (url.pathname !== PRODUCTION_PATH) {
    check.reasons.push(
      `the click left the page for ${url.pathname}${url.search}`,
    );
  }
  if (!shown) {
    check.reasons.push('no upgrade prompt appeared');
    return;
  }
  await closeUpgradePrompt(page, check);
}

/**
 * A ?tutorial=<id> link, loaded over work the editor has saved (a shared or
 * bookmarked link): it starts no lesson, the work is still open, and the
 * same prompt is up; after Not now the editor takes clicks again.
 */
async function linkGate(env, check) {
  const { page, base, lesson } = env;
  await openEditor(page, base, '?new=1');
  env.run.subscription ??= await checkPersona(page, env.persona);
  const tracksOf = () =>
    window.__MA_STORE__
      .getState()
      .tracks.map((t) => `${t.instrument}: ${t.name}`);
  const work = await page.evaluate(({ project, track }) => {
    const s = window.__MA_STORE__.getState();
    s.setProjectName(project);
    s.addTrack('midi', 'oracle-synth', track);
    return window.__MA_STORE__.getState().projectName;
  }, GATE_WORK);
  const workTracks = await page.evaluate(tracksOf);
  const saved = await page
    .waitForFunction(
      ([key, name]) => (localStorage.getItem(key) ?? '').includes(name),
      [AUTOSAVE_KEY, GATE_WORK.track],
      { timeout: 15_000, polling: 200 },
    )
    .then(
      () => true,
      () => false,
    );
  if (!saved) {
    check.reasons.push(
      'the editor never saved the work to open the link over (no autosave)',
    );
    return;
  }

  await openEditor(page, base, `?tutorial=${encodeURIComponent(lesson.id)}`);
  // The boot waits for the subscription, then shows the prompt (or, wrongly,
  // starts the lesson); a second more catches a lesson that starts late.
  await page
    .waitForFunction(promptOrLessonUp, UPGRADE_TITLE, {
      timeout: 20_000,
      polling: 100,
    })
    .catch(() => {});
  await page.waitForTimeout(1000);
  const after = await page.evaluate(() => {
    const s = window.__MA_STORE__.getState();
    return {
      lesson: s.activeTutorialId,
      project: s.projectName,
      search: window.location.search,
    };
  });
  const afterTracks = await page.evaluate(tracksOf);
  if (after.lesson) {
    check.reasons.push(`the link started the lesson (${after.lesson})`);
  }
  if (
    after.project !== work ||
    JSON.stringify(afterTracks) !== JSON.stringify(workTracks)
  ) {
    check.reasons.push(
      `the link replaced the work that was open: the editor has "${after.project}" with ${afterTracks.join(', ') || 'no tracks'}, not "${work}" with ${workTracks.join(', ')}`,
    );
  }
  const dialog = page.getByRole('dialog', { name: UPGRADE_TITLE });
  if (!(await dialog.isVisible())) {
    check.reasons.push('no upgrade prompt appeared');
  } else {
    await closeUpgradePrompt(page, check);
    // A modal blocks the page's pointer events while it is up.
    const clickable = await page
      .locator('[data-tutorial-id="add-track-button"]')
      .click({ trial: true, timeout: 5000 })
      .then(
        () => true,
        () => false,
      );
    if (!clickable) {
      check.reasons.push(
        'after Not now the editor does not take clicks (add-track-button)',
      );
    }
  }
  if (after.search) {
    check.notes.push(
      `the link stayed in the address bar (${after.search}), so a refresh asks again`,
    );
  }
}

/** The gate checks, in the order a gated lesson runs them. */
const GATE_CHECKS = [
  {
    id: 'tile',
    describe: `its tile on ${PRODUCTION_PATH} wears the Premium chip and opens the upgrade prompt, without leaving the page`,
    run: tileGate,
  },
  {
    id: 'link',
    describe:
      'a ?tutorial= link loaded over saved work starts no lesson, keeps the work open and shows the upgrade prompt',
    run: linkGate,
  },
];

async function shootGate(page, env, check) {
  if (!env.shots) return;
  const dir = join(
    env.outDir,
    'shots',
    env.profile,
    env.persona,
    env.lesson.id,
  );
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `gate-${check.id}.png`);
  try {
    await page.screenshot({ path: file });
    check.shots.push(relative(env.outDir, file));
  } catch {
    // A closed or crashed page has nothing to show.
  }
}

/**
 * A Premium lesson for the free student: expected not to run (owner
 * decision 8), so its gate is checked instead of its steps, each check in a
 * fresh context. The gate holding is the lesson's pass.
 */
async function runGatedLesson(env) {
  const { browser, profile, persona, lesson } = env;
  const run = {
    profile,
    persona,
    lesson: lesson.id,
    title: lesson.title,
    gate: { pass: false, checks: [] },
    steps: [],
    // Not walked: neither applies.
    ended: null,
    completed: false,
    subscription: null,
    idle: null,
    sampleRate: null,
    error: null,
    pageErrors: [],
    consoleErrors: [],
    noteIdWarnings: 0,
    errorSignatures: [],
    ms: {},
  };
  const started = Date.now();
  const consoleErrors = [];
  for (const { id, describe, run: runCheck } of GATE_CHECKS) {
    const check = newGateCheck(id, describe);
    const checkStarted = Date.now();
    let session = null;
    try {
      session = await newPage(browser, profile, { probes: false });
      session.page.on('console', (msg) => {
        const line = keptConsoleLine(msg);
        if (line !== null) consoleErrors.push(line);
      });
      await applyPersona(session.page, persona);
      await runCheck({ ...env, run, page: session.page }, check);
    } catch (error) {
      check.reasons.push(`it stopped: ${short(error)}`);
    }
    check.pass = check.reasons.length === 0;
    if (!check.pass && session) await shootGate(session.page, env, check);
    run.pageErrors.push(...(session?.errors ?? []));
    await session?.context.close().catch(() => {});
    check.ms = Date.now() - checkStarted;
    run.gate.checks.push(check);
    console.log(
      `[${profile}/${persona}] ${lesson.id} gate ${id}: ${check.pass ? 'pass' : 'FAIL'} (${seconds(check.ms)})${check.pass ? '' : ` — ${check.reasons[0]}`}`,
    );
  }
  run.gate.pass = run.gate.checks.every((c) => c.pass);
  run.consoleErrors = [...new Set(consoleErrors)].slice(0, 20);
  run.noteIdWarnings = noteIdWarningsIn(consoleErrors);
  run.errorSignatures = [
    ...new Set([
      ...consoleErrors.map(errorSignature),
      ...run.pageErrors.map((e) => `uncaught: ${errorSignature(e)}`),
    ]),
  ].sort();
  run.ms.total = Date.now() - started;
  return run;
}

// ── Verdict ─────────────────────────────────────────────────────────────

const personaOf = (run) => run.persona ?? 'premium';
const runKey = (run) => `${run.profile}/${personaOf(run)}/${run.lesson}`;
const stepKey = (run, step) => `${runKey(run)}/${step.id}`;

function totalsOf(runs) {
  const walked = runs.filter((r) => !r.gate);
  const gated = runs.filter((r) => r.gate);
  const steps = walked.flatMap((r) => r.steps);
  return {
    lessons: runs.length,
    walked: walked.length,
    completed: walked.filter((r) => r.completed).length,
    // The free student's Premium lessons, and how many held their gate.
    gated: gated.length,
    gatesHeld: gated.filter((r) => r.gate.pass).length,
    errors: runs.filter((r) => r.error).length,
    steps: steps.length,
    failed: steps.filter((s) => !s.pass).length,
    unreached: steps.filter((s) => !s.reached).length,
    warned: steps.filter((s) => s.pass && s.warnings.length).length,
    noteIdWarnings: runs.reduce((n, r) => n + (r.noteIdWarnings ?? 0), 0),
  };
}

/** A gate check's key, as KNOWN_FAILURES would list it. */
const gateKey = (run, check) => `${runKey(run)}/gate:${check.id}`;

/**
 * Failing steps and gate checks against KNOWN_FAILURES (lessonDrivers.mjs):
 * `unexpected` fail the run; `fixed` are listed patterns whose every matching
 * step in this run passes, so they can come off the list.
 */
function checkKnown(runs) {
  const unexpected = [];
  const known = [];
  const matched = new Map();
  for (const run of runs) {
    const items = run.gate
      ? run.gate.checks.map((check) => [gateKey(run, check), check])
      : run.steps.map((step) => [stepKey(run, step), step]);
    for (const [key, step] of items) {
      const pattern = knownFailureFor(key);
      if (pattern) {
        const m = matched.get(pattern) ?? { failing: 0, passing: 0 };
        m[step.pass ? 'passing' : 'failing'] += 1;
        matched.set(pattern, m);
      }
      if (step.pass) continue;
      if (pattern) {
        step.knownFailure = { pattern, why: KNOWN_FAILURES[pattern] };
        known.push(key);
      } else {
        unexpected.push(key);
      }
    }
  }
  const fixed = [...matched]
    .filter(([, m]) => m.failing === 0)
    .map(([pattern]) => pattern);
  return {
    listed: Object.keys(KNOWN_FAILURES).length,
    known,
    unexpected,
    fixed,
  };
}

/**
 * Changes since `baselinePath`'s report, for every profile, persona and lesson
 * both ran. Regressions: a step that passed and fails, a step with no result
 * now, a new warning of a stable kind, a step that newly needs its fallback
 * (or the script) to move on, a lesson that no longer completes, and a new
 * console or page error. `fixed` lists the reverse.
 */
function compareWithBaseline(report, baselinePath) {
  const before = JSON.parse(readFileSync(baselinePath, 'utf8'));
  const beforeRuns = new Map((before.runs ?? []).map((r) => [runKey(r), r]));
  const regressions = [];
  const fixed = [];
  const note = (list, key, change) => list.push({ key, change });
  const help = (s) => (s.forced ? 2 : s.recoveredBy ? 1 : 0);
  const helpText = [
    '',
    'needs its driver’s fallback',
    'is moved on by the script',
  ];
  for (const run of report.runs) {
    const was = beforeRuns.get(runKey(run));
    if (!was) continue;
    const key = runKey(run);
    if (run.gate || was.gate) {
      // A Premium lesson the free student is turned away from (owner
      // decision 8) has gate checks instead of steps: compare those.
      if (!was.gate) {
        note(fixed, key, 'gated now: the upgrade prompt, not a stuck lesson');
        continue;
      }
      if (!run.gate) {
        note(regressions, key, 'no longer gated: the lesson runs');
        continue;
      }
      const before = new Map(was.gate.checks.map((c) => [c.id, c]));
      for (const check of run.gate.checks) {
        const old = before.get(check.id);
        const at = gateKey(run, check);
        if (old?.pass && !check.pass) {
          note(regressions, at, `now fails: ${check.reasons[0]}`);
        }
        if (old && !old.pass && check.pass) note(fixed, at, 'passes now');
      }
    }
    if (was.completed && !run.completed) {
      note(regressions, key, 'no longer completes');
    }
    if (!was.completed && run.completed) note(fixed, key, 'completes now');
    if (was.errorSignatures) {
      const old = new Set(was.errorSignatures);
      for (const sig of run.errorSignatures) {
        if (!old.has(sig)) note(regressions, key, `new console error: ${sig}`);
      }
      const now = new Set(run.errorSignatures);
      for (const sig of old) {
        if (!now.has(sig)) note(fixed, key, `console error gone: ${sig}`);
      }
    }
    const steps = new Map(run.steps.map((s) => [s.id, s]));
    for (const old of was.steps ?? []) {
      const at = `${key}/${old.id}`;
      const now = steps.get(old.id);
      if (!now) {
        note(regressions, at, 'missing: the step has no result in this run');
        continue;
      }
      if (old.pass && !now.pass) {
        note(regressions, at, `now fails: ${now.reasons[0]}`);
      }
      if (!old.pass && now.pass) note(fixed, at, 'passes now');
      if (help(now) > help(old)) {
        note(regressions, at, `now ${helpText[help(now)]}`);
      }
      if (help(now) < help(old)) {
        note(fixed, at, `no longer ${helpText[help(old)]}`);
      }
      // A report written before warnings had kinds cannot be compared on them.
      if (!old.warningKinds) continue;
      const stable = (kinds) => kinds.filter((k) => STABLE_WARNINGS.has(k));
      for (const kind of stable(now.warningKinds)) {
        if (!old.warningKinds.includes(kind)) {
          note(regressions, at, `new warning: ${kind}`);
        }
      }
      for (const kind of stable(old.warningKinds)) {
        if (!now.warningKinds.includes(kind)) {
          note(fixed, at, `warning gone: ${kind}`);
        }
      }
    }
  }
  return { file: relative(ROOT, baselinePath), regressions, fixed };
}

/** Pass or fail for the whole run, and why (see the exit status above). */
function verdictOf(report, strict) {
  const why = [];
  const { totals, known, baseline } = report;
  const list = (keys) =>
    keys.length > 6
      ? `${keys.slice(0, 6).join(', ')} and ${keys.length - 6} more`
      : keys.join(', ');
  if (totals.errors) {
    why.push(
      `${totals.errors} lesson(s) stopped with an error: ${list(report.runs.filter((r) => r.error).map(runKey))}`,
    );
  }
  if (totals.noteIdWarnings) {
    why.push(
      `${totals.noteIdWarnings} ${NOTE_ID_WARNING} warning(s), notes without a whole id: ${list(report.runs.filter((r) => r.noteIdWarnings).map(runKey))}`,
    );
  }
  if (known.unexpected.length) {
    why.push(
      `${known.unexpected.length} failing step(s) not in KNOWN_FAILURES (lessonDrivers.mjs): ${list(known.unexpected)}`,
    );
  }
  if (baseline?.regressions.length) {
    why.push(
      `${baseline.regressions.length} regression(s) against ${baseline.file}: ${list(baseline.regressions.map((r) => `${r.key} (${r.change})`))}`,
    );
  }
  if (strict && totals.failed) {
    why.push(`--strict: ${totals.failed} step(s) fail`);
  }
  if (strict && totals.gatesHeld < totals.gated) {
    why.push(
      `--strict: ${totals.gated - totals.gatesHeld} Premium lesson gate(s) fail`,
    );
  }
  return { pass: why.length === 0, strict, why };
}

// ── Report ──────────────────────────────────────────────────────────────

/** Text for markdown: Playwright's messages quote HTML (`<div …>`). */
const md = (text) =>
  String(text ?? '')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/** Text for a markdown table cell: a pipe would end the cell. */
const cell = (text) => md(text).replace(/\|/g, '\\|');

function anchorCell(step) {
  const a = step.anchor;
  if (!step.reached) return '';
  if (!a) return step.targets.length ? 'not measured' : 'none (centred card)';
  if (!a.targets?.length) return 'none (centred card)';
  const id = `\`${a.anchorId ?? step.targets[0]}\``;
  if (a.late) return `${id}: measured too late`;
  if (a.visible)
    return a.partlyCovered
      ? `${id}: visible, partly covered`
      : `${id}: visible`;
  // Covered only while a self-advancing step was up (see judge).
  if (step.pass) return `${id}: covered while the card moved`;
  return `${id}: NOT visible (${a.kinds.join(', ')})`;
}

function resultCell(step) {
  if (!step.reached) return 'NOT REACHED';
  if (!step.pass) {
    const known = step.knownFailure ? ', known' : '';
    return step.forced
      ? `FAIL (moved on${known})`
      : `FAIL${known ? ' (known)' : ''}`;
  }
  return step.warnings.length ? 'pass, with warnings' : 'pass';
}

function advanceCell(step) {
  if (!step.reached) return 'not reached';
  if (step.recoveredBy) {
    return `only through its fallback (${seconds(step.ms.fallback)})`;
  }
  if (step.forced) return 'no (moved on by the script)';
  if (step.endedOnIt) return 'no (the lesson ended)';
  if (!step.advanced) return 'no';
  if (step.advancedOnArrival) {
    return `by itself after ${step.dwellMs ?? '?'} ms`;
  }
  if (step.completedEarly) return 'before its driver ran';
  return `after ${seconds(step.ms.advance)}`;
}

const idleText = (idle) =>
  !idle
    ? ''
    : idle.error
      ? `not measured (${idle.error})`
      : `${idle.appRafCallsPerSecond} rAF calls/s, ${idle.reactCommitsPerSecond} commits/s, frame p95 ${idle.frameMs.p95} ms`;

const PERSONA_TEXT = {
  premium: "the dev bypass's premium user",
  free: 'a free student (the bypass user on a free plan, so Prism is locked and the Premium lessons show the upgrade prompt instead of running)',
};

/** A gated run's cell in the lesson table's Completed column. */
const gateCell = (run) =>
  run.gate.pass
    ? 'gated (upgrade prompt), as it should be'
    : `GATE FAILED: ${run.gate.checks.find((c) => !c.pass)?.reasons[0] ?? ''}`;

/** A gated run's own section: its checks instead of its steps. */
function gateLines(run) {
  const lines = [
    `### ${run.title} (\`${run.lesson}\`), Premium: gated`,
    '',
    '| Check | What it checks | Result |',
    '| --- | --- | --- |',
  ];
  for (const check of run.gate.checks) {
    const result = check.pass
      ? 'pass'
      : check.knownFailure
        ? 'FAIL (known)'
        : 'FAIL';
    lines.push(
      `| \`${check.id}\` | ${cell(check.describe)} | ${result} (${seconds(check.ms)}) |`,
    );
  }
  lines.push('');
  for (const check of run.gate.checks) {
    for (const reason of check.reasons) {
      lines.push(`- **${check.id}** fails: ${md(reason)}`);
    }
    if (check.knownFailure) {
      lines.push(
        `- **${check.id}** is a known failure: ${md(check.knownFailure.why)}`,
      );
    }
    for (const note of check.notes) {
      lines.push(`- **${check.id}** note: ${md(note)}`);
    }
  }
  lines.push('');
  return lines;
}

async function summaryMarkdown(report) {
  const rates = [
    ...new Set(report.runs.map((r) => r.sampleRate).filter(Boolean)),
  ];
  const { totals, known, verdict } = report;
  const lines = [
    '# Studio lesson walkthrough',
    '',
    `Every lesson in \`src/daw/components/Tutorial/tutorials.ts\`, step by step, as the editor behaves today (milestone 1.0 baseline: problems are recorded, not fixed). Written by \`scripts/studio-perf/lessons.mjs\` on ${report.date} at commit \`${report.git.commit}\` (${report.git.branch}${report.git.dirty ? ', with uncommitted changes under src' : ''}), against ${report.base}, in Chrome ${report.browser} (GPU: ${report.gpu}${rates.length ? `, audio at ${rates.join(' / ')} Hz` : ''}), as ${report.personas.map((p) => PERSONA_TEXT[p]).join(' and as ')}.`,
    '',
    "A step passes when its anchor (the first id of its `target` list that is in the DOM) is on screen, inside the window, not clipped and not covered, when its driver can do what the step asks, and when the store's `tutorialStepIndex` then advances. The JSON report beside this file has every measurement; shots/ has a screenshot of each failing step.",
    '',
    'Driver: `click` is a real click (or menu pick) on or in the anchor, `select` an option picked in a `<select>`, `store` an action on the editor or synth store standing in for a drag, `next` the coach card’s Next button, `none` nothing (the step’s own preconditions satisfy it). Advanced: the time from the driver’s last action to the next step; a validated step waits 950 ms for its confetti first.',
    '',
    ...(totals.gated
      ? [
          "For the free student a Premium lesson (`requiresPremium` in `tutorialCatalog.ts`, the lessons with steps in Prism) is not walked: its gate is checked instead (owner decision 8), from its tile on the Production tab and from a `?tutorial=` link loaded over saved work, and a gate that holds is the lesson's pass.",
          '',
        ]
      : []),
    `**Result: ${verdict.pass ? 'pass' : 'FAIL'}.** ${totals.steps - totals.failed}/${totals.steps} steps pass (${totals.warned} with warnings), ${totals.completed}/${totals.walked} lessons complete${totals.gated ? `, ${totals.gatesHeld}/${totals.gated} Premium lessons gated for the free student` : ''}${totals.errors ? `, ${totals.errors} stopped with an error` : ''}. ${known.known.length} failing step(s) are known (KNOWN_FAILURES in \`scripts/studio-perf/lessonDrivers.mjs\`, ${known.listed} entries).${verdict.why.length ? ` Failed because: ${verdict.why.join('; ')}.` : ''}`,
    '',
  ];
  if (known.unexpected.length) {
    lines.push(
      `Failing and not in KNOWN_FAILURES: ${known.unexpected.map((k) => `\`${k}\``).join(', ')}. Fix them, or list each with its audit finding.`,
      '',
    );
  }
  if (known.fixed.length) {
    lines.push(
      `In KNOWN_FAILURES but passing in this run (take them off the list once a full run agrees): ${known.fixed.map((k) => `\`${k}\``).join(', ')}.`,
      '',
    );
  }
  if (report.baseline) {
    const { regressions, fixed, file } = report.baseline;
    const items = (list) =>
      list.map((r) => `\`${r.key}\` ${md(r.change)}`).join('; ');
    lines.push(
      `Compared with \`${file}\`: ${regressions.length} regression(s)${regressions.length ? ` (${items(regressions)})` : ''}; ${fixed.length} improvement(s)${fixed.length ? ` (${items(fixed)})` : ''}.`,
      '',
    );
  }
  for (const profile of report.profiles) {
    const control = report.idleWithoutLesson?.[profile.name];
    for (const persona of report.personas) {
      const runs = report.runs.filter(
        (r) => r.profile === profile.name && personaOf(r) === persona,
      );
      if (!runs.length) continue;
      lines.push(
        `## ${profile.name} (${profile.viewport.width}×${profile.viewport.height}, ${profile.cpuThrottle}× CPU), ${persona}`,
        '',
      );
      if (control && control.persona === persona) {
        lines.push(
          `Idle for ${control.seconds ?? '?'} s in the same empty editor without a lesson, once quiet: ${idleText(control)}. The table's idle column is the same measure with the lesson open on step 1.`,
          '',
        );
      }
      lines.push(
        '| Lesson | Steps | Pass | Fail | Completed | Idle on step 1 | Time |',
        '| --- | --- | --- | --- | --- | --- | --- |',
      );
      for (const run of runs) {
        // A gated run counts its gate checks in the step columns.
        const items = run.gate ? run.gate.checks : run.steps;
        const failed = items.filter((s) => !s.pass).length;
        const completed = run.error
          ? `error: ${run.error}`
          : run.gate
            ? gateCell(run)
            : run.completed
              ? 'yes'
              : 'no';
        lines.push(
          `| \`${run.lesson}\` | ${run.gate ? `${items.length} gate checks` : items.length} | ${items.length - failed} | ${failed} | ${cell(completed)} | ${cell(idleText(run.idle))} | ${seconds(run.ms.total)} |`,
        );
      }
      lines.push('');
      // Console errors once per message, with the lessons that logged it.
      const errors = new Map();
      for (const run of runs) {
        for (const sig of run.errorSignatures) {
          errors.set(sig, [...(errors.get(sig) ?? []), run.lesson]);
        }
      }
      if (errors.size) {
        lines.push('| Console or page error | Lessons |', '| --- | --- |');
        for (const [sig, lessons] of errors) {
          const where =
            lessons.length === runs.length
              ? `all ${runs.length}`
              : lessons.map((l) => `\`${l}\``).join(', ');
          lines.push(`| ${cell(sig)} | ${where} |`);
        }
        lines.push('');
      }
      for (const run of runs) {
        if (run.gate) {
          lines.push(...gateLines(run));
          continue;
        }
        lines.push(
          `### ${run.title} (\`${run.lesson}\`)`,
          '',
          '| # | Step | Anchor | Driver | Advanced | Result |',
          '| --- | --- | --- | --- | --- | --- |',
        );
        for (const step of run.steps) {
          const how =
            step.driver?.how ?? (step.advancedOnArrival ? 'none' : '');
          lines.push(
            `| ${step.index + 1} | \`${step.id}\` | ${cell(anchorCell(step))} | ${cell(how)} | ${cell(advanceCell(step))} | ${resultCell(step)} |`,
          );
        }
        lines.push('');
        for (const step of run.steps) {
          const related = step.driver?.related?.length
            ? ` (see ${step.driver.related.join(', ')})`
            : '';
          for (const reason of step.reasons) {
            lines.push(`- **${step.id}** fails: ${md(reason)}${related}`);
          }
          if (step.knownFailure) {
            lines.push(
              `- **${step.id}** is a known failure: ${md(step.knownFailure.why)}`,
            );
          }
          for (const warning of step.warnings) {
            lines.push(`- **${step.id}** warning: ${md(warning)}`);
          }
          for (const note of step.notes) {
            lines.push(`- **${step.id}** note: ${md(note)}`);
          }
          if (step.recoveredBy) {
            lines.push(`- **${step.id}**: went on through ${step.recoveredBy}`);
          }
        }
        if (run.error) lines.push(`- the lesson stopped: ${md(run.error)}`);
        lines.push('');
      }
    }
  }
  return prettier.format(lines.join('\n'), { parser: 'markdown' });
}

// ── Main ────────────────────────────────────────────────────────────────

/** Runs the walkthrough and returns its report (report.verdict says pass or fail). */
export async function runLessons(argv) {
  return withStudio(
    'lessons',
    async ({ base, browser, args, outDir }) => {
      const profiles = profilesFrom(args);
      const personas = personasFrom(args);
      // check.mjs's --baseline is a switch, so parseArgs lets a bare one by.
      if (args.baseline === 'true' || args.baseline === '') {
        throw new Error(
          '--baseline takes an earlier report.json (write --baseline=path)',
        );
      }
      const all = await readLessons(browser, base);
      const wanted = args.lesson ? args.lesson.split(',') : null;
      const unknown = (wanted ?? []).filter(
        (id) => !all.some((l) => l.id === id),
      );
      if (unknown.length) {
        throw new Error(
          `unknown lesson ${unknown.join(', ')}; the lessons are ${all.map((l) => l.id).join(', ')}`,
        );
      }
      const lessons = wanted ? all.filter((l) => wanted.includes(l.id)) : all;
      const idleSeconds = Number(args['idle-seconds'] ?? 3);
      // Screenshots from an earlier run would read as this run's failures.
      rmSync(join(outDir, 'shots'), { recursive: true, force: true });
      const runs = [];
      const idleWithout = {};
      for (const profile of profiles) {
        for (const persona of personas) {
          // The overlay idles the same for both personas: measure it once.
          const idle = persona === personas[0] ? idleSeconds : 0;
          if (idle > 0) {
            idleWithout[profile] = await idleWithoutLesson(
              browser,
              base,
              profile,
              persona,
              idle,
            );
          }
          for (const lesson of lessons) {
            const lessonEnv = {
              browser,
              base,
              profile,
              persona,
              lesson,
              outDir,
              shots: args.shots === undefined || flag(args.shots),
              idleSeconds: idle,
              stepTimeout: Number(args['step-timeout'] ?? 15) * 1000,
            };
            // The free student meets a Premium lesson's gate, not its steps.
            runs.push(
              persona === 'free' && lesson.requiresPremium
                ? await runGatedLesson(lessonEnv)
                : await runLesson(lessonEnv),
            );
          }
        }
      }
      const report = {
        check: 'lessons',
        date: new Date().toISOString(),
        base,
        personas,
        git: gitInfo(),
        browser: browser.version(),
        gpu:
          args.gpu ?? (process.platform === 'darwin' ? 'metal' : 'swiftshader'),
        profiles: profiles.map((name) => ({ name, ...PROFILES[name] })),
        lessons: lessons.map((l) => ({
          id: l.id,
          title: l.title,
          requiresPremium: l.requiresPremium,
          steps: l.steps.map((s) => ({
            id: s.id,
            targets: s.targets,
            requires: s.requires,
            detection: s.detection,
          })),
        })),
        totals: totalsOf(runs),
        known: checkKnown(runs),
        verdict: null,
        idleWithoutLesson: idleWithout,
        runs,
      };
      if (args.baseline) {
        report.baseline = compareWithBaseline(report, resolve(args.baseline));
      }
      report.verdict = verdictOf(report, flag(args.strict));
      const jsonFile = writeJson(outDir, 'report', report);
      const mdFile = join(outDir, 'summary.md');
      writeFileSync(mdFile, await summaryMarkdown(report));
      const { totals, verdict } = report;
      console.log(
        `\n${totals.steps - totals.failed}/${totals.steps} steps pass (${totals.warned} with warnings, ${report.known.known.length} failing ones known), ${totals.completed}/${totals.walked} lessons complete${totals.gated ? `, ${totals.gatesHeld}/${totals.gated} Premium lessons gated for the free student` : ''}.\n${relative(ROOT, jsonFile)}\n${relative(ROOT, mdFile)}`,
      );
      if (report.known.fixed.length) {
        console.log(
          `Known failures that pass now: ${report.known.fixed.join(', ')}`,
        );
      }
      console.log(
        verdict.pass
          ? 'Result: pass'
          : `Result: FAIL\n- ${verdict.why.join('\n- ')}`,
      );
      return report;
    },
    argv,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const report = await runLessons(process.argv.slice(2));
  if (!report.verdict.pass) process.exitCode = 1;
}
