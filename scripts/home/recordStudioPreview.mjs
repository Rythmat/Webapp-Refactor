/* eslint-env node */
/**
 * Records the Home dashboard's Studio preview: sixteen bars of a song the
 * Studio's own prompt box writes, playing on a loop, filmed still and in
 * high resolution, cut so the video loops perfectly (owner, 2026-10-24).
 *
 * Before the camera rolls (none of it is filmed): a blank project, the loop
 * set on bars 1–16 (the prompt box writes its part over the loop), the
 * prompt box asked for a band on the Indie 2 groove at 100 BPM (drums, bass
 * and chords), the prompt box folded away, the dock opened, the pointer
 * parked off the page. Then it plays, cued by the playhead (SCENES): bars
 * 1–4 on the drums' Instrument dock, bars 5–8 on the chords', bars 9–16 in
 * the Mix view, and back to the drums as the loop comes round. The prompt
 * box stays folded the whole take. The first loop plays off camera, while
 * the sounds and panels settle; the next one is filmed.
 *
 * The perfect loop: every captured frame is matched to the playhead tick it
 * was drawn at (the editor's playhead, read each animation frame), and
 * the video is built from one settled loop, a frame for each 1/30 s of the
 * sixteen bars, from the downbeat of bar 1 to the frame before it comes round
 * again. Its last frame leads into its first as the Studio's own next frame
 * would, so there's no crossfade and no seam.
 *
 *   node scripts/home/recordStudioPreview.mjs [--reuse=http://localhost:5263]
 *
 * Rerun it whenever the Studio's look changes, so Home shows the Studio as
 * it is. Takes the studio-perf harness options (--reuse, --port, --gpu,
 * --headed); audio goes to Chrome's fake output unless --fake-audio=false, so
 * a recording never plays through the speakers. A reused server must run
 * with VITE_DEV_AUTH_BYPASS=1. --debug keeps a screenshot of the shot.
 *
 * Frames come from the DevTools screencast, captured at 2x, and are encoded
 * to src/components/ClassroomLayout/home/media/studio-preview.mp4 (H.264,
 * 2560×1440) plus a .jpg poster (a second in), which the card
 * imports.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  guardPartyKit,
  openEditor,
  ROOT,
  startAudio,
  withStudio,
} from '../studio-perf/harness.mjs';

/**
 * What the prompt box is asked for: the band the loop plays. A groove it
 * names is the one the drums play (promptGroove); a tempo it names is the
 * song's, and 100 BPM makes 16 bars 38.4 s, a whole 1152 frames at 30 fps.
 * The key and chords are the prompt box's pick, new each take.
 */
const PROMPT =
  'Start the song with Pop drums, bass and chords on Indie 2 at 100 BPM';
/** The loop: bars 1–16, at the editor's 480 ticks a quarter, in 4/4. */
const PPQ = 480;
const BARS = 16;
const LOOP_TICKS = BARS * 4 * PPQ;
/**
 * A 16:9 page, captured at 2x (2880×1620 frames) and delivered at
 * 2560×1440: sharp on a retina screen at any size the card is shown.
 */
const VIEWPORT = { width: 1440, height: 810 };
const SCALE = 2;
const OUT = { width: 2560, height: 1440 };
const FPS = 30;
/**
 * What the shot shows, by the bar it starts on (bars count from 1 in the
 * Studio, from 0 here): the drums, the chords, then the mixer (owner,
 * 2026-10-24).
 */
const SCENES = [
  // Bars 1–4: the drums' Instrument dock (the kit lights up with the beat).
  { from: 0, view: 'arrange', track: 0 },
  // Bars 5–8: the chords' Instrument dock.
  { from: 4, view: 'arrange', track: 2 },
  // Bars 9–16: the Mix view (its id is 'studio'; 'Mix' is its label).
  { from: 8, view: 'studio' },
];

/** Filming starts this long before the first loop comes round. */
const LEAD_IN_S = 2;
const DEBUG = process.argv.includes('--debug');

// Imported by the card, so Vite gives every recording a hashed URL.
const OUT_DIR = join(ROOT, 'src/components/ClassroomLayout/home/media');
const FRAMES = join(tmpdir(), 'ma-home-studio-preview');

const argv = process.argv.slice(2).filter((a) => a !== '--debug');
if (!argv.some((a) => a.startsWith('--fake-audio'))) {
  argv.push('--fake-audio=true');
}
if (!argv.some((a) => a.startsWith('--out'))) argv.push(`--out=${FRAMES}`);

