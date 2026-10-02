import {
  arrowAlpha,
  arrowDeviceLength,
  CONFIDENCE_MIN_SCREEN_PX,
  MAX_PIXEL_RATIO,
  pixelRatio,
} from '../model/sizing';
import {
  DEFAULT_RENDERER_STYLE,
  type GraphRenderer,
  NO_NODE,
  type RendererCamera,
  type RendererGraph,
  type RendererStyle,
} from './GraphRenderer';
import { GRAPH_THEME } from './graphTheme';
import {
  ARROW_FRAGMENT,
  ARROW_VERTEX,
  LINE_FRAGMENT,
  LINE_VERTEX,
  NODE_FRAGMENT,
  NODE_VERTEX,
} from './shaders';

/**
 * The Mind Map's own WebGL2 renderer (design §1, option d): the same
 * primitives Obsidian draws with PIXI, without PIXI.
 *
 * Node data sits in textures indexed by node number (see shaders.ts), so a
 * layout tick costs one small texture upload, and a frame is three instanced
 * draw calls (lines, arrows, nodes) plus one more for the hovered node on
 * top, however many lines there are. Hover dimming is a state texture plus a
 * `fade` uniform the caller animates, so the fade runs at full frame rate;
 * a frame where only the fade moved uploads nothing. A frame allocates
 * nothing either: uniform locations and texture units are looked up once
 * when the programs are built.
 *
 * The node textures are 2,048 nodes wide and as many rows deep as the graph
 * needs, rounded up to a power of two. A graph that grows past them gets new
 * textures and nothing else; the programs and vertex arrays are built once
 * per context, so a local graph or the timelapse can change the node count
 * on every step without recompiling a shader.
 *
 * The canvas is transparent by default, so the page's own background (the
 * app's `--ui-background`) shows behind the graph, as the owner chose. A
 * theme can still give an opaque background colour.
 *
 * It draws only when told something changed: every setter marks the frame
 * dirty, and `render()` does nothing otherwise, so an idle graph costs no
 * GPU or CPU time. The caller's animation loop reads `isDirty` to decide
 * whether to keep running. While the context is lost, `isDirty` is false,
 * so the loop stops; `onContextRestored` is the cue to draw again.
 *
 * It keeps a CPU copy of everything it was given. When the browser takes the
 * WebGL context away (a GPU reset, too many contexts), `onContextLost` lets
 * the page say "Graph paused"; when the context comes back the renderer
 * rebuilds its GPU objects from those copies by itself and calls
 * `onContextRestored`. If the GPU objects cannot be built at the start,
 * `createWebglRenderer` gives back null, as it does without WebGL2, so the
 * page opens the List view; if they cannot be rebuilt later, the graph stays
 * paused.
 */

/** The colours the renderer paints with. Any CSS hex or rgb()/rgba() colour. */
export interface RenderTheme {
  /**
   * An opaque colour to clear each frame to, or null for a transparent
   * canvas that shows the page behind it (the default).
   */
  background: string | null;
  line: string;
  /** The hovered node's lines: the highlight. */
  lineLit: string;
  /** Arrowheads (Obsidian paints them in its text colour). */
  arrow: string;
  /**
   * The ring round the hovered node and round flagged nodes: the
   * highlight. A ringed node keeps its own fill colour.
   */
  ring: string;
  /** How strongly everything not hovered or lit shows while a node is hovered. */
  dimAlpha: number;
}

/** The Mind Map's theme (graphTheme.ts, the one source of its colours). */
export const DEFAULT_RENDER_THEME: RenderTheme = {
  background: null,
  line: GRAPH_THEME.line,
  lineLit: GRAPH_THEME.highlight,
  arrow: GRAPH_THEME.text,
  ring: GRAPH_THEME.highlight,
  dimAlpha: GRAPH_THEME.dimAlpha,
};

export interface WebglRendererOptions {
  theme?: Partial<RenderTheme>;
  /** The context was lost; drawing is paused until it is restored. */
  onContextLost?(): void;
  /** The context is back and the renderer has rebuilt itself; render again. */
  onContextRestored?(): void;
  /** Keep the drawn frame readable (pixel checks in tests); slower. */
  preserveDrawingBuffer?: boolean;
}

