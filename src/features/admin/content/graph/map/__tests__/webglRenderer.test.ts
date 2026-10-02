import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_RENDERER_STYLE,
  LINK_FLAG_BACKWARD,
  LINK_FLAG_FORWARD,
  LINK_FLAG_GUESSED,
  LINK_FLAG_UNCONFIRMED,
  NODE_STATE_HOVERED,
  NODE_STATE_LIT,
  NODE_STATE_NORMAL,
} from '../render/GraphRenderer';
import { GRAPH_THEME } from '../render/graphTheme';
import {
  ARROW_VERTEX,
  LINE_VERTEX,
  NODE_VERTEX,
  SHADER_MARKER,
} from '../render/shaders';
import {
  createWebglRenderer,
  DEFAULT_RENDER_THEME,
  MAX_DPR,
  NODE_MIN_DEVICE_PX,
  parseColor,
  TEX_WIDTH,
  textureRowsFor,
} from '../render/webglRenderer';

/**
 * The parts of the WebGL2 renderer that can be checked without a GPU. The
 * drawing itself is checked in a browser (the P0 spike's measurements, and
 * later the graph smoke script): node has no WebGL.
 */

describe('parseColor', () => {
  it('reads hex colours as straight-alpha floats', () => {
    expect(parseColor('#101012')).toEqual([16 / 255, 16 / 255, 18 / 255, 1]);
    expect(parseColor('#fff')).toEqual([1, 1, 1, 1]);
    expect(parseColor('#00000080')[3]).toBeCloseTo(128 / 255);
  });

  it('reads rgb() and rgba(), with or without spaces', () => {
    expect(parseColor('rgba(148,153,196,0.30)')).toEqual([
      148 / 255,
      153 / 255,
      196 / 255,
      0.3,
    ]);
    expect(parseColor('rgb(255, 0, 0)')).toEqual([1, 0, 0, 1]);
  });
});

describe('the renderer theme', () => {
  it('takes its colours from graphTheme, the one source', () => {
    // No background of its own: the canvas is transparent over the page.
    expect(DEFAULT_RENDER_THEME.background).toBeNull();
    expect(DEFAULT_RENDER_THEME.line).toBe(GRAPH_THEME.line);
    expect(DEFAULT_RENDER_THEME.arrow).toBe(GRAPH_THEME.text);
    // White is the highlight: lit links and the hovered node's ring.
    expect(DEFAULT_RENDER_THEME.lineLit).toBe(GRAPH_THEME.highlight);
    expect(DEFAULT_RENDER_THEME.ring).toBe(GRAPH_THEME.highlight);
    expect(DEFAULT_RENDER_THEME.dimAlpha).toBe(0.2);
  });

  it("starts from Obsidian's display defaults", () => {
    expect(DEFAULT_RENDERER_STYLE).toEqual({
      nodeSize: 1,
      lineSize: 1,
      arrows: false,
      confidence: true,
    });
  });
});

describe('createWebglRenderer', () => {
  it('returns null where the browser gives no WebGL2 context', () => {
    const canvas = {
      getContext: () => null,
    } as unknown as HTMLCanvasElement;
    expect(createWebglRenderer(canvas)).toBeNull();
  });

  it('caps the pixel ratio at 2', () => {
    expect(MAX_DPR).toBe(2);
  });
});

describe('the shaders', () => {
  it('carry the bundle marker the production check looks for', () => {
    expect(SHADER_MARKER).toBe('u_atlasNodePositions');
    for (const source of [LINE_VERTEX, ARROW_VERTEX, NODE_VERTEX]) {
      expect(source).toContain(`sampler2D ${SHADER_MARKER}`);
      expect(source.startsWith('#version 300 es')).toBe(true);
    }
  });
});

describe('the lines and rings, as Obsidian draws them', () => {
  it('runs each line from one dot’s edge to the other’s, and none between overlapping dots', () => {
    expect(LINE_VERTEX).toContain('float len = centres - ra - rb;');
    expect(LINE_VERTEX).toContain('vec2 a = from + dir * ra;');
    expect(LINE_VERTEX).toContain('vec2 b = to - dir * rb;');
    expect(LINE_VERTEX).toContain('if (len <= 0.0)');
    // Dots and dashes count from the trimmed start.
    expect(LINE_VERTEX).toContain('v_along = a_corner.x * len;');
  });

  it('rings a dot with the √scale hairline, held to one or two CSS pixels', () => {
    expect(NODE_VERTEX).toContain(
      'clamp(sqrt(deviceScale()), u_dpr, 2.0 * u_dpr)',
    );
    expect(NODE_VERTEX).not.toContain('r * 0.2');
  });
});