const ffmpeg = (args) =>
  execFileSync(
    'ffmpeg',
    ['-hide_banner', '-loglevel', 'error', '-y', ...args],
    {
      stdio: 'inherit',
    },
  );

await withStudio(
  'home-studio-preview',
  async ({ base, browser }) => {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: SCALE,
    });
    await guardPartyKit(context);
    // No hot updates mid-take: another session editing files would reload
    // the Studio under the camera. The HMR socket is held open and silent
    // (a closed one makes Vite's client poll the server and reload).
    await context.routeWebSocket(/\/\?token=/, () => {});
    const page = await context.newPage();
    await openEditor(page, base, '?new=1');
    // Toasts (unsaved-work notices and the like) are not part of the Studio.
    await page.addStyleTag({
      content: '[data-sonner-toaster]{display:none!important}',
    });
    await startAudio(page);

    // ── Before the camera: the prompt box writes the band ──────────────
    // Over the loop: the prompt box's part fills the loop while it's on.
    await page.evaluate((end) => {
      const s = window.__MA_STORE__.getState();
      s.setLoopRange(0, end);
      s.setLoopEnabled(true);
    }, LOOP_TICKS);
    const input = page.getByTestId('prompt-input');
    await input.fill(PROMPT);
    await input.press('Enter');
    await page.waitForFunction(
      () =>
        window.__MA_STORE__.getState().tracks.length >= 3 &&
        !document.querySelector('[role="status"][data-testid^="prompt-"]'),
      null,
      { timeout: 60_000 },
    );
    const song = await page.evaluate(() => {
      const s = window.__MA_STORE__.getState();
      return {
        bpm: s.bpm,
        tracks: s.tracks.map((t) => t.name),
        chords: s.chordRegions.map((r) => r.noteName),
      };
    });
    console.log(
      `prompt box: ${song.tracks.join(', ')} at ${song.bpm} BPM, chords ${song.chords.join(' ')}`,
    );

    if (song.bpm !== 100) {
      console.warn(`the prompt box set ${song.bpm} BPM, not 100`);
    }
    // The shot: the loop on bars 1–16, the prompt box folded away (its
    // suggestions turn on their own clock, not the song's), the dock open
    // on the drums, the pointer off the page, nothing focused.
    await page.evaluate((end) => {
      const s = window.__MA_STORE__.getState();
      s.setLoopRange(0, end);
      s.setLoopEnabled(true);
      s.setPosition(0);
      s.setLibraryOpen?.(false);
    }, LOOP_TICKS);
    await page
      .getByRole('button', { name: 'Fold the prompt box away' })
      .click();
    const drums = page.getByRole('button', { name: /, track 1$/ }).first();
    await drums.click();
    const dock = page.getByTestId('dock-toggle');
    if ((await dock.getAttribute('aria-label')) !== 'Close the dock') {
      await dock.click();
    }
    // The Instrument tab: the drums' kit, then the chords' instrument.
    const instrumentTab = page.getByTestId('dock-tab-controls');
    if ((await instrumentTab.getAttribute('aria-pressed')) !== 'true') {
      await instrumentTab.click();
    }
    await page.getByTestId('drum-kit').waitFor({ timeout: 20_000 });
    await showChordsOctaves(page);
    // All sixteen bars across the window, so the playhead never leaves it
    // (and the view never pages).
    await page
      .getByRole('button', { name: 'Fit the song', exact: true })
      .first()
      .click();
    await page.mouse.move(VIEWPORT.width / 2, VIEWPORT.height + 40);
    await page.evaluate(() => {
      document.activeElement?.blur?.();
    });
    // Every sound loaded before it plays (a SoundFont's first load is slow).
    await page.waitForTimeout(3000);

    // ── The playhead's tick for every frame the page paints, and the ────
    // scenes it cues (SCENES): the drums' dock, the chords', then Mix; as
    // the loop comes round, back to the drums, so the end leads into the
    // start. Cued by the playhead, so every loop plays them the same.
    await page.evaluate(
      async ({ bar, scenes }) => {
        // The editor's own playhead (DawApp exposes its playheadClock in
        // dev): an import of the module from here would be a copy of its
        // own, never started, reading the parked playhead.
        const playhead = window.__MA_PLAYHEAD__;
        const store = window.__MA_STORE__;
        const trackIds = store.getState().tracks.map((t) => t.id);
        const sceneAt = (tick) =>
          scenes.findLast((scene) => tick >= scene.from * bar) ?? scenes[0];
        let shown = null;
        const show = (scene) => {
          if (scene === shown) return;
          const s = store.getState();
          if (s.currentView !== scene.view) {
            s.setCurrentView(scene.view);
            // Each view opens the Inspector as it was last there: shut.
            store.getState().setLibraryOpen(false);
          }
          if (scene.track !== undefined) {
            store.getState().setSelectedTrackId(trackIds[scene.track]);
          }
          shown = scene;
        };
        const log = [];
        window.__PREVIEW_TICKS__ = log;
        const each = () => {
          const tick = playhead.tick();
          log.push([performance.timeOrigin + performance.now(), tick]);
          show(sceneAt(tick));
          window.__PREVIEW_RAF__ = requestAnimationFrame(each);
        };
        each();
      },
      { bar: 4 * PPQ, scenes: SCENES },
    );

    // ── Capture ─────────────────────────────────────────────────────────
    rmSync(join(FRAMES, 'frames'), { recursive: true, force: true });
    mkdirSync(join(FRAMES, 'frames'), { recursive: true });
    const frames = [];
    const cdp = await context.newCDPSession(page);
    cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
      const file = join(
        FRAMES,
        'frames',
        `${String(frames.length).padStart(5, '0')}.jpg`,
      );
      writeFileSync(file, Buffer.from(data, 'base64'));
      // The swap time, in ms since the epoch (the page's clock).
      frames.push({ file, t: metadata.timestamp * 1000 });
      cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    });
    // Space plays (the editor's shortcut). The first loop plays off camera,
    // while the sounds settle; filming starts just before it comes round
    // and stops just after the next one has.
    const loopSeconds = (BARS * 4 * 60) / song.bpm;
    await page.keyboard.press('Space');
    await page.waitForTimeout((loopSeconds - LEAD_IN_S) * 1000);
    await cdp.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 92,
      maxWidth: VIEWPORT.width * SCALE,
      maxHeight: VIEWPORT.height * SCALE,
    });
    await page.waitForTimeout((loopSeconds + 2 * LEAD_IN_S) * 1000);
    await cdp.send('Page.stopScreencast');
    if (DEBUG) {
      await page.screenshot({ path: join(FRAMES, 'shot.png') });
      console.log(`debug: the shot at ${join(FRAMES, 'shot.png')}`);
    }
    const ticks = await page.evaluate(() => {
      cancelAnimationFrame(window.__PREVIEW_RAF__);
      return window.__PREVIEW_TICKS__;
    });
    await page.keyboard.press('Space');
    await context.close();

    // ── One settled loop, a frame for each 1/30 s of it ─────────────────
    // A frame shows the tick of the last animation frame before its swap.
    let j = 0;
    const timed = frames
      .map((f) => {
        while (j + 1 < ticks.length && ticks[j + 1][0] <= f.t) j++;
        return ticks[j][0] <= f.t ? { ...f, tick: ticks[j][1] } : null;
      })
      .filter(Boolean);
    // The loop comes round where the tick falls back.
    const wraps = [];
    for (let i = 1; i < timed.length; i++) {
      if (timed[i].tick < timed[i - 1].tick - LOOP_TICKS / 2) wraps.push(i);
    }
    if (wraps.length < 2) {
      throw new Error(
        `only ${wraps.length} loop wraps were seen in ${timed.length} frames`,
      );
    }
    // The loop filmed: from one wrap to the next.
    const from = wraps[0];
    const to = wraps[1];
    const loop = timed.slice(from, to);
    const rate = loop.length / ((loop.at(-1).t - loop[0].t) / 1000);
    console.log(
      `captured ${frames.length} frames (${rate.toFixed(1)} fps in the loop used), ${wraps.length} wraps`,
    );
    const count = Math.round(loopSeconds * FPS);
    rmSync(join(FRAMES, 'loop'), { recursive: true, force: true });
    mkdirSync(join(FRAMES, 'loop'), { recursive: true });
    let k0 = 0;
    for (let k = 0; k < count; k++) {
      const want = (k / count) * LOOP_TICKS;
      // The nearest frame to that tick, searched forward (ticks rise).
      while (
        k0 + 1 < loop.length &&
        Math.abs(loop[k0 + 1].tick - want) <= Math.abs(loop[k0].tick - want)
      ) {
        k0++;
      }
      copyFileSync(
        loop[k0].file,
        join(FRAMES, 'loop', `${String(k).padStart(5, '0')}.jpg`),
      );
    }

    // ── Encode ──────────────────────────────────────────────────────────
    mkdirSync(OUT_DIR, { recursive: true });
    const mp4 = join(OUT_DIR, 'studio-preview.mp4');
    ffmpeg([
      ...['-framerate', String(count / loopSeconds)],
      ...['-i', join(FRAMES, 'loop', '%05d.jpg')],
      '-vf',
      `scale=${OUT.width}:${OUT.height}:flags=lanczos,format=yuv420p`,
      '-an',
      ...['-c:v', 'libx264', '-preset', 'slow', '-crf', '20'],
      ...['-profile:v', 'high', '-pix_fmt', 'yuv420p'],
      // A keyframe each second: clean loops and seeks.
      ...['-g', String(FPS)],
      ...['-movflags', '+faststart'],
      mp4,
    ]);
    // The poster: a second in, the drums' kit settled (the dock fades its
    // panel in as the loop comes round to it).
    ffmpeg([
      ...['-i', join(FRAMES, 'loop', `${String(FPS).padStart(5, '0')}.jpg`)],
      ...['-vf', `scale=${OUT.width}:${OUT.height}:flags=lanczos`],
      ...['-q:v', '3'],
      join(OUT_DIR, 'studio-preview.jpg'),
    ]);
    console.log(
      `studio preview: ${count} frames, ${loopSeconds.toFixed(2)} s (${BARS} bars at ${song.bpm} BPM) → src/components/ClassroomLayout/home/media/studio-preview.{mp4,jpg}`,
    );
  },
  argv,
);

