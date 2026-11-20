import type {
  CustomLayerInterface,
  CustomRenderMethodInput,
  Map as MapLibreMap,
} from 'maplibre-gl';
import {
  ARC_STRIDE,
  arcBuffers,
  pickArc,
  type ArcLine,
  type ArcProjection,
} from './arcGeometry';
import { DRAW_MS } from './drawOn';
import type { LinkSide } from './networkFeatures';

/**
 * The links as flight paths (owner, 2026-11-16, after a route globe): a
 * MapLibre custom layer that draws each link as an arc off the globe, with
 * MapLibre's own projection (`projectTileWithElevation`), so the arcs turn
 * with the globe and drop behind its horizon. Each is a screen-space ribbon:
 * its side's ramp along its length over a soft glow, drawing on outward from
 * the stop, then a comet flying along it; a weak tie fainter, its dashes
 * flowing. The pointer picks them in JS (arcGeometry.ts pickArc).
 */

export const ARC_LAYER_ID = 'atlas-link-arcs';

/** Draw starts that mean drawn long ago, and not yet. */
const SHOWN = -1e12;
const WAITING = 1e12;

/** A comet's lap along its link, ms, and its tail, as a share of the link. */
export const COMET = { periodMs: 2600, tail: 0.22 } as const;

const VERTEX = (prelude: string, define: string) => `#version 300 es
${prelude}
${define}
#ifndef PI
#define PI 3.141592653589793
#endif
in vec3 a_pos;
in vec3 a_prev;
in vec3 a_next;
in float a_side;
in float a_t;
in vec4 a_color;
in float a_width;
in vec4 a_meta;
in float a_from_end;
uniform vec2 u_viewport;
uniform float u_pixel_ratio;
uniform float u_width_scale;
uniform float u_lit;
uniform float u_lift;
out float v_side;
out float v_t;
out vec4 v_color;
out vec4 v_meta;
out float v_from_end;
out float v_half;
out float v_lit;

float lat_of(float y) {
  return 2.0 * atan(exp(PI * (1.0 - 2.0 * y))) - PI / 2.0;
}

vec4 place(vec3 p) {
#ifdef GLOBE
  return projectTileWithElevation(p.xy, p.z);
#else
  float metres = 2.0 * PI * 6371008.8 * max(0.01, cos(lat_of(p.y)));
  return projectTileWithElevation(p.xy, p.z / metres);
#endif
}

void main() {
  vec4 c = place(a_pos);
  vec4 p = place(a_prev);
  vec4 n = place(a_next);
  vec2 half_view = u_viewport * 0.5;
  vec2 sp = p.xy / p.w * half_view;
  vec2 sn = n.xy / n.w * half_view;
  vec2 dir = sn - sp;
  dir = length(dir) < 1e-6 ? vec2(1.0, 0.0) : normalize(dir);
  vec2 normal = vec2(-dir.y, dir.x);
  float lit = abs(a_meta.w - u_lit) < 0.5 ? 1.6 : 1.0;
  // A fine line, as a flight path's (1 to 2.4 px by its weight); half of
  // it, in device px, and a pixel more for the soft edge.
  float base = clamp(a_width * 0.45, 1.0, 2.4);
  float half_w = (base * lit * u_width_scale * 0.5 + 1.0) * u_pixel_ratio;
  gl_Position = c;
  gl_Position.xy += normal * a_side * half_w / half_view * c.w;
  // Up with the lifted region (useRegionLift), as the old line layers were.
  gl_Position.y += u_lift * u_pixel_ratio / half_view.y * c.w;
  v_side = a_side;
  v_t = a_t;
  v_color = a_color;
  v_meta = a_meta;
  v_from_end = a_from_end;
  v_half = half_w;
  v_lit = lit;
}`;