describe('the flags', () => {
  it('give each line flag its own bit', () => {
    const flags = [
      LINK_FLAG_GUESSED,
      LINK_FLAG_UNCONFIRMED,
      LINK_FLAG_FORWARD,
      LINK_FLAG_BACKWARD,
    ];
    expect(flags.reduce((a, b) => a | b, 0)).toBe(15);
    expect(new Set(flags).size).toBe(4);
  });

  it('match the hover states the shaders test for', () => {
    expect([NODE_STATE_NORMAL, NODE_STATE_LIT, NODE_STATE_HOVERED]).toEqual([
      0, 1, 2,
    ]);
    // The shaders compare against these literals.
    expect(NODE_VERTEX).toContain('state == 2u');
    expect(NODE_VERTEX).toContain('state == 0u');
    expect(LINE_VERTEX).toContain('(a_flags & 1u)');
    expect(LINE_VERTEX).toContain('(a_flags & 2u)');
    expect(ARROW_VERTEX).toContain('backward ? 8u : 4u');
  });
});

/* ── A recording stand-in for WebGL2 ────────────────────────────────────── */

/*
 * Enough of a WebGL2 context for the renderer to build and draw against in
 * node. It reads each program's uniform names from the real shader sources,
 * keeps every program's uniform values as WebGL does, and records each draw
 * with the uniforms it ran with, each texture it made and each upload.
 */

type Kind = 'line' | 'arrow' | 'node';
interface FakeProgram {
  id: number;
  sources: string[];
  values: Map<string, unknown>;
}
interface Draw {
  kind: Kind;
  instances: number;
  vertices: number;
  uniforms: Record<string, unknown>;
}

const kindOf = (program: FakeProgram): Kind => {
  const vertex = program.sources[0] ?? '';
  if (vertex.includes('u_arrowSize')) return 'arrow';
  if (vertex.includes('u_lineWidth')) return 'line';
  return 'node';
};

const uniformNames = (sources: string[]) =>
  sources.flatMap((source) =>
    [...source.matchAll(/^uniform\s+(?:\w+\s+)*?(\w+);/gm)].map((m) => m[1]),
  );

