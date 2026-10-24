/* eslint-env node */
/**
 * Records the Home dashboard's Studio preview loop: the real Studio editor,
 * playing the "Midnight Groove" demo, worked by a visible cursor and filmed
 * by a virtual camera that tilts and pushes in on each feature as it is used
 * (studioPreviewDirector.mjs):
 *
 *   transport and arrange → Keys: add an EQ, shape two bands → Drums: the kit
 *   lighting up with the MIDI → Lead: edit Oscillator 1 in the Synth → a new
 *   audio track: pick an amp, turn its knobs → Master: draw volume
 *   automation → Mix: the meters, the effects and sends
 *
 * as a short muted loop for
 * src/components/ClassroomLayout/home/StudioPreviewCard.tsx.
 *
 *   node scripts/home/recordStudioPreview.mjs [--reuse=http://localhost:5263]
 *
 * Rerun it whenever the Studio's look changes, so Home shows the Studio as
 * it is. Takes the studio-perf harness options (--reuse, --port, --gpu,
 * --headed); audio goes to Chrome's fake output unless --fake-audio=false, so
 * a recording never plays through the speakers. A reused server must run
 * with VITE_DEV_AUTH_BYPASS=1.
 *
 * Frames come from the DevTools screencast (sharper than Playwright's
 * recordVideo), are stitched at their real timing and encoded to
 * src/components/ClassroomLayout/home/media/studio-preview.mp4 (H.264) plus
 * a .jpg poster, which the card imports.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  guardPartyKit,
  openEditor,
  ROOT,
  startAudio,
  withStudio,
} from '../studio-perf/harness.mjs';
import { director } from './studioPreviewDirector.mjs';

const DEMO = 'demo-midnight-groove';
/**
 * The card's preview is 16:9. Captured at 2x (2560×1440 frames), so text
 * stays sharp through the camera's push-ins (the page re-renders at each
 * zoom; the capture scale is what limits sharpness), and delivered at
 * 1280×720, about 1:1 with the card on a retina screen and ~6 MB a minute
 * and a quarter, light enough for school Wi-Fi.
 */
const VIEWPORT = { width: 1280, height: 720 };
const SCALE = 2;
const OUT_WIDTH = 1280;
/** --debug: a screenshot at each scene in FRAMES/debug, to tune the take. */
const DEBUG = process.argv.includes('--debug');
/** --dry: runs the take (scene timings, --debug shots) without capturing. */
const DRY = process.argv.includes('--dry');
/** The loop's seam: the tail crossfades into the head. */
const XFADE_S = 0.6;

// Imported by the card, so Vite gives every recording a hashed URL.
const OUT_DIR = join(ROOT, 'src/components/ClassroomLayout/home/media');
const FRAMES = join(tmpdir(), 'ma-home-studio-preview');

