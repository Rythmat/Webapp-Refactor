/* eslint-env node, browser */
/**
 * The director for scripts/home/recordStudioPreview.mjs: a virtual camera
 * that moves the whole page (so dialogs, which portal outside #root, move
 * with it) and a visible cursor that follows the real mouse, plus the Node
 * helpers the recorder's scenes are written with.
 *
 * Interactions (clicks, drags, typing) happen while the camera is level, so
 * the pointer lands exactly where it is drawn; tilts belong to the moves
 * between scenes and to hands-off shots.
 */

/** In the page: stages the page as a floating screen and installs __dir. */
export function installDirector({ viewport }) {
  const { width: vw, height: vh } = viewport;
  const html = document.documentElement;
  const body = document.body;
  html.style.background =
    'radial-gradient(120% 90% at 50% 40%, #1c1c22 0%, #08080a 70%)';
  html.style.overflow = 'hidden';
  Object.assign(body.style, {
    width: `${vw}px`,
    height: `${vh}px`,
    overflow: 'hidden',
    background: '#101012',
    transformOrigin: `${vw / 2}px ${vh / 2}px`,
    borderRadius: '14px',
    boxShadow: '0 40px 120px rgba(0, 0, 0, 0.65)',
  });

  // The cursor: outside <body>, so the camera never moves it.
  const cursor = document.createElement('div');
  cursor.innerHTML =
    '<svg width="26" height="26" viewBox="0 0 24 24" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,.5))">' +
    '<path d="M4 2.5 L4 19 L8.6 14.8 L11.6 21.5 L14.4 20.3 L11.5 13.7 L17.8 13.7 Z" fill="#fff" stroke="#101012" stroke-width="1.4" stroke-linejoin="round"/></svg>' +
    '<span style="position:absolute;left:-14px;top:-14px;width:28px;height:28px;border-radius:50%;border:2px solid rgba(255,255,255,.85);opacity:0;transform:scale(.4);transition:opacity .35s,transform .35s"></span>';
  Object.assign(cursor.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    zIndex: '2147483647',
    pointerEvents: 'none',
    transform: 'translate(-100px, -100px)',
    transition: 'scale 120ms',
  });
  html.appendChild(cursor);
  const ring = cursor.querySelector('span');
  addEventListener(
    'mousemove',
    (e) => {
      cursor.style.transform = `translate(${e.clientX - 4}px, ${e.clientY - 2}px)`;
    },
    true,
  );
  addEventListener(
    'mousedown',
    () => {
      cursor.style.scale = '0.86';
      ring.style.transition = 'none';
      ring.style.opacity = '1';
      ring.style.transform = 'scale(.4)';
      requestAnimationFrame(() => {
        ring.style.transition = 'opacity .45s, transform .45s';
        ring.style.opacity = '0';
        ring.style.transform = 'scale(1.6)';
      });
    },
    true,
  );
  addEventListener('mouseup', () => (cursor.style.scale = '1'), true);

  // Smootherstep: no jolt as a move starts or settles.
  const ease = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + (b - a) * t;
  let pose = { cx: vw / 2, cy: vh / 2, s: 1, rx: 0, ry: 0 };
  let token = 0;
  const css = (p) =>
    `perspective(1800px) rotateX(${p.rx}deg) rotateY(${p.ry}deg) ` +
    `scale(${p.s}) translate(${vw / 2 - p.cx}px, ${vh / 2 - p.cy}px)`;
  const apply = (p) => {
    pose = p;
    body.style.transform = css(p);
  };

  window.__dir = {
    get pose() {
      return pose;
    },
    set: (p) => apply({ ...pose, ...p }),
    /**
     * Eases to `target` over `ms` (zoom in log space); a newer move wins.
     * `swing` ({ rx, ry }) tilts the screen mid-move and lands it level
     * again: a cinematic arc that still ends where clicks can land.
     */
    to(target, ms) {
      const { swing, ...rest } = target;
      const from = pose;
      const to = { ...from, ...rest };
      const id = ++token;
      return new Promise((resolve) => {
        const start = performance.now();
        const tick = (now) => {
          if (id !== token) return resolve();
          const t = Math.min(1, (now - start) / ms);
          const k = ease(t);
          const arc = Math.sin(Math.PI * t);
          apply({
            cx: lerp(from.cx, to.cx, k),
            cy: lerp(from.cy, to.cy, k),
            s: Math.exp(lerp(Math.log(from.s), Math.log(to.s), k)),
            rx: lerp(from.rx, to.rx, k) + (swing?.rx ?? 0) * arc,
            ry: lerp(from.ry, to.ry, k) + (swing?.ry ?? 0) * arc,
          });
          if (t < 1) requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      });
    },
    /** The union of `els`' rects as laid out, without the camera. */
    measure(els) {
      const kept = body.style.transform;
      body.style.transform = 'none';
      const rs = els.filter(Boolean).map((e) => e.getBoundingClientRect());
      body.style.transform = kept;
      if (!rs.length) return null;
      return {
        left: Math.min(...rs.map((r) => r.left)),
        top: Math.min(...rs.map((r) => r.top)),
        right: Math.max(...rs.map((r) => r.right)),
        bottom: Math.max(...rs.map((r) => r.bottom)),
      };
    },
  };
}

