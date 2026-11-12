// ── The Individual Project's place clips: recording ───────────────────────
// One calm subject per place, from the real app (owner, 2026-11-11: "too
// busy … calm and sleek"): Learn's keyboard playing a scale, one artist's
// portrait, one session's cover, notes passing the Studio's playhead, the
// globe turning. Live subjects are recorded as video; the two pictures are
// captured large and still, and encode.sh gives them a slow push-in.
//
//   VITE_DEV_AUTH_BYPASS=1 ./node_modules/.bin/vite --port 5288 --strictPort
//   node tools/place-clips/record.mjs --base http://localhost:5288 \
//     --out /tmp/place-clips [--only studio] [--probe]
//   bash tools/place-clips/encode.sh /tmp/place-clips public/videos/places
//
// Needs Playwright (PLAYWRIGHT=/path/to/playwright, the package folder) and
// the dev server under the auth bypass (Learn's page is Premium). --probe
// takes a screenshot of each subject instead, to check the framing.
// Writes <out>/<id>.webm (or <id>.png for a still) and <out>/<id>.json:
// the subject's box in the recording, and when its motion starts.

import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const arg = (name, fallback) => {
  const at = process.argv.indexOf(`--${name}`);
  return at > -1 ? process.argv[at + 1] : fallback;
};
const BASE = arg('base', 'http://localhost:5288');
const OUT = arg('out', '/tmp/place-clips');
const ONLY = arg('only', null);
const PROBE = process.argv.includes('--probe');
const PW =
  process.env.PLAYWRIGHT ??
  `${process.env.HOME}/.npm/_npx/e41f203b7505f1fb/node_modules/playwright`;
const { chromium } = await import(`${PW}/index.mjs`);

/** How long each live subject is recorded once it moves (encode.sh keeps 8-11 s). */
const HOLD = 13_000;
const VIEW = { width: 1200, height: 900 };

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  args: [
    '--use-gl=swiftshader',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--enable-unsafe-swiftshader',
    '--autoplay-policy=no-user-gesture-required',
  ],
});

/** Onboarding done and the Studio's notice seen, for the dev user. */
async function settle(page) {
  await page.evaluate(async () => {
    const scope = await import('/src/lib/local-store/userScope.ts');
    const notice = await import('/src/daw/shell/help/shortcutsNotice.ts');
    const key = scope.getLocalStoreUserKey();
    localStorage.setItem(
      `music-atlas-learn-profile:${key}`,
      JSON.stringify({ welcomedAt: Date.now() - 86_400_000 }),
    );
    localStorage.setItem(notice.shortcutsNoticeKey('dev-bypass-user'), '1');
  });
}

/** A box on the page, in CSS pixels. */
const boxOf = (page, selector) => page.locator(selector).first().boundingBox();

/** A crop of `w` × `h` CSS pixels centred on a box, kept on the screen. */
const around = (box, w, h) => {
  const clamp = (v, size, max) => Math.min(Math.max(0, v), max - size);
  return {
    x: Math.round(clamp(box.x + box.width / 2 - w / 2, w, VIEW.width)),
    y: Math.round(clamp(box.y + box.height / 2 - h / 2, h, VIEW.height)),
    w,
    h,
  };
};