function fakeWebgl({ refuseProgram = false } = {}) {
  let next = 1;
  const programs: FakeProgram[] = [];
  const textures: { id: number; height: number }[] = [];
  const uploads: { texture: number; rows: number }[] = [];
  const draws: Draw[] = [];
  const clears: number[][] = [];
  const shaderSource = new Map<object, string>();
  let current: FakeProgram | null = null;
  let boundTexture: { id: number; height: number } | null = null;
  let clearColor: number[] = [];
  const loseContext = vi.fn();

  const set = (
    loc: { program: FakeProgram; name: string } | null,
    v: unknown,
  ) => {
    if (loc) loc.program.values.set(loc.name, v);
  };
  const draw = (vertices: number, instances: number) => {
    if (!current) throw new Error('draw with no program');
    draws.push({
      kind: kindOf(current),
      vertices,
      instances,
      uniforms: Object.fromEntries(current.values),
    });
  };
  const gl = {
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    COMPILE_STATUS: 3,
    LINK_STATUS: 4,
    ACTIVE_UNIFORMS: 5,
    TEXTURE_2D: 6,
    TEXTURE0: 100,
    createShader: () => ({ shader: next++ }),
    shaderSource: (shader: object, source: string) =>
      shaderSource.set(shader, source),
    compileShader: () => {},
    getShaderParameter: () => true,
    getShaderInfoLog: () => '',
    createProgram: () => {
      if (refuseProgram) return null;
      const program: FakeProgram = {
        id: next++,
        sources: [],
        values: new Map(),
      };
      programs.push(program);
      return program;
    },
    attachShader: (program: FakeProgram, shader: object) =>
      program.sources.push(shaderSource.get(shader) ?? ''),
    linkProgram: () => {},
    getProgramParameter: (program: FakeProgram, what: number) =>
      what === 5 ? uniformNames(program.sources).length : true,
    getProgramInfoLog: () => '',
    getActiveUniform: (program: FakeProgram, i: number) => ({
      name: uniformNames(program.sources)[i],
    }),
    getUniformLocation: (program: FakeProgram, name: string) => ({
      program,
      name,
    }),
    getAttribLocation: () => 0,
    deleteShader: () => {},
    deleteProgram: () => {},
    useProgram: (program: FakeProgram) => (current = program),
    uniform1i: set,
    uniform1f: set,
    uniform2f: (loc: never, x: number, y: number) => set(loc, [x, y]),
    uniform3f: (loc: never, x: number, y: number, z: number) =>
      set(loc, [x, y, z]),
    uniform4fv: (loc: never, v: Float32Array) => set(loc, [...v]),
    createBuffer: () => ({ buffer: next++ }),
    bindBuffer: () => {},
    bufferData: () => {},
    deleteBuffer: () => {},
    createVertexArray: () => ({ vao: next++ }),
    bindVertexArray: () => {},
    enableVertexAttribArray: () => {},
    vertexAttribPointer: () => {},
    vertexAttribIPointer: () => {},
    vertexAttribDivisor: () => {},
    deleteVertexArray: () => {},
    createTexture: () => {
      const t = { id: next++, height: 0 };
      textures.push(t);
      return t;
    },
    bindTexture: (_: number, t: { id: number; height: number }) =>
      (boundTexture = t),
    texParameteri: () => {},
    texStorage2D: (
      _t: number,
      _l: number,
      _f: number,
      width: number,
      height: number,
    ) => {
      expect(width).toBe(TEX_WIDTH);
      if (boundTexture) boundTexture.height = height;
    },
    texSubImage2D: (...args: unknown[]) =>
      uploads.push({ texture: boundTexture?.id ?? 0, rows: args[5] as number }),
    deleteTexture: () => {},
    activeTexture: () => {},
    pixelStorei: () => {},
    viewport: () => {},
    clearColor: (...rgba: number[]) => (clearColor = rgba),
    clear: () => clears.push(clearColor),
    enable: () => {},
    blendFunc: () => {},
    drawArraysInstanced: (
      _m: number,
      _f: number,
      vertices: number,
      n: number,
    ) => draw(vertices, n),
    isContextLost: () => false,
    getParameter: () => 'Fake GPU',
    getExtension: (name: string) =>
      name === 'WEBGL_lose_context' ? { loseContext } : null,
  };

  const listeners = new Map<string, (e: Event) => void>();
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => gl,
    addEventListener: (type: string, fn: (e: Event) => void) =>
      listeners.set(type, fn),
    removeEventListener: (type: string) => listeners.delete(type),
  };
  const fire = (type: string) =>
    listeners.get(type)?.({ preventDefault: () => {} } as unknown as Event);
  return {
    canvas: canvas as unknown as HTMLCanvasElement,
    programs,
    textures,
    uploads,
    draws,
    clears,
    listeners,
    loseContext,
    fire,
    lastDraw: (kind: Kind) => draws.filter((d) => d.kind === kind).at(-1),
  };
}

const graphOf = (count: number, links: number[] = []) => ({
  count,
  links: Uint32Array.from(links),
  linkFlags: new Uint8Array(links.length / 2).fill(4),
  radii: new Float32Array(count).fill(8),
  colors: new Uint8Array(count * 4).fill(255),
  nodeFlags: new Uint8Array(count),
});

const started = (fake: ReturnType<typeof fakeWebgl>, theme = {}) => {
  const renderer = createWebglRenderer(fake.canvas, { theme });
  if (!renderer) throw new Error('the renderer did not start');
  renderer.resize(400, 300, 2);
  return renderer;
};