/**
 * A laid-out rect → the camera's framing: centre and the zoom that fits it,
 * clamped (`maxZoom`, and never panning past the screen's edges unless
 * `free`). `fit:
 * 'width'` fills the width (cropping height) around `focusY`; `cropX`/`cropY`
 * take fractions of the rect first, `extraBottom` px or `toBottom` (a
 * fraction of the window's height) stretch it down; `pad` px goes around it.
 */
export function framing(rect, spec, viewport) {
  const { width: vw, height: vh } = viewport;
  if (!rect) return { cx: vw / 2, cy: vh / 2, s: 1 };
  let { left, top, right, bottom } = rect;
  if (spec.cropX) {
    const w = right - left;
    [left, right] = [left + w * spec.cropX[0], left + w * spec.cropX[1]];
  }
  if (spec.cropY) {
    const h = bottom - top;
    [top, bottom] = [top + h * spec.cropY[0], top + h * spec.cropY[1]];
  }
  if (spec.extraBottom) bottom += spec.extraBottom;
  if (spec.toBottom) bottom = Math.max(bottom, vh * spec.toBottom);
  const pad = spec.pad ?? 40;
  left -= pad;
  right += pad;
  top -= pad;
  bottom += pad;
  const s = Math.max(
    1,
    Math.min(
      spec.maxZoom ?? 2.3,
      spec.fit === 'width'
        ? vw / (right - left)
        : Math.min(vw / (right - left), vh / (bottom - top)),
    ),
  );
  const cx = (left + right) / 2;
  const cy = top + (bottom - top) * (spec.focusY ?? 0.5);
  // `free`: may pan past the screen's edge (a tilted shot of a corner).
  if (spec.free) return { cx, cy, s };
  const hx = vw / (2 * s);
  const hy = vh / (2 * s);
  return {
    cx: Math.min(vw - hx, Math.max(hx, cx)),
    cy: Math.min(vh - hy, Math.max(hy, cy)),
    s,
  };
}