const argv = process.argv
  .slice(2)
  .filter((a) => a !== '--debug' && a !== '--dry');
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
    await openEditor(page, base, `?demo=${DEMO}`);
    // Toasts (unsaved-work notices and the like) are not part of the Studio.
    await page.addStyleTag({
      content: '[data-sonner-toaster]{display:none!important}',
    });
    await startAudio(page);
    // The arrange view alone, so every track fits the 16:9 frame.
    const closeDock = async () => {
      const dock = page.getByTestId('dock-toggle');
      if ((await dock.getAttribute('aria-label')) === 'Close the dock') {
        await dock.click();
      }
    };
    // Keys starts the take with an EQ already on its channel, and its
    // SoundFont loaded (a first open can fail; it opens on a retry).
    await page
      .getByRole('button', { name: 'Keys, track 1', exact: true })
      .click();
    await page.getByTestId('dock-tab-fx').click();
    await page.getByTestId('fx-add-slot').first().click();
    await page
      .getByRole('dialog')
      .getByPlaceholder('Search effects')
      .fill('EQ');
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Add EQ', exact: true })
      .click();
    await page.getByText('+12').first().waitFor();
    await page.getByTestId('dock-tab-controls').click();
    const piano = page.getByRole('button', {
      name: 'Electric Piano 1',
      exact: true,
    });
    for (let i = 0; i < 4; i++) {
      if (await piano.isVisible()) break;
      const retry = page.getByRole('button', {
        name: 'Try again',
        exact: true,
      });
      if (await retry.isVisible()) await retry.click();
      await page.waitForTimeout(2500);
    }
    await piano.waitFor({ timeout: 20_000 });
    await closeDock();
    await page.getByRole('button', { name: 'Loop', exact: true }).click();
    await page.mouse.move(VIEWPORT.width / 2, VIEWPORT.height + 40);

    // Camera moves run 1.5x their written length: slow, unhurried zooms.
    const d = director(page, VIEWPORT, { pace: 1.5 });
    await d.install();
    const { width: VW, height: VH } = VIEWPORT;
    /** The opening and closing shot: wide, the screen tilted in space. */
    const WIDE = { cx: VW / 2, cy: VH / 2, s: 0.9, rx: 5, ry: -8 };
    const FLAT = { cx: VW / 2, cy: VH / 2, s: 1 };
    await d.set(WIDE);

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
      frames.push({ file, t: metadata.timestamp });
      cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    });
    // Space plays (the editor's shortcut). Playing first keeps the
    // screencast's frames flowing (it only sends one when the page changes)
    // before the take starts.
    await page.keyboard.press('Space');
    if (!DRY)
      await cdp.send('Page.startScreencast', {
        format: 'jpeg',
        quality: 97,
        maxWidth: VIEWPORT.width * SCALE,
        maxHeight: VIEWPORT.height * SCALE,
      });
    for (let i = 0; i < 60 && !DRY && frames.length < 10; i++) {
      await page.waitForTimeout(50);
    }
    const t0 = Date.now() / 1000;
    try {
      await film(page, d, { WIDE, FLAT });
    } catch (error) {
      // What the take saw when a scene failed.
      await page.screenshot({ path: join(FRAMES, 'failed.png') });
      console.error(`take failed; screen at ${join(FRAMES, 'failed.png')}`);
      throw error;
    }
    const endT = Date.now() / 1000;
    if (DRY) return;
    await cdp.send('Page.stopScreencast');
    await page.keyboard.press('Space');
    await context.close();

    if (frames.length < 60) {
      throw new Error(`only ${frames.length} frames were captured`);
    }

    // ── Stitch at real timing, then encode ─────────────────────────────
    // From the camera's start; the frame showing then opens the video.
    const firstIn = frames.findIndex((f) => f.t >= t0);
    const kept = frames.slice(Math.max(0, firstIn - 1));
    kept[0] = { ...kept[0], t: t0 };
    const lastT = Math.max(
      kept.at(-1).t + 1 / 30,
      Math.min(endT, kept.at(-1).t + 0.5),
    );
    const list = kept
      .map((f, i) => {
        const next = i + 1 < kept.length ? kept[i + 1].t : lastT;
        return `file '${f.file}'\nduration ${Math.max(next - f.t, 1 / 120).toFixed(4)}`;
      })
      .join('\n');
    const listFile = join(FRAMES, 'frames.txt');
    // The concat demuxer needs the last file repeated to honor its duration.
    writeFileSync(listFile, `${list}\nfile '${kept.at(-1).file}'\n`);

    mkdirSync(OUT_DIR, { recursive: true });
    // 1. The take at 30 fps, near-lossless.
    const raw = join(FRAMES, 'raw.mp4');
    ffmpeg([
      ...['-f', 'concat', '-safe', '0', '-i', listFile],
      '-vf',
      `fps=30,scale=${OUT_WIDTH}:-2:flags=lanczos,format=yuv420p`,
      '-an',
      ...['-c:v', 'libx264', '-preset', 'fast', '-crf', '8'],
      raw,
    ]);
    // 2. The loop: the tail crossfades into the head, so the end flows into
    // the start. H.264 only: it plays in every browser the app supports, and
    // Chrome's decoder rejected the VP9 WebM this produced.
    const len = Number(
      execFileSync('ffprobe', [
        ...['-v', 'error', '-show_entries', 'format=duration'],
        ...['-of', 'default=nw=1:nk=1', raw],
      ]),
    );
    const x = XFADE_S;
    ffmpeg([
      '-i',
      raw,
      '-filter_complex',
      [
        '[0]split=3[a][b][c]',
        `[a]trim=${x}:${len - x},setpts=PTS-STARTPTS[mid]`,
        `[b]trim=${len - x}:${len},setpts=PTS-STARTPTS[tail]`,
        `[c]trim=0:${x},setpts=PTS-STARTPTS[head]`,
        `[tail][head]xfade=transition=fade:duration=${x}:offset=0[seam]`,
        '[mid][seam]concat=n=2:v=1[out]',
      ].join(';'),
      ...['-map', '[out]', '-an'],
      // A keyframe every 2 s: clean loops and seeks.
      ...['-g', '60', '-c:v', 'libx264', '-preset', 'slow', '-crf', '23'],
      ...['-profile:v', 'high', '-pix_fmt', 'yuv420p'],
      ...['-movflags', '+faststart'],
      join(OUT_DIR, 'studio-preview.mp4'),
    ]);
    // The poster: a frame a few seconds in, inside the arrange view.
    ffmpeg([
      '-ss',
      '4',
      '-i',
      join(OUT_DIR, 'studio-preview.mp4'),
      '-frames:v',
      '1',
      '-q:v',
      '3',
      join(OUT_DIR, 'studio-preview.jpg'),
    ]);
    const span = (lastT - t0).toFixed(1);
    console.log(
      `studio preview: ${kept.length} frames over ${span} s → src/components/ClassroomLayout/home/media/studio-preview.{mp4,jpg}`,
    );
  },
  argv,
);