const FRAGMENT = `#version 300 es
precision highp float;
in float v_side;
in float v_t;
in vec4 v_color;
in vec4 v_meta;
in float v_from_end;
in float v_half;
in float v_lit;
uniform float u_elapsed;
uniform float u_per_link;
uniform float u_time;
uniform float u_glow;
uniform float u_motion;
uniform float u_tail;
uniform float u_pixel_ratio;
out vec4 fragColor;

void main() {
  // Drawing on, out of the stop: a link coming in grows from its far end.
  float p = clamp((u_elapsed - v_meta.z) / u_per_link, 0.0, 1.0);
  p = 1.0 - pow(1.0 - p, 3.0);
  float along = v_from_end > 0.5 ? 1.0 - v_t : v_t;
  if (along > p) discard;

  // A soft edge, a device pixel wide.
  float edge = clamp((1.0 - abs(v_side)) * v_half / u_pixel_ratio, 0.0, 1.0);
  vec3 rgb = v_color.rgb;
  float alpha = v_color.a * edge;

  if (u_glow > 0.5) {
    alpha *= (v_lit > 1.0 ? 0.35 : 0.12) * (1.0 - abs(v_side));
  } else if (v_meta.x > 0.5) {
    // A weak tie: dashes flowing from the influencer to the influenced.
    float dash = fract(v_t * 46.0 - u_time * u_motion * 0.8);
    alpha *= dash < 0.4 ? 0.65 : 0.0;
  } else if (u_motion > 0.5 && p >= 1.0) {
    // The comet: a bright head flying along, its tail fading behind it.
    float head = fract(u_time / ${COMET.periodMs.toFixed(1)} * 1000.0 + v_meta.y);
    float d = head - v_t;
    if (d >= 0.0 && d < u_tail) {
      float k = 1.0 - d / u_tail;
      k *= k;
      rgb = mix(rgb, vec3(1.0), k * 0.9);
      alpha = min(1.0, alpha * (0.7 + k));
    } else {
      alpha *= 0.62;
    }
  }
  fragColor = vec4(rgb * alpha, alpha);
}`;

interface Program {
  program: WebGLProgram;
  attribs: Record<string, number>;
  uniforms: Record<string, WebGLUniformLocation | null>;
}

const ATTRIBS: [name: string, size: number][] = [
  ['a_pos', 3],
  ['a_prev', 3],
  ['a_next', 3],
  ['a_side', 1],
  ['a_t', 1],
  ['a_color', 4],
  ['a_width', 1],
  ['a_meta', 4],
  ['a_from_end', 1],
];

const UNIFORMS = [
  'u_projection_matrix',
  'u_projection_fallback_matrix',
  'u_projection_tile_mercator_coords',
  'u_projection_clipping_plane',
  'u_projection_transition',
  'u_viewport',
  'u_pixel_ratio',
  'u_width_scale',
  'u_lit',
  'u_lift',
  'u_elapsed',
  'u_per_link',
  'u_time',
  'u_glow',
  'u_motion',
  'u_tail',
];

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('arcLayer: no shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`arcLayer: ${log}`);
  }
  return shader;
}

export type ArcRamps = Record<
  LinkSide,
  readonly [number, number, number, number][]
>;

/** The arc layer: add it to the map, then feed it lines. */
export class ArcLayer implements CustomLayerInterface {
  readonly id = ARC_LAYER_ID;
  readonly type = 'custom' as const;
  readonly renderingMode = '2d' as const;

  private map: MapLibreMap | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private programs = new Map<string, Program>();
  private vbo: WebGLBuffer | null = null;
  private ibo: WebGLBuffer | null = null;
  private count = 0;
  private dirty = false;
  private lines: ArcLine[] = [];
  private projection: ArcProjection | null = null;
  private drawStart = SHOWN;
  private lit = -1;
  private hover = -1;

  /** Whether comets fly and dashes flow (not under reduced motion). */
  motion = true;
  /** The lifted region's lift now, px (signals.lift). */
  lift = () => 0;

  constructor(private readonly ramps: ArcRamps) {}