/** The Node side: camera moves, framing and pointer gestures for `page`. */
export function director(page, viewport, { pace = 1 } = {}) {
  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  let mouse = { x: viewport.width / 2, y: viewport.height + 40 };
  const wait = (ms) => page.waitForTimeout(ms);

  const d = {
    wait,
    install: () => page.evaluate(installDirector, { viewport }),
    pose: () => page.evaluate(() => window.__dir.pose),
    set: (p) => page.evaluate((x) => window.__dir.set(x), p),
    /**
     * Moves the camera; level (no tilt) unless `rx`/`ry` are given. Runs
     * `pace` times `ms` unless `paced: false`.
     */
    to: (p, ms = 1000, { paced = true } = {}) =>
      page.evaluate(
        ([x, t]) => window.__dir.to(x, t),
        [{ rx: 0, ry: 0, ...p }, paced ? ms * pace : ms],
      ),
    /** The camera framing for `locators` (laid out, before the camera). */
    async frameOf(locators, spec = {}) {
      const handles = await Promise.all(
        [locators].flat().map((l) => l.first().elementHandle()),
      );
      const rect = await page.evaluate(
        (els) => window.__dir.measure(els),
        handles,
      );
      return framing(rect, spec, viewport);
    },
    /** Frames `locators` and moves there (level, or with `tilt`). */
    async frame(locators, spec = {}, ms = 1000, tilt = {}) {
      const f = await d.frameOf(locators, spec);
      await d.to({ ...f, ...tilt }, ms);
      return f;
    },
    /**
     * Glides the real mouse (and so the drawn cursor) to x, y in `ms` of
     * wall time: as many moves as the page keeps up with, never longer.
     */
    async glide(x, y, ms = 550) {
      const from = mouse;
      if (Math.hypot(x - from.x, y - from.y) < 2) return;
      const start = Date.now();
      for (;;) {
        const k = Math.min(1, (Date.now() - start) / ms);
        const e = easeInOut(k);
        await page.mouse.move(
          from.x + (x - from.x) * e,
          from.y + (y - from.y) * e,
        );
        if (k >= 1) break;
        await wait(12);
      }
      mouse = { x, y };
    },
    /** Where `locator` will be on screen once the camera reaches `pose`. */
    async aim(locator, pose, fx = 0.5, fy = 0.5) {
      const handle = await locator.first().elementHandle();
      const r = await page.evaluate((el) => window.__dir.measure([el]), handle);
      const x = r.left + (r.right - r.left) * fx;
      const y = r.top + (r.bottom - r.top) * fy;
      return {
        x: viewport.width / 2 + pose.s * (x - pose.cx),
        y: viewport.height / 2 + pose.s * (y - pose.cy),
      };
    },
    /**
     * Frames `locators` (level) while the cursor glides to where `target`
     * will be, so the camera and the hand move together; then presses it.
     */
    async go(
      locators,
      spec,
      target,
      { ms = 1000, fx, fy, press = true, swing } = {},
    ) {
      // A pose ({ cx, cy, s }) is used as it is.
      const f =
        locators && 's' in locators
          ? locators
          : await d.frameOf(locators, spec);
      const p = await d.aim(target, f, fx, fy);
      await Promise.all([
        d.to({ ...f, swing }, ms),
        d.glide(p.x, p.y, ms * pace),
      ]);
      if (press) await d.press();
      return f;
    },
    /** A click where the cursor is. */
    async press(hold = 90) {
      await page.mouse.down();
      await wait(hold);
      await page.mouse.up();
    },
    /** Where `locator` is on screen now (camera included). */
    async center(locator, fx = 0.5, fy = 0.5) {
      const b = await locator.first().boundingBox();
      if (!b) throw new Error(`not on screen: ${locator}`);
      return { x: b.x + b.width * fx, y: b.y + b.height * fy };
    },
    async click(locator, { ms = 550, fx = 0.5, fy = 0.5, hold = 90 } = {}) {
      const p = await d.center(locator, fx, fy);
      await d.glide(p.x, p.y, ms);
      // Re-aim: a list that animates or scrolls as it opens moves under the
      // cursor while it travels.
      const q = await d.center(locator, fx, fy);
      await d.glide(q.x, q.y, 140);
      await d.press(hold);
    },
    async clickAt(x, y, ms = 500) {
      await d.glide(x, y, ms);
      await page.mouse.down();
      await wait(90);
      await page.mouse.up();
    },
    /** Presses at `from`, drags to `to` over `ms`, releases. */
    async drag(from, to, ms = 900) {
      await d.glide(from.x, from.y, 450);
      await page.mouse.down();
      await wait(120);
      await d.glide(to.x, to.y, ms);
      await wait(150);
      await page.mouse.up();
    },
    /** Parks the cursor just off the bottom edge. */
    async away(ms = 500) {
      await d.glide(mouse.x, viewport.height + 40, ms);
    },
  };
  return d;
}