/** What the renderer adds to the shared contract, for the canvas and dev tools. */
export interface WebglGraphRenderer extends GraphRenderer {
  /** Something changed since the last frame, and a frame can be drawn. */
  readonly isDirty: boolean;
  /** The context is lost; `render()` does nothing until it is restored. */
  readonly isLost: boolean;
  /** Frames drawn, and the CPU time the last one took to submit. */
  readonly stats: { frames: number; lastFrameMs: number };
  /** Which GPU path the browser gave us, when it says (dev diagnostics). */
  readonly gpu: string;
  /**
   * Replace every node's flags (which dots get a ring: the local graph's
   * focus, the keyboard's current node, the open row), leaving the lines,
   * colours, positions and hover as they are. Cheaper than `setGraph` and,
   * unlike it, it does not clear a hover.
   */
  setNodeFlags(flags: Uint8Array): void;
}

/** Pixel ratios above 2 cost fill rate and look no different on a graph of dots. */
export const MAX_DPR = MAX_PIXEL_RATIO;
/** Node texture width; WebGL2 guarantees textures at least 2048 wide. */
export const TEX_WIDTH = 2048;

/** The smallest radius a dot is drawn at, in device pixels, however far out. */
export const NODE_MIN_DEVICE_PX = 1;

/**
 * Rows of node texture for `count` nodes: enough for them, rounded up to a
 * power of two, so a graph that grows a little needs no new textures.
 */
export function textureRowsFor(count: number): number {
  const rows = Math.max(1, Math.ceil(count / TEX_WIDTH));
  return 2 ** Math.ceil(Math.log2(rows));
}

/** The texture rows that hold `count` nodes' data: what an upload covers. */
const usedRows = (count: number) => Math.max(1, Math.ceil(count / TEX_WIDTH));

type Rgba = [number, number, number, number];

/** A CSS hex or rgb()/rgba() colour as straight-alpha floats 0..1. */
export function parseColor(css: string): Rgba {
  const s = css.trim();
  if (s.startsWith('#')) {
    const hex =
      s.length === 4 || s.length === 5
        ? [...s.slice(1)].map((c) => c + c).join('')
        : s.slice(1);
    const n = (i: number) => parseInt(hex.slice(i, i + 2), 16) / 255;
    return [n(0), n(2), n(4), hex.length >= 8 ? n(6) : 1];
  }
  const m = /rgba?\(([^)]+)\)/i.exec(s);
  if (m) {
    const parts = m[1]
      .split(/[\s,/]+/)
      .filter(Boolean)
      .map(Number);
    return [
      (parts[0] ?? 0) / 255,
      (parts[1] ?? 0) / 255,
      (parts[2] ?? 0) / 255,
      parts[3] ?? 1,
    ];
  }
  return [1, 1, 1, 1];
}

let webgl2Available: boolean | null = null;

/**
 * True where this browser can give us a WebGL2 context at all. Asked once:
 * the probe's context is handed straight back, because browsers keep only a
 * few contexts alive and drop the oldest (which could be the graph's own).
 */
export function isWebgl2Available(): boolean {
  if (webgl2Available !== null) return webgl2Available;
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2');
    webgl2Available = !!gl;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webgl2Available = false;
  }
  return webgl2Available;
}

interface Program {
  program: WebGLProgram;
  uniforms: Map<string, WebGLUniformLocation | null>;
  attrib(name: string): number;
}

/** The per-node textures, and how many rows they hold. */
interface NodeTextures {
  positions: WebGLTexture;
  radius: WebGLTexture;
  color: WebGLTexture;
  flags: WebGLTexture;
  state: WebGLTexture;
  /** The same textures in sampler-unit order (see `SAMPLERS`). */
  units: WebGLTexture[];
  rows: number;
}

interface GpuState {
  line: Program;
  arrow: Program;
  node: Program;
  lineVao: WebGLVertexArrayObject;
  arrowVao: WebGLVertexArrayObject;
  nodeVao: WebGLVertexArrayObject;
  cornerBuffers: WebGLBuffer[];
  linkBuffer: WebGLBuffer;
  linkFlagBuffer: WebGLBuffer;
  textures: NodeTextures;
}

/** Each sampler's texture unit, the same in every program. */
const SAMPLERS = [
  'u_atlasNodePositions',
  'u_nodeRadius',
  'u_nodeState',
  'u_nodeColor',
  'u_nodeFlags',
] as const;

/** The arrow dart's corners: two triangles, tip at the origin (see shaders.ts). */
const DART = new Float32Array([
  0, 0, -1, -0.5, -0.75, 0, 0, 0, -0.75, 0, -1, 0.5,
]);
const DART_VERTICES = DART.length / 2;