  onAdd(map: MapLibreMap, gl: WebGLRenderingContext | WebGL2RenderingContext) {
    this.map = map;
    this.gl = gl as WebGL2RenderingContext;
    this.vbo = gl.createBuffer();
    this.ibo = gl.createBuffer();
    this.dirty = true;
  }

  onRemove(
    _map: MapLibreMap,
    gl: WebGLRenderingContext | WebGL2RenderingContext,
  ) {
    for (const p of this.programs.values()) gl.deleteProgram(p.program);
    this.programs.clear();
    if (this.vbo) gl.deleteBuffer(this.vbo);
    if (this.ibo) gl.deleteBuffer(this.ibo);
    this.map = null;
    this.gl = null;
  }

  /**
   * New links: shown at once, or held back (`wait`) until drawOn starts
   * them (a new stop's, once the map has flown there).
   */
  setLines(lines: ArcLine[], show: 'now' | 'wait') {
    this.lines = lines;
    this.drawStart = show === 'now' ? SHOWN : WAITING;
    this.dirty = true;
    this.map?.triggerRepaint();
  }

  /** Show the links drawn, now. */
  showAll() {
    this.drawStart = SHOWN;
    this.map?.triggerRepaint();
  }

  /** Start drawing the current links on now. */
  drawOn(at: number) {
    this.drawStart = at;
    this.map?.triggerRepaint();
  }

  /** Whether links are still drawing on. */
  drawing(now: number) {
    return now - this.drawStart < DRAW_MS.total + DRAW_MS.perLink;
  }

  hasLines() {
    return this.lines.length > 0;
  }

  /** A card pointing at a link (`linkFocus`), and the pointer over one. */
  setFocus(id: string | null) {
    this.lit = this.indexOf(id);
    this.map?.triggerRepaint();
  }

  setHover(id: string | null) {
    this.hover = this.indexOf(id);
    this.map?.triggerRepaint();
  }

  private indexOf(id: string | null) {
    return id === null ? -1 : this.lines.findIndex((l) => l.id === id);
  }

  /** The link under `point` (CSS px), as last drawn. */
  pick(point: { x: number; y: number }): ArcLine | null {
    if (!this.projection || this.lines.length === 0) return null;
    return pickArc(this.lines, point, {
      ...this.projection,
      lift: this.lift(),
    });
  }