/**
 * The chords' dock piano on the octaves the chords play (owner,
 * 2026-10-24). The dock's piano shows the computer keyboard's octave (C3
 * up), and the prompt box voices its chords lower (C2–D3, say), so most of
 * them would light off the left edge. Off camera: the chords' dock, its
 * Octave stepped until the piano starts on the C at or under the lowest
 * chord note, then back to the drums.
 */
async function showChordsOctaves(page) {
  const chords = SCENES.find((scene) => scene.track > 0)?.track ?? 2;
  const notes = await page.evaluate((index) => {
    const tracks = window.__MA_STORE__.getState().tracks;
    const pitches = tracks[index].midiClips.flatMap((c) =>
      c.events.map((e) => e.note),
    );
    return {
      id: tracks[index].id,
      drums: tracks[0].id,
      low: Math.min(...pitches),
      high: Math.max(...pitches),
    };
  }, chords);
  const select = (id) =>
    page.evaluate(
      (id) => window.__MA_STORE__.getState().setSelectedTrackId(id),
      id,
    );
  await select(notes.id);
  const keyboard = page.getByTestId('dock-keyboard');
  await keyboard.waitFor({ timeout: 20_000 });
  /** The piano's first and last notes, read from its C labels ("C3"). */
  const range = () =>
    keyboard.evaluate((el) => {
      const octaves = [...el.querySelectorAll('*')]
        .filter((n) => n.children.length === 0)
        .map((n) => /^C(-?\d+)$/.exec(n.textContent?.trim() ?? '')?.[1])
        .filter((o) => o !== undefined)
        .map(Number);
      const first = (Math.min(...octaves) + 1) * 12;
      const last = (Math.max(...octaves) + 1) * 12;
      return { first, last };
    });
  for (let i = 0; i < 8; i++) {
    const { first } = await range();
    if (first > notes.low) {
      await keyboard.getByRole('button', { name: 'Show lower keys' }).click();
    } else if (first + 12 <= notes.low) {
      await keyboard.getByRole('button', { name: 'Show higher keys' }).click();
    } else break;
  }
  const { first, last } = await range();
  console.log(
    `chords' piano: MIDI ${first}–${last}, the chords ${notes.low}–${notes.high}`,
  );
  if (first > notes.low || last < notes.high) {
    console.warn("the chords' piano doesn't show every chord note");
  }
  await select(notes.drums);
  await page.getByTestId('drum-kit').waitFor({ timeout: 20_000 });
}