describe('createWebglRenderer, against a recording context', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('forgets a hover when the graph changes: nothing stays dimmed', () => {
    const fake = fakeWebgl();
    const renderer = started(fake);
    renderer.setGraph(graphOf(3, [0, 1, 1, 2]));
    renderer.setHighlight({
      hovered: 0,
      state: Uint8Array.from([2, 1, 0]),
      fade: 1,
    });
    renderer.render();
    expect(fake.lastDraw('node')?.uniforms.u_fade).toBe(1);
    // The hovered node is drawn again on top.
    expect(fake.draws.filter((d) => d.kind === 'node')).toHaveLength(2);

    const before = fake.draws.length;
    renderer.setGraph(graphOf(3, [0, 1, 1, 2]));
    renderer.render();
    const frame = fake.draws.slice(before);
    expect(frame.find((d) => d.kind === 'line')?.uniforms.u_fade).toBe(0);
    expect(frame.filter((d) => d.kind === 'node')).toHaveLength(1);
    expect(frame[frame.length - 1].uniforms.u_fade).toBe(0);
  });

  it("draws in Obsidian's device pixels: a 1-pixel line and an 8-pixel dart", () => {
    const fake = fakeWebgl();
    const renderer = started(fake);
    renderer.setGraph(graphOf(2, [0, 1]));
    renderer.setStyle({ ...DEFAULT_RENDERER_STYLE, arrows: true });
    // CSS zoom ½ on a Retina canvas is Obsidian's scale 1: arrows solid.
    renderer.setCamera({ x: 0, y: 0, zoom: 0.5 });
    renderer.render();
    const line = fake.lastDraw('line');
    expect(line?.uniforms.u_lineWidth).toBe(1);
    expect(line?.uniforms.u_dpr).toBe(2);
    // The lines stop at the dots' edges: they know the dots' sizes.
    expect(line?.uniforms.u_nodeSize).toBe(1);
    expect(line?.uniforms.u_minRadius).toBe(NODE_MIN_DEVICE_PX);
    expect(fake.lastDraw('node')?.uniforms.u_minRadius).toBe(
      NODE_MIN_DEVICE_PX,
    );
    expect(line?.uniforms.u_camera).toEqual([0, 0, 0.5]);
    const arrow = fake.lastDraw('arrow');
    expect(arrow?.uniforms.u_arrowSize).toBe(8);
    expect(arrow?.uniforms.u_arrowAlpha).toBeCloseTo(1, 12);
    expect(arrow?.instances).toBe(2);
    expect(arrow?.vertices).toBe(6);
    // Obsidian paints arrows in its text colour.
    expect(arrow?.uniforms.u_arrowColor).toEqual([
      ...new Float32Array(parseColor(GRAPH_THEME.text)),
    ]);

    // Scale 0.2 (CSS zoom 0.1 on Retina) is below the arrows' fade-in.
    const before = fake.draws.length;
    renderer.setCamera({ x: 0, y: 0, zoom: 0.1 });
    renderer.render();
    expect(fake.draws.slice(before).some((d) => d.kind === 'arrow')).toBe(
      false,
    );
  });

  it("clears to transparent, so the app's background shows through", () => {
    const fake = fakeWebgl();
    const renderer = started(fake);
    renderer.render();
    expect(fake.clears.at(-1)).toEqual([0, 0, 0, 0]);
    const opaque = fakeWebgl();
    const painted = started(opaque, { background: '#101012' });
    painted.render();
    expect(opaque.clears.at(-1)).toEqual([16 / 255, 16 / 255, 18 / 255, 1]);
  });

  it('changes the node count without rebuilding its programs', () => {
    expect([textureRowsFor(0), textureRowsFor(2048)]).toEqual([1, 1]);
    expect([textureRowsFor(8148), textureRowsFor(8193)]).toEqual([4, 8]);
    const fake = fakeWebgl();
    const renderer = started(fake);
    expect(fake.programs).toHaveLength(3);
    expect(fake.textures).toHaveLength(5);
    for (const count of [1001, 1004, 15, 2048]) {
      renderer.setGraph(graphOf(count));
      renderer.render();
    }
    // Within the first row of texture nothing new is made at all.
    expect(fake.programs).toHaveLength(3);
    expect(fake.textures).toHaveLength(5);
    // Growing past it makes five new textures, and still no programs.
    renderer.setGraph(graphOf(8148));
    expect(fake.programs).toHaveLength(3);
    expect(fake.textures).toHaveLength(10);
    expect(fake.textures.slice(5).every((t) => t.height === 4)).toBe(true);
    renderer.setGraph(graphOf(8000));
    expect(fake.textures).toHaveLength(10);
    renderer.setGraph(graphOf(8193));
    expect(fake.textures).toHaveLength(15);
    expect(fake.textures.slice(10).every((t) => t.height === 8)).toBe(true);
    // An upload covers only the rows the nodes fill.
    expect(fake.uploads.at(-1)?.rows).toBe(5);
  });

  it('uploads the hover state only when it changes, not on fade frames', () => {
    const fake = fakeWebgl();
    const renderer = started(fake);
    renderer.setGraph(graphOf(3, [0, 1]));
    renderer.render();
    const state = Uint8Array.from([2, 1, 0]);
    renderer.setHighlight({ hovered: 0, state, fade: 0 });
    const uploads = fake.uploads.length;
    expect(uploads).toBeGreaterThan(0);
    for (const fade of [0.25, 0.5, 1]) {
      renderer.setHighlight({ hovered: 0, state, fade });
      expect(renderer.isDirty).toBe(true);
      renderer.render();
    }
    expect(fake.uploads).toHaveLength(uploads);
    expect(fake.lastDraw('node')?.uniforms.u_fade).toBe(1);
    // The same call again changes nothing and asks for no frame.
    renderer.setHighlight({ hovered: 0, state, fade: 1 });
    expect(renderer.isDirty).toBe(false);
    // A new hover uploads again.
    renderer.setHighlight({
      hovered: 1,
      state: Uint8Array.from([1, 2, 0]),
      fade: 1,
    });
    expect(fake.uploads).toHaveLength(uploads + 1);
  });

  it('changes the rings without clearing a hover or re-sending the lines', () => {
    const fake = fakeWebgl();
    const renderer = started(fake);
    renderer.setGraph(graphOf(3, [0, 1, 1, 2]));
    const state = Uint8Array.from([2, 1, 0]);
    renderer.setHighlight({ hovered: 0, state, fade: 1 });
    renderer.render();
    const uploads = fake.uploads.length;
    renderer.setNodeFlags(Uint8Array.from([0, 0, 1]));
    expect(renderer.isDirty).toBe(true);
    // One texture upload: the flags, and nothing else.
    expect(fake.uploads).toHaveLength(uploads + 1);
    renderer.render();
    // The hover is still applied after the rings change.
    expect(fake.lastDraw('node')?.uniforms.u_fade).toBe(1);
    expect(fake.draws.filter((d) => d.kind === 'node').at(-1)).toBeDefined();
  });

  it('stops asking for frames while the context is lost', () => {
    const fake = fakeWebgl();
    const restored = vi.fn();
    const renderer = createWebglRenderer(fake.canvas, {
      onContextRestored: restored,
    });
    if (!renderer) throw new Error('the renderer did not start');
    renderer.setGraph(graphOf(2, [0, 1]));
    renderer.render();
    fake.fire('webglcontextlost');
    renderer.setCamera({ x: 1, y: 1, zoom: 2 });
    expect(renderer.isLost).toBe(true);
    expect(renderer.isDirty).toBe(false);
    const drawn = fake.draws.length;
    renderer.render();
    expect(fake.draws).toHaveLength(drawn);

    fake.fire('webglcontextrestored');
    expect(restored).toHaveBeenCalledTimes(1);
    expect(renderer.isDirty).toBe(true);
    renderer.render();
    expect(fake.lastDraw('line')?.uniforms.u_camera).toEqual([1, 1, 2]);
    // Rebuilt once: three more programs, not one per frame.
    expect(fake.programs).toHaveLength(6);
  });

  it('gives back null, and lets the context go, when it cannot build', () => {
    const fake = fakeWebgl({ refuseProgram: true });
    expect(createWebglRenderer(fake.canvas)).toBeNull();
    expect(fake.listeners.size).toBe(0);
    expect(fake.loseContext).toHaveBeenCalledTimes(1);
  });

  it('asks the browser for WebGL2 once, and hands the probe back', async () => {
    vi.resetModules();
    const fake = fakeWebgl();
    const createElement = vi.fn(() => fake.canvas);
    vi.stubGlobal('document', { createElement });
    const { isWebgl2Available } = await import('../render/webglRenderer');
    expect(isWebgl2Available()).toBe(true);
    expect(isWebgl2Available()).toBe(true);
    expect(createElement).toHaveBeenCalledTimes(1);
    expect(fake.loseContext).toHaveBeenCalledTimes(1);
  });
});