  private programFor(
    gl: WebGL2RenderingContext,
    shaderData: CustomRenderMethodInput['shaderData'],
  ): Program {
    const cached = this.programs.get(shaderData.variantName);
    if (cached) return cached;
    const program = gl.createProgram();
    if (!program) throw new Error('arcLayer: no program');
    gl.attachShader(
      program,
      compile(
        gl,
        gl.VERTEX_SHADER,
        VERTEX(shaderData.vertexShaderPrelude, shaderData.define),
      ),
    );
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`arcLayer: ${gl.getProgramInfoLog(program)}`);
    }
    const attribs: Record<string, number> = {};
    for (const [name] of ATTRIBS) {
      attribs[name] = gl.getAttribLocation(program, name);
    }
    const uniforms: Program['uniforms'] = {};
    for (const name of UNIFORMS) {
      uniforms[name] = gl.getUniformLocation(program, name);
    }
    const made = { program, attribs, uniforms };
    this.programs.set(shaderData.variantName, made);
    return made;
  }

  render(
    gl: WebGL2RenderingContext | WebGLRenderingContext,
    args: CustomRenderMethodInput,
  ) {
    const gl2 = gl as WebGL2RenderingContext;
    const map = this.map;
    if (!map) return;
    const data = args.defaultProjectionData;
    const globe = args.shaderData.define.includes('GLOBE');
    const canvas = map.getCanvas();
    this.projection = {
      globe,
      mainMatrix: data.mainMatrix,
      fallbackMatrix: data.fallbackMatrix,
      clippingPlane: [...data.clippingPlane],
      transition: data.projectionTransition,
      width: canvas.clientWidth,
      height: canvas.clientHeight,
      lift: 0,
    };
    if (this.dirty) {
      const { vertices, indices } = arcBuffers(this.lines, this.ramps);
      gl2.bindBuffer(gl2.ARRAY_BUFFER, this.vbo);
      gl2.bufferData(gl2.ARRAY_BUFFER, vertices, gl2.STATIC_DRAW);
      gl2.bindBuffer(gl2.ELEMENT_ARRAY_BUFFER, this.ibo);
      gl2.bufferData(gl2.ELEMENT_ARRAY_BUFFER, indices, gl2.STATIC_DRAW);
      this.count = indices.length;
      this.dirty = false;
    }
    if (this.count === 0) return;

    const prog = this.programFor(gl2, args.shaderData);
    gl2.useProgram(prog.program);
    gl2.bindBuffer(gl2.ARRAY_BUFFER, this.vbo);
    gl2.bindBuffer(gl2.ELEMENT_ARRAY_BUFFER, this.ibo);
    let offset = 0;
    for (const [name, size] of ATTRIBS) {
      const loc = prog.attribs[name];
      if (loc >= 0) {
        gl2.enableVertexAttribArray(loc);
        gl2.vertexAttribPointer(
          loc,
          size,
          gl2.FLOAT,
          false,
          ARC_STRIDE * 4,
          offset * 4,
        );
      }
      offset += size;
    }

    const u = prog.uniforms;
    const now = performance.now();
    const ratio = window.devicePixelRatio || 1;
    gl2.uniformMatrix4fv(u.u_projection_matrix, false, data.mainMatrix);
    gl2.uniformMatrix4fv(
      u.u_projection_fallback_matrix,
      false,
      data.fallbackMatrix,
    );
    gl2.uniform4f(
      u.u_projection_tile_mercator_coords,
      ...data.tileMercatorCoords,
    );
    gl2.uniform4f(u.u_projection_clipping_plane, ...data.clippingPlane);
    gl2.uniform1f(u.u_projection_transition, data.projectionTransition);
    gl2.uniform2f(
      u.u_viewport,
      gl2.drawingBufferWidth,
      gl2.drawingBufferHeight,
    );
    gl2.uniform1f(u.u_pixel_ratio, ratio);
    gl2.uniform1f(u.u_lit, this.lit >= 0 ? this.lit : this.hover);
    gl2.uniform1f(u.u_lift, this.lift());
    gl2.uniform1f(u.u_elapsed, now - this.drawStart);
    gl2.uniform1f(u.u_per_link, DRAW_MS.perLink);
    gl2.uniform1f(u.u_time, (now % 1_000_000) / 1000);
    gl2.uniform1f(u.u_motion, this.motion ? 1 : 0);
    gl2.uniform1f(u.u_tail, COMET.tail);

    gl2.disable(gl2.DEPTH_TEST);
    gl2.enable(gl2.BLEND);
    gl2.blendFunc(gl2.ONE, gl2.ONE_MINUS_SRC_ALPHA);
    // A soft light under each, then the arcs.
    gl2.uniform1f(u.u_glow, 1);
    gl2.uniform1f(u.u_width_scale, 3);
    gl2.drawElements(gl2.TRIANGLES, this.count, gl2.UNSIGNED_INT, 0);
    gl2.uniform1f(u.u_glow, 0);
    gl2.uniform1f(u.u_width_scale, 1);
    gl2.drawElements(gl2.TRIANGLES, this.count, gl2.UNSIGNED_INT, 0);

    for (const [name] of ATTRIBS) {
      const loc = prog.attribs[name];
      if (loc >= 0) gl2.disableVertexAttribArray(loc);
    }
  }
}

/** The arc layer each map has, once added (useNetworkLayers adds it). */
const layers = new WeakMap<MapLibreMap, ArcLayer>();

export const arcLayerOf = (map: MapLibreMap): ArcLayer | undefined =>
  layers.get(map);

export function setArcLayer(map: MapLibreMap, layer: ArcLayer | null) {
  if (layer) layers.set(map, layer);
  else layers.delete(map);
}