/**
 * The take. Each scene frames a feature while the cursor travels to it (the
 * camera and the hand move together), then works it with real clicks, typing
 * and drags. Clicks land with the camera level, so the pointer hits where it
 * is drawn. The camera is restrained: moves ease in and out and swing
 * through a slight tilt (a few degrees) on the way, hands-off shots hold a
 * gentle angle and keep drifting slowly in the direction they lean, and the
 * zoom stays under about 2x.
 */
async function film(page, d, { WIDE, FLAT }) {
  let shot = 0;
  const began = Date.now();
  let last = began;
  /** Logs each scene's length; --debug also screenshots the camera's view. */
  const mark = async (label) => {
    const now = Date.now();
    console.log(
      `scene ${label}: ${((now - last) / 1000).toFixed(1)} s (at ${((now - began) / 1000).toFixed(1)} s)`,
    );
    last = now;
    if (!DEBUG) return;
    mkdirSync(join(FRAMES, 'debug'), { recursive: true });
    const name = `${String(++shot).padStart(2, '0')}-${label}.jpg`;
    await page.screenshot({ path: join(FRAMES, 'debug', name), quality: 70 });
  };
  const track = (name, n) =>
    page.getByRole('button', { name: `${name}, track ${n}`, exact: true });
  const tab = (testId) => page.getByTestId(testId);
  /**
   * Opens a dock tab (already on screen) unless it is the one showing:
   * clicking the showing tab closes the dock.
   */
  const openTab = async (testId) => {
    const pressed = (await tab(testId).getAttribute('aria-pressed')) === 'true';
    const dockOpen =
      (await page.getByTestId('dock-toggle').getAttribute('aria-label')) ===
      'Close the dock';
    if (pressed && dockOpen) return;
    await d.click(tab(testId), { ms: 450 });
  };
  // Centred in the track list: the pinned Master section can cover a row
  // that the browser still counts as visible.
  const centre = (locator) =>
    locator.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  /** The left column: a track's header down to the dock's tabs. */
  const LEFT = { pad: 40, maxZoom: 1.6 };
  /**
   * A hands-off hold: the shot keeps breathing, a slow push of `zoom` that
   * leans a little further the way it already leans, never a freeze.
   */
  const drift = async (ms, { zoom = 1.025, rx = 0, ry = 0 } = {}) => {
    const p = await d.pose();
    await d.to({ ...p, s: p.s * zoom, rx: p.rx + rx, ry: p.ry + ry }, ms, {
      paced: false,
    });
  };

  // 1. Establish: wide → the whole Create page, the song playing.
  await d.to(FLAT, 1500);
  // 2. The transport, then across the arrange view with the playhead.
  // Play reads "Pause" while playing: it goes by its test id.
  const transport = [
    ...['Back to start', 'Record', 'Loop'].map((name) =>
      page.getByRole('button', { name, exact: true }),
    ),
    page.getByTestId('transport-play'),
  ];
  await d.frame(transport, { pad: 80, maxZoom: 1.9 }, 1300, { rx: 2, ry: 4 });
  await drift(900, { ry: 1 });
  await d.frame(
    page.locator('canvas').first(),
    { cropX: [0, 0.62], cropY: [0, 0.78], pad: 10 },
    1200,
    { rx: -2, ry: -4 },
  );
  await drift(1300, { zoom: 1.03, ry: -1 });
  await mark('arrange');

  // 3. Keys: change its sound in the Instrument dock, then shape the EQ
  // already on its channel: band 3 down, band 6 up.
  const keys = track('Keys', 1);
  await centre(keys);
  await d.go([keys, tab('dock-tab-controls')], LEFT, keys, {
    ms: 1100,
    swing: { rx: 2, ry: 3 },
  });
  await d.wait(250);
  await openTab('dock-tab-controls');
  await d.wait(500);
  const sound = (name) => page.getByRole('button', { name, exact: true });
  await d.go(
    [
      sound('Piano'),
      sound('Organ'),
      sound('Electric Piano 1'),
      tab('dock-tab-fx'),
    ],
    { pad: 30, maxZoom: 1.8 },
    sound('Organ'),
    { ms: 1000 },
  );
  await d.wait(450);
  await d.click(sound('Drawbar Organ'), { ms: 500 });
  await d.wait(900);
  await openTab('dock-tab-fx');
  await d.wait(450);
  const eqGraph = page.locator('svg').filter({ hasText: '+12' }).first();
  // A band's number label: its group's text grows a readout on hover.
  const band = (n) =>
    page
      .locator('svg g:has(circle) text')
      .filter({ hasText: new RegExp(`^${n}$`) })
      .first();
  await d.go(eqGraph, { pad: 24, maxZoom: 1.9 }, band(3), {
    ms: 1000,
    press: false,
  });
  const graph = await eqGraph.boundingBox();
  const b3 = await d.center(band(3));
  await d.drag(
    b3,
    { x: b3.x + graph.width * 0.03, y: b3.y + graph.height * 0.24 },
    900,
  );
  const b6 = await d.center(band(6));
  await d.drag(
    b6,
    { x: b6.x + graph.width * 0.04, y: b6.y - graph.height * 0.3 },
    900,
  );
  await d.wait(500);
  await mark('eq');

  // 4. Drums: the kit lighting up with the MIDI.
  const drums = track('Drums', 4);
  await centre(drums);
  await d.go([drums, tab('dock-tab-controls')], LEFT, drums, {
    ms: 1100,
    swing: { rx: -2, ry: -3 },
  });
  await d.wait(250);
  await openTab('dock-tab-controls');
  await d.wait(300);
  await Promise.all([
    d.frame(
      page.getByTestId('drum-kit'),
      { pad: 30, maxZoom: 1.9, free: true },
      1200,
      { rx: 3, ry: -6 },
    ),
    d.away(700),
  ]);
  if (DEBUG) {
    // How many pad flashes the shot catches (each is lit for 110 ms).
    const lit = await page.evaluate(async () => {
      let seen = 0;
      for (let i = 0; i < 40; i++) {
        seen += document.querySelectorAll('[data-lit]').length;
        await new Promise((r) => setTimeout(r, 50));
      }
      return seen;
    });
    console.log(`debug: ${lit} lit pads seen over 2 s`);
  }
  const kitShot = await d.pose();
  await drift(2400, { zoom: 1.04, rx: 1, ry: -2 });
  await mark('drums');

  // 5. Lead: Oscillator 1 in the Synth to Pwm, then sweep its Position.
  const lead = track('Lead', 3);
  await centre(lead);
  await d.go([lead, tab('dock-tab-controls')], LEFT, lead, {
    ms: 1100,
    swing: { rx: 2, ry: 3 },
  });
  await d.wait(300);
  await openTab('dock-tab-controls');
  const position = page.getByRole('slider', { name: 'Position' }).first();
  const warp = page.getByRole('slider', { name: 'Warp' }).first();
  const wavetable = page.getByRole('combobox', {
    name: 'Oscillator 1 wavetable',
    exact: true,
  });
  const osc1 = [
    page.getByText('Oscillator 1', { exact: true }),
    warp,
    wavetable,
  ];
  const OSC = { pad: 40, maxZoom: 1.9 };
  await d.go(osc1, OSC, wavetable, { ms: 1000, press: false });
  await d.wait(500);
  // The camera stays on Oscillator 1: its list opens beside it while zoomed.
  await d.press();
  await d.wait(600);
  await d.click(page.getByRole('option', { name: 'Pwm', exact: true }), {
    ms: 500,
  });
  await d.wait(400);
  const pos = await d.center(position);
  await d.drag(pos, { x: pos.x, y: pos.y - 100 }, 1500);
  await d.wait(600);
  await mark('synth');

  // 6. A new audio track: pick an amp, turn it up. The Add track menu only
  // opens with the camera flat (it never appears under the zoom).
  const addTrack = page.getByTestId('add-track-button');
  await centre(addTrack);
  await d.go(FLAT, null, addTrack, { ms: 1100, swing: { rx: -2, ry: -3 } });
  await d.wait(350);
  await d.click(page.locator('[data-tutorial-id="add-track-audio"]'), {
    ms: 450,
  });
  await d.wait(550);
  const ampSlot = page.getByText('Add amp or pitch correction');
  await d.go(ampSlot, { pad: 110, maxZoom: 1.8 }, ampSlot, { ms: 900 });
  await d.wait(450);
  const amps = page.getByRole('dialog');
  await d.go(
    amps,
    { pad: 16, maxZoom: 1.4 },
    amps.getByRole('button', { name: /Amber/ }).first(),
    { ms: 1000 },
  );
  await d.wait(500);
  // The amp's knobs have no roles: each sits 30 px above its label.
  const amp = page.getByTestId('audio-fx-card-nam-amp');
  const ampLabel = (name) => amp.getByText(name, { exact: true });
  const ampShot = await d.frameOf(amp, { pad: 24, maxZoom: 1.9 });
  const firstKnob = await d.aim(ampLabel('Input'), ampShot);
  await Promise.all([
    d.to(ampShot, 1000),
    d.glide(firstKnob.x, firstKnob.y - 30 * ampShot.s, 1500),
  ]);
  const knob = async (name) => {
    const label = await d.center(ampLabel(name));
    return { x: label.x, y: label.y - 30 * ampShot.s };
  };
  const inp = await knob('Input');
  await d.drag(inp, { x: inp.x, y: inp.y - 70 }, 1000);
  const tr = await knob('Treble');
  await d.drag(tr, { x: tr.x, y: tr.y - 60 }, 900);
  await d.wait(400);
  await mark('amp');

  // 7. Master: draw its volume automation.
  const master = page.getByRole('button', { name: 'Master', exact: true });
  await d.go([master, tab('dock-view-automation')], LEFT, master, {
    ms: 1000,
    swing: { rx: 2, ry: 3 },
  });
  await d.wait(250);
  await openTab('dock-view-automation');
  await d.wait(400);
  // The lane reads clicks in unzoomed pixels, so it is drawn on with the
  // camera at 1x; the camera pushes in on the finished curve after.
  const lane = page.locator('canvas').last();
  const points = [
    [0.05, 0.3],
    [0.2, 0.78],
    [0.36, 0.36],
    [0.52, 0.66],
  ];
  await d.go(FLAT, null, lane, {
    ms: 900,
    fx: points[0][0],
    fy: points[0][1],
  });
  const l = await lane.boundingBox();
  const at = (fx, fy) => ({ x: l.x + l.width * fx, y: l.y + l.height * fy });
  for (const [fx, fy] of points.slice(1)) {
    await d.wait(120);
    const p = at(fx, fy);
    await d.clickAt(p.x, p.y, 380);
  }
  await d.wait(150);
  await d.drag(at(0.2, 0.78), at(0.22, 0.5), 800);
  await d.wait(250);
  await Promise.all([
    d.frame(lane, { cropX: [0, 0.62], pad: 16, maxZoom: 1.9 }, 1300, {
      rx: 2,
      ry: -5,
    }),
    d.away(700),
  ]);
  await drift(1100, { ry: -1 });
  await mark('automation');

  // 8. Mix: the meters, then the effects and sends.
  await Promise.all([d.to({ ...WIDE, rx: 4, ry: 6 }, 1400), d.away(600)]);
  await d.go(FLAT, null, page.getByRole('tab', { name: 'Mix', exact: true }), {
    ms: 800,
  });
  await d.wait(350);
  const strip = (name) => page.getByText(name, { exact: true }).first();
  await Promise.all([
    d.frame(
      ['Keys', 'Bass', 'Lead', 'Drums'].map(strip),
      { pad: 40, toBottom: 0.97, fit: 'width', focusY: 0.62, maxZoom: 1.8 },
      1200,
      { rx: 2, ry: -5 },
    ),
    d.away(500),
  ]);
  await drift(1500, { zoom: 1.03, ry: -1 });
  await d.frame(
    [strip('Keys'), strip('Drums'), page.getByText('Compressor').first()],
    { pad: 36, extraBottom: 150, maxZoom: 1.9 },
    1400,
    { rx: 2, ry: 5 },
  );
  await drift(1100, { ry: 1 });
  // Back out to the opening shot: the loop's seam.
  await d.to(WIDE, 1700);
  await mark('mix');
}