// Each place: where its subject is, what sets it moving, and the crop the
// clip keeps (CSS pixels; `period` when its motion repeats exactly).
const PLACES = {
  // The relative-modes page plays each mode's scale on its keyboard by
  // itself, a key every 600 ms. Everything but the keyboard is hidden.
  learn: {
    path: '/learn/keyboard/relative/c',
    wait: 4000,
    subject: '.learn-root .bg-black.mx-auto',
    setup: async (page) => {
      await page.addStyleTag({
        // Drawn larger too: video records at the screen's own size.
        content: `body * { visibility: hidden !important; }
          .learn-root .bg-black.mx-auto, .learn-root .bg-black.mx-auto * {
            visibility: visible !important; }
          .learn-root .bg-black.mx-auto { zoom: 2.2; }`,
      });
    },
    // The keyboard across a 3:2 frame, dark above and below.
    crop: (box) => {
      const w = Math.round(box.width * 1.08);
      return around(box, w, Math.round(w / 1.5));
    },
  },
  // One portrait, captured large; encode.sh lets it breathe.
  songs: {
    still: async (page) => {
      await page.setContent(
        `<body style="margin:0;background:#0d0d10;display:grid;place-items:center;height:100vh">
           <img id="s" src="${BASE}/artists/svg/michael-jackson.webp"
             style="height:100vh;aspect-ratio:1;object-fit:cover"></body>`,
      );
      await page.waitForFunction(() => document.getElementById('s')?.complete);
      return '#s';
    },
  },
  // One session's hex cover, drawn by the app's own tile maker, its hexes
  // trading colours slowly (as HexWaveBackground's ambient drift does).
  library: {
    path: '/songs',
    wait: 2500,
    subject: '#s svg',
    setup: async (page) => {
      await page.evaluate(async () => {
        const { generateStudioTileSvg } = await import(
          '/src/lib/studioProjectTile.ts'
        );
        const svg = generateStudioTileSvg('demo-1', 900, 900);
        document.body.innerHTML = `<div id="s" style="position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:#0d0d10">${svg}</div>`;
        const el = document.querySelector('#s svg');
        el.setAttribute('style', 'height:100vh;width:100vh');
        const hexes = [...el.querySelectorAll('path, polygon')];
        const fills = hexes.map((h) => h.getAttribute('fill'));
        for (const h of hexes) h.style.transition = 'fill 1.8s ease-in-out';
        setInterval(() => {
          const h = hexes[Math.floor(Math.random() * hexes.length)];
          h.style.fill = fills[Math.floor(Math.random() * fills.length)];
        }, 90);
      });
    },
    crop: (box) => around(box, 820, 820),
  },
  // A demo song playing round its 4-bar loop in a maximised piano roll.
  studio: {
    path: '/studio?demo=demo-sunset-keys',
    wait: 9000,
    subject: '[data-tutorial-id="piano-roll-grid"]',
    setup: async (page) => {
      await page.evaluate(() => {
        const s = window.__MA_STORE__.getState();
        // The keys, not the drums: notes, not a step grid.
        const keys = s.tracks.find((t) => t.name === 'Rhodes');
        if (keys) s.setSelectedTrackId(keys.id);
        s.setLibraryOpen?.(false);
        s.setChannelStripTab?.('piano-roll');
        s.setDockMaximized?.(true);
        s.setFollowPlayhead?.(true);
      });
      await page.waitForTimeout(1500);
      await page.keyboard.press('Space');
    },
    // The notes, without the key names down the side.
    crop: (box) => ({ x: Math.round(box.x + 10), y: 170, w: 800, h: 533 }),
    // Sunset Keys: 4 bars of 4/4 at 85 BPM.
    period: (16 * 60) / 85,
  },
  // The globe alone, swaying slowly to and fro: a motion that repeats
  // exactly, so its loop has no seam (a turn one way would need a dissolve
  // between two different faces of the globe).
  globe: {
    path: '/globe/slide',
    wait: 9000,
    subject: '.atlas-map-ground',
    setup: async (page) => {
      await page.evaluate(() => {
        const { map } = window.__atlasGlobeDebug;
        const home = map.getCenter().lng;
        const t0 = performance.now();
        const sway = (now) => {
          const t = (now - t0) / 1000;
          map.jumpTo({
            center: [home + 18 * Math.sin((2 * Math.PI * t) / 12), 12],
          });
          requestAnimationFrame(sway);
        };
        requestAnimationFrame(sway);
      });
    },
    period: 12,
    crop: () => ({ x: 240, y: 90, w: 720, h: 720 }),
  },
};

// The device's state, set once on an unrecorded visit.
const setup = await browser.newContext({ viewport: VIEW });
const sp = await setup.newPage();
await sp.goto(`${BASE}/songs`, { waitUntil: 'domcontentloaded' });
await sp.waitForTimeout(3000);
await settle(sp);
const state = await setup.storageState();
await setup.close();

for (const [id, place] of Object.entries(PLACES)) {
  if (ONLY && ONLY !== id) continue;
  // Stills are taken at twice the density; video only records at the
  // screen's own size (a larger frame is padded, not sharper).
  if (place.still) {
    const ctx = await browser.newContext({
      viewport: VIEW,
      deviceScaleFactor: 2,
      storageState: state,
    });
    const page = await ctx.newPage();
    const selector = await place.still(page);
    await page.waitForTimeout(500);
    await page
      .locator(selector)
      .first()
      .screenshot({ path: join(OUT, `${id}.png`) });
    writeFileSync(join(OUT, `${id}.json`), JSON.stringify({ still: true }));
    await ctx.close();
    console.log(id, 'still');
    continue;
  }
  const ctx = await browser.newContext({
    viewport: VIEW,
    storageState: state,
    ...(PROBE ? {} : { recordVideo: { dir: OUT, size: VIEW } }),
  });
  const page = await ctx.newPage();
  const t0 = Date.now();
  await page.goto(BASE + place.path, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(place.wait);
  await place.setup?.(page);
  await page.mouse.move(VIEW.width - 1, VIEW.height - 1);
  const box = await boxOf(page, place.subject).catch(() => null);
  if (!box) console.log(id, 'subject not found:', place.subject);
  const start = (Date.now() - t0) / 1000;
  if (PROBE) {
    await page.screenshot({ path: join(OUT, `probe-${id}.png`) });
  } else {
    await page.waitForTimeout(HOLD);
  }
  const video = page.video();
  await ctx.close();
  if (video) renameSync(await video.path(), join(OUT, `${id}.webm`));
  writeFileSync(
    join(OUT, `${id}.json`),
    JSON.stringify({
      start,
      scale: 1,
      crop: box ? place.crop(box) : null,
      period: place.period ?? null,
    }),
  );
  console.log(id, start.toFixed(1), JSON.stringify(box));
}
await browser.close();
