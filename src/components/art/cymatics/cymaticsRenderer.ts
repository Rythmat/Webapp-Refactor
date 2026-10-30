// ── The cymatics renderer ──────────────────────────────────────────────────
// One WebGL canvas, off screen, draws every cymatic cover on the page (a
// browser allows only a handful of contexts, and the Arcade shows a dozen
// figures): each frame it renders each visible cover at its own size and
// copies the pixels into that cover's own 2D canvas.
//
// The shader evaluates the plate's field (lib/art/cymatics, the same sum)
// at every pixel, blended between two modes, and draws a line where the
// field crosses zero at its exact distance from the curve, |f| ÷ |∇f| in
// pixels, anti-aliased over one pixel: an even hairline everywhere, at any
// size, with no sampling grid to wobble it.

import { CYMATIC_TIMING, morphAt, type ChladniMode } from '@/lib/art';

export interface CymaticTarget {
  canvas: HTMLCanvasElement;
  /** The modes it morphs through (its own first). */
  modes: readonly ChladniMode[];
  /** 'plate': the whole plate, centred; 'banner': enlarged, toward the
   *  right, its pattern running on past the plate. */
  layout: 'plate' | 'banner';
  /** Line width, CSS pixels. */
  lineWidth: number;
  /** Seconds into its sequence it starts, so neighbours don't move as one. */
  phase: number;
  /** Still: draws its own mode and holds (reduced motion). */
  still: boolean;
  /** Drawn while on screen only. */
  visible: boolean;
}

const VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAGMENT = `
precision highp float;
uniform vec2 uSize;     // the target, device pixels
uniform vec2 uCenter;   // the plate's centre, device pixels from top-left
uniform float uK;       // radians of u per device pixel
uniform vec3 uFrom;     // n, m, sign
uniform vec3 uTo;
uniform float uMix;
uniform float uHalf;    // half the line's width, device pixels
uniform vec3 uColor;

// The field and its slope (per radian) for one mode.
vec3 mode(vec3 md, vec2 p) {
  float n = md.x; float m = md.y; float s = md.z;
  float cnu = cos(n * p.x); float snu = sin(n * p.x);
  float cmv = cos(m * p.y); float smv = sin(m * p.y);
  float cmu = cos(m * p.x); float smu = sin(m * p.x);
  float cnv = cos(n * p.y); float snv = sin(n * p.y);
  float f = cnu * cmv + s * cmu * cnv;
  float fu = -n * snu * cmv - s * m * smu * cnv;
  float fv = -m * cnu * smv - s * n * cmu * snv;
  return vec3(f, fu, fv);
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, uSize.y - gl_FragCoord.y);
  vec2 p = (px - uCenter) * uK;
  vec3 a = mode(uFrom, p);
  vec3 b = mode(uTo, p);
  vec3 f = mix(a, b, uMix);
  // The slope in device pixels; the distance to the curve, to first order.
  float slope = max(length(f.yz) * uK, 1e-5);
  float d = abs(f.x) / slope;
  float alpha = clamp(uHalf + 0.5 - d, 0.0, 1.0);
  gl_FragColor = vec4(uColor * alpha, alpha);
}
`;

/** Whether this browser can draw cymatics at all (jsdom: no). */
export const canDrawCymatics = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (typeof WebGLRenderingContext === 'undefined') return false;
  return renderer() !== null;
};

/** A CSS colour as 0–1 RGB (computed styles give rgb()/rgba()). */
export const parseRgb = (css: string): [number, number, number] | null => {
  const match = css.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  if (!match) return null;
  return [
    Number(match[1]) / 255,
    Number(match[2]) / 255,
    Number(match[3]) / 255,
  ];
};

class CymaticsRenderer {
  private gl: WebGLRenderingContext;
  private canvas: HTMLCanvasElement;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private targets = new Set<CymaticTarget>();
  private frame = 0;
  private start = performance.now();
  private lost = false;

  constructor(canvas: HTMLCanvasElement, gl: WebGLRenderingContext) {
    this.canvas = canvas;
    this.gl = gl;
    this.setup();
    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      this.lost = true;
    });
    canvas.addEventListener('webglcontextrestored', () => {
      this.lost = false;
      this.setup();
    });
  }

  private setup() {
    const { gl } = this;
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const aPos = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    for (const name of [
      'uSize',
      'uCenter',
      'uK',
      'uFrom',
      'uTo',
      'uMix',
      'uHalf',
      'uColor',
    ]) {
      this.uniforms[name] = gl.getUniformLocation(program, name);
    }
    gl.clearColor(0, 0, 0, 0);
  }

  add(target: CymaticTarget) {
    this.targets.add(target);
    this.request();
  }

  remove(target: CymaticTarget) {
    this.targets.delete(target);
  }

  /** Draw on the next frame (a still cover that resized, say). */
  request() {
    if (!this.frame) this.frame = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    this.frame = 0;
    if (this.lost) return;
    const t = (now - this.start) / 1000;
    let moving = false;
    for (const target of this.targets) {
      if (!target.visible) continue;
      this.draw(target, t);
      if (!target.still) moving = true;
    }
    if (moving) this.request();
  };

  private draw(target: CymaticTarget, t: number) {
    const { canvas: out } = target;
    const w = out.width;
    const h = out.height;
    if (w < 2 || h < 2) return;
    const ctx = out.getContext('2d');
    if (!ctx) return;
    const { gl, canvas, uniforms: u } = this;
    if (canvas.width < w || canvas.height < h) {
      canvas.width = Math.max(canvas.width, w);
      canvas.height = Math.max(canvas.height, h);
    }
    const dpr = w / Math.max(1, out.clientWidth || w);
    // The plate: the whole of it, centred, or a banner's enlarged one.
    const side = target.layout === 'banner' ? w * 0.62 : Math.min(w, h);
    const cx = target.layout === 'banner' ? w * 0.66 : w / 2;
    const cy = h / 2;
    const { from, to, mix } = target.still
      ? { from: 0, to: 0, mix: 0 }
      : morphAt(t + target.phase, target.modes.length, CYMATIC_TIMING);
    const a = target.modes[from] ?? target.modes[0];
    const b = target.modes[to] ?? a;
    const color = parseRgb(getComputedStyle(out).color) ?? [1, 1, 1];

    gl.viewport(0, 0, w, h);
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(u.uSize, w, h);
    gl.uniform2f(u.uCenter, cx, cy);
    gl.uniform1f(u.uK, Math.PI / (side / 2));
    gl.uniform3f(u.uFrom, a.n, a.m, a.sign);
    gl.uniform3f(u.uTo, b.n, b.m, b.sign);
    gl.uniform1f(u.uMix, mix);
    gl.uniform1f(u.uHalf, (target.lineWidth * dpr) / 2);
    gl.uniform3f(u.uColor, color[0], color[1], color[2]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // The drawing sits at the bottom-left of the GL canvas (its y runs up).
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(canvas, 0, canvas.height - h, w, h, 0, 0, w, h);
  }
}

let instance: CymaticsRenderer | null | undefined;

/** The page's one renderer, made on first use; null without WebGL. */
export function renderer(): CymaticsRenderer | null {
  if (instance !== undefined) return instance;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl', {
      premultipliedAlpha: true,
      antialias: false,
      // Copied out in the same frame it is drawn.
      preserveDrawingBuffer: true,
    });
    instance = gl ? new CymaticsRenderer(canvas, gl) : null;
  } catch {
    instance = null;
  }
  return instance;
}