function compile(
  gl: WebGL2RenderingContext,
  vertex: string,
  fragment: string,
): Program {
  const shader = (type: number, source: string) => {
    const s = gl.createShader(type);
    if (!s) throw new Error('Could not create a shader');
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) {
      throw new Error(`Shader did not compile: ${gl.getShaderInfoLog(s)}`);
    }
    return s;
  };
  const vs = shader(gl.VERTEX_SHADER, vertex);
  const fs = shader(gl.FRAGMENT_SHADER, fragment);
  const program = gl.createProgram();
  if (!program) throw new Error('Could not create a program');
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS) && !gl.isContextLost()) {
    throw new Error(`Program did not link: ${gl.getProgramInfoLog(program)}`);
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  const uniforms = new Map<string, WebGLUniformLocation | null>();
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i);
    if (info)
      uniforms.set(info.name, gl.getUniformLocation(program, info.name));
  }
  return {
    program,
    uniforms,
    attrib: (name) => gl.getAttribLocation(program, name),
  };
}

/**
 * A renderer drawing into `canvas`, or null where WebGL2 is unavailable or
 * its objects cannot be built (the page then opens the List view instead).
 */
export function createWebglRenderer(
  canvas: HTMLCanvasElement,
  options: WebglRendererOptions = {},
): WebglGraphRenderer | null {
  const maybeGl = canvas.getContext('webgl2', {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: options.preserveDrawingBuffer ?? false,
    powerPreference: 'high-performance',
  });
  if (!maybeGl) return null;
  const gl: WebGL2RenderingContext = maybeGl;

  const theme = { ...DEFAULT_RENDER_THEME, ...options.theme };
  const vec4 = (css: string) => new Float32Array(parseColor(css));
  const background = theme.background ? parseColor(theme.background) : null;
  const colors = {
    line: vec4(theme.line),
    lineLit: vec4(theme.lineLit),
    arrow: vec4(theme.arrow),
    ring: vec4(theme.ring),
  };

  // CPU copies: what was last given, re-uploaded after a context loss. The
  // per-node arrays are padded to the textures' full size.
  let graph: RendererGraph = {
    count: 0,
    links: new Uint32Array(0),
    linkFlags: new Uint8Array(0),
    radii: new Float32Array(0),
    colors: new Uint8Array(0),
    nodeFlags: new Uint8Array(0),
  };
  /** Texture rows the CPU copies cover; only ever grows. */
  let rows = textureRowsFor(0);
  let positions = new Float32Array(TEX_WIDTH * rows * 2);
  let nodeColors = new Uint8Array(TEX_WIDTH * rows * 4);
  let state = new Uint8Array(TEX_WIDTH * rows);
  let hovered = NO_NODE;
  let fade = 0;
  let camera: RendererCamera = { x: 0, y: 0, zoom: 1 };
  let style: RendererStyle = { ...DEFAULT_RENDERER_STYLE };
  let dpr = 1;

  let gpu: GpuState | null = null;
  let dirty = true;
  let lost = false;
  let destroyed = false;
  const stats = { frames: 0, lastFrameMs: 0 };

  /** `data` copied into a zeroed array of `length`. */
  const padFloats = (data: Float32Array, length: number) => {
    const out = new Float32Array(length);
    out.set(data.length > length ? data.subarray(0, length) : data);
    return out;
  };
  const padBytes = (data: Uint8Array, length: number) => {
    const out = new Uint8Array(length);
    out.set(data.length > length ? data.subarray(0, length) : data);
    return out;
  };

  const makeTexture = (internal: number, h: number): WebGLTexture => {
    const t = gl.createTexture();
    if (!t) throw new Error('Could not create a texture');
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texStorage2D(gl.TEXTURE_2D, 1, internal, TEX_WIDTH, h);
    return t;
  };

  const makeTextures = (h: number): NodeTextures => {
    const positions = makeTexture(gl.RG32F, h);
    const radius = makeTexture(gl.R32F, h);
    const color = makeTexture(gl.RGBA8, h);
    const flags = makeTexture(gl.R8UI, h);
    const state = makeTexture(gl.R8UI, h);
    // In the order of SAMPLERS.
    const units = [positions, radius, state, color, flags];
    return { positions, radius, color, flags, state, units, rows: h };
  };

  const releaseTextures = (t: NodeTextures) => {
    for (const texture of t.units) gl.deleteTexture(texture);
  };

  /** Upload the rows that hold the graph's nodes. */
  const upload = (
    t: WebGLTexture,
    format: number,
    type: number,
    data: ArrayBufferView,
  ) => {
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      TEX_WIDTH,
      usedRows(graph.count),
      format,
      type,
      data,
    );
  };

  const staticBuffer = (data: Float32Array) => {
    const b = gl.createBuffer();
    if (!b) throw new Error('Could not create a buffer');
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return b;
  };

  const setInt = (p: Program, name: string, value: number) => {
    const loc = p.uniforms.get(name);
    if (loc) gl.uniform1i(loc, value);
  };
  const setFloat = (p: Program, name: string, value: number) => {
    const loc = p.uniforms.get(name);
    if (loc) gl.uniform1f(loc, value);
  };
  const setVec4 = (p: Program, name: string, value: Float32Array) => {
    const loc = p.uniforms.get(name);
    if (loc) gl.uniform4fv(loc, value);
  };

  /** Builds every GPU object, then uploads the CPU copies into them. */
  const build = (): GpuState => {
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    const line = compile(gl, LINE_VERTEX, LINE_FRAGMENT);
    const arrow = compile(gl, ARROW_VERTEX, ARROW_FRAGMENT);
    const node = compile(gl, NODE_VERTEX, NODE_FRAGMENT);
    // Sampler units and the texture width never change for a program.
    for (const p of [line, arrow, node]) {
      gl.useProgram(p.program);
      SAMPLERS.forEach((name, unit) => setInt(p, name, unit));
      setInt(p, 'u_texWidth', TEX_WIDTH);
    }

    const quad = staticBuffer(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]));
    const strip = staticBuffer(new Float32Array([0, -1, 1, -1, 0, 1, 1, 1]));
    const dart = staticBuffer(DART);
    const linkBuffer = gl.createBuffer();
    const linkFlagBuffer = gl.createBuffer();
    if (!linkBuffer || !linkFlagBuffer) {
      throw new Error('Could not create a buffer');
    }

    const vao = (
      program: Program,
      corners: WebGLBuffer,
      linkDivisor: number,
    ) => {
      const v = gl.createVertexArray();
      if (!v) throw new Error('Could not create a vertex array');
      gl.bindVertexArray(v);
      const corner = program.attrib('a_corner');
      gl.bindBuffer(gl.ARRAY_BUFFER, corners);
      gl.enableVertexAttribArray(corner);
      gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0);
      if (linkDivisor > 0) {
        const ends = program.attrib('a_ends');
        gl.bindBuffer(gl.ARRAY_BUFFER, linkBuffer);
        gl.enableVertexAttribArray(ends);
        gl.vertexAttribIPointer(ends, 2, gl.UNSIGNED_INT, 0, 0);
        gl.vertexAttribDivisor(ends, linkDivisor);
        const flags = program.attrib('a_flags');
        gl.bindBuffer(gl.ARRAY_BUFFER, linkFlagBuffer);
        gl.enableVertexAttribArray(flags);
        gl.vertexAttribIPointer(flags, 1, gl.UNSIGNED_BYTE, 0, 0);
        gl.vertexAttribDivisor(flags, linkDivisor);
      }
      gl.bindVertexArray(null);
      return v;
    };

    const next: GpuState = {
      line,
      arrow,
      node,
      lineVao: vao(line, strip, 1),
      arrowVao: vao(arrow, dart, 2),
      nodeVao: vao(node, quad, 0),
      cornerBuffers: [quad, strip, dart],
      linkBuffer,
      linkFlagBuffer,
      textures: makeTextures(rows),
    };
    uploadGraph(next);
    return next;
  };

  /** Everything `setGraph` and later setters gave, into `g`'s objects. */
  const uploadGraph = (g: GpuState) => {
    const n = TEX_WIDTH * rows;
    const t = g.textures;
    gl.bindBuffer(gl.ARRAY_BUFFER, g.linkBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, graph.links, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, g.linkFlagBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, graph.linkFlags, gl.STATIC_DRAW);
    upload(t.radius, gl.RED, gl.FLOAT, padFloats(graph.radii, n));
    upload(
      t.flags,
      gl.RED_INTEGER,
      gl.UNSIGNED_BYTE,
      padBytes(graph.nodeFlags, n),
    );
    upload(t.color, gl.RGBA, gl.UNSIGNED_BYTE, nodeColors);
    upload(t.positions, gl.RG, gl.FLOAT, positions);
    upload(t.state, gl.RED_INTEGER, gl.UNSIGNED_BYTE, state);
  };

  const release = (g: GpuState) => {
    for (const p of [g.line, g.arrow, g.node]) gl.deleteProgram(p.program);
    for (const v of [g.lineVao, g.arrowVao, g.nodeVao]) {
      gl.deleteVertexArray(v);
    }
    for (const b of [...g.cornerBuffers, g.linkBuffer, g.linkFlagBuffer]) {
      gl.deleteBuffer(b);
    }
    releaseTextures(g.textures);
  };

  /**
   * GPU work that may fail (an object the driver will not make). A failure
   * pauses the graph as a lost context would, rather than throwing into the
   * page; the CPU copies are kept for a later rebuild.
   */
  const onGpu = (work: (g: GpuState) => void) => {
    if (!gpu || lost) return;
    try {
      work(gpu);
    } catch {
      gpu = null;
      lost = true;
      options.onContextLost?.();
    }
  };

  const onLost = (e: Event) => {
    e.preventDefault(); // without this the context is never restored
    lost = true;
    gpu = null; // its objects died with the context
    options.onContextLost?.();
  };
  const onRestored = () => {
    if (destroyed) return;
    try {
      gpu = build();
    } catch {
      gpu = null; // could not rebuild: stay paused
      return;
    }
    lost = false;
    dirty = true;
    options.onContextRestored?.();
  };
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);

  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const gpuName = debugInfo
    ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL))
    : String(gl.getParameter(gl.RENDERER));

  try {
    gpu = build();
  } catch {
    canvas.removeEventListener('webglcontextlost', onLost);
    canvas.removeEventListener('webglcontextrestored', onRestored);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return null;
  }

  /** The uniforms every program shares, for the frame being drawn. */
  const bindCommon = (p: Program, vw: number, vh: number) => {
    gl.useProgram(p.program);
    const loc = p.uniforms;
    const cameraLoc = loc.get('u_camera');
    if (cameraLoc) gl.uniform3f(cameraLoc, camera.x, camera.y, camera.zoom);
    const viewportLoc = loc.get('u_viewport');
    if (viewportLoc) gl.uniform2f(viewportLoc, vw, vh);
    setFloat(p, 'u_dpr', dpr);
    setFloat(p, 'u_fade', fade);
    setFloat(p, 'u_dimAlpha', theme.dimAlpha);
    setFloat(p, 'u_nodeSize', style.nodeSize);
  };

  const renderer: WebglGraphRenderer = {
    get isDirty() {
      return dirty && !lost && !destroyed;
    },
    get isLost() {
      return lost;
    },
    get stats() {
      return stats;
    },
    get gpu() {
      return gpuName;
    },

    setGraph(g) {
      graph = {
        count: g.count,
        links: g.links.slice(),
        linkFlags: g.linkFlags.slice(),
        radii: g.radii.slice(),
        colors: g.colors.slice(),
        nodeFlags: g.nodeFlags.slice(),
      };
      const needed = textureRowsFor(g.count);
      const grows = needed > rows;
      if (grows) {
        rows = needed;
        // Positions carry over by node number until the layout sends its own.
        positions = padFloats(positions, TEX_WIDTH * rows * 2);
        state = new Uint8Array(TEX_WIDTH * rows);
      } else {
        state.fill(0);
      }
      nodeColors = padBytes(g.colors, TEX_WIDTH * rows * 4);
      // A new graph starts with nothing hovered and nothing dimmed.
      hovered = NO_NODE;
      fade = 0;
      onGpu((current) => {
        if (current.textures.rows < rows) {
          releaseTextures(current.textures);
          current.textures = makeTextures(rows);
        }
        uploadGraph(current);
      });
      dirty = true;
    },

    setNodeFlags(flags) {
      graph = { ...graph, nodeFlags: flags.slice(0, graph.count) };
      onGpu((g) =>
        upload(
          g.textures.flags,
          gl.RED_INTEGER,
          gl.UNSIGNED_BYTE,
          padBytes(graph.nodeFlags, TEX_WIDTH * rows),
        ),
      );
      dirty = true;
    },

    setPositions(xy) {
      const n = Math.min(xy.length, positions.length);
      positions.set(n === xy.length ? xy : xy.subarray(0, n));
      onGpu((g) => upload(g.textures.positions, gl.RG, gl.FLOAT, positions));
      dirty = true;
    },

    setColors(rgba) {
      const n = Math.min(rgba.length, nodeColors.length);
      nodeColors.set(n === rgba.length ? rgba : rgba.subarray(0, n));
      onGpu((g) =>
        upload(g.textures.color, gl.RGBA, gl.UNSIGNED_BYTE, nodeColors),
      );
      dirty = true;
    },

    setHighlight(h) {
      const nextFade = Math.max(0, Math.min(1, h.fade));
      // Only a changed state is uploaded: a fade frame moves one uniform.
      const n = Math.min(h.state.length, state.length);
      let changed = false;
      for (let i = 0; i < state.length && !changed; i++) {
        changed = state[i] !== (i < n ? h.state[i] : 0);
      }
      if (changed) {
        state.fill(0);
        state.set(n === h.state.length ? h.state : h.state.subarray(0, n));
        onGpu((g) =>
          upload(g.textures.state, gl.RED_INTEGER, gl.UNSIGNED_BYTE, state),
        );
      }
      if (changed || h.hovered !== hovered || nextFade !== fade) dirty = true;
      hovered = h.hovered;
      fade = nextFade;
    },

    setCamera(c) {
      camera = { x: c.x, y: c.y, zoom: c.zoom };
      dirty = true;
    },

    setStyle(s) {
      style = { ...s };
      dirty = true;
    },

    resize(w, h, ratio) {
      dpr = pixelRatio(ratio);
      const pw = Math.max(1, Math.round(Math.max(1, w) * dpr));
      const ph = Math.max(1, Math.round(Math.max(1, h) * dpr));
      if (canvas.width !== pw) canvas.width = pw;
      if (canvas.height !== ph) canvas.height = ph;
      dirty = true;
    },

    render() {
      if (!dirty || lost || destroyed || !gpu) return;
      const started = performance.now();
      dirty = false;
      const g = gpu;
      const vw = canvas.width;
      const vh = canvas.height;
      gl.viewport(0, 0, vw, vh);
      if (background) {
        gl.clearColor(background[0], background[1], background[2], 1);
      } else {
        gl.clearColor(0, 0, 0, 0);
      }
      gl.clear(gl.COLOR_BUFFER_BIT);
      stats.frames++;
      if (graph.count === 0) {
        stats.lastFrameMs = performance.now() - started;
        return;
      }

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      const units = g.textures.units;
      for (let unit = 0; unit < units.length; unit++) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, units[unit]);
      }

      const links = graph.links.length / 2;
      if (links > 0) {
        bindCommon(g.line, vw, vh);
        setVec4(g.line, 'u_lineColor', colors.line);
        setVec4(g.line, 'u_lineLit', colors.lineLit);
        // Obsidian's lines: `lineSize` device pixels at every zoom.
        setFloat(g.line, 'u_lineWidth', style.lineSize);
        setFloat(g.line, 'u_patternMin', CONFIDENCE_MIN_SCREEN_PX * dpr);
        // The lines stop at the dots' edges, which never draw smaller than this.
        setFloat(g.line, 'u_minRadius', NODE_MIN_DEVICE_PX);
        setInt(g.line, 'u_confidence', style.confidence ? 1 : 0);
        gl.bindVertexArray(g.lineVao);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, links);

        const arrows = style.arrows ? arrowAlpha(camera.zoom, dpr) : 0;
        if (arrows > 0) {
          bindCommon(g.arrow, vw, vh);
          setFloat(g.arrow, 'u_arrowAlpha', arrows);
          setFloat(g.arrow, 'u_arrowSize', arrowDeviceLength(style.lineSize));
          setVec4(g.arrow, 'u_arrowColor', colors.arrow);
          gl.bindVertexArray(g.arrowVao);
          gl.drawArraysInstanced(gl.TRIANGLES, 0, DART_VERTICES, links * 2);
        }
      }

      bindCommon(g.node, vw, vh);
      setVec4(g.node, 'u_ring', colors.ring);
      setFloat(g.node, 'u_minRadius', NODE_MIN_DEVICE_PX);
      setInt(g.node, 'u_indexOffset', 0);
      gl.bindVertexArray(g.nodeVao);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, graph.count);
      if (hovered >= 0 && hovered < graph.count) {
        // The hovered node again, on top of any neighbour drawn after it.
        setInt(g.node, 'u_indexOffset', hovered);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, 1);
      }
      gl.bindVertexArray(null);
      stats.lastFrameMs = performance.now() - started;
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      if (gpu && !lost) release(gpu);
      gpu = null;
    },
  };
  return renderer;
}
