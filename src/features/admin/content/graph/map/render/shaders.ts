/**
 * The Mind Map's WebGL2 shader sources (design §1, option d).
 *
 * Everything a frame needs about a node lives in small textures indexed by
 * the node's number: its position (RG32F, rewritten on every layout tick),
 * its base radius (R32F), its colour (RGBA8), its flags (R8UI) and its hover
 * state (R8UI). Nothing per node is stored in vertex buffers, so a layout
 * tick is one texture upload whatever the number of lines, and any single
 * node can be drawn again on its own (the hovered node goes on top).
 *
 * Three programs draw a frame, back to front:
 *
 * 1. Lines: one instanced quad per line. The vertex shader looks up both
 *    ends' positions, so lines follow the layout without being re-uploaded.
 *    Each runs from the edge of one dot to the edge of the other, as
 *    Obsidian's do, so no line shows through a see-through dot (a missing
 *    item, or one faded under a hover), and two dots that overlap have no
 *    line between them. They keep a constant on-screen width, and are
 *    optionally dotted (guessed) or dashed (unconfirmed) once they are long
 *    enough on screen.
 * 2. Arrows: two instances per line, one per direction, collapsed to nothing
 *    when that direction is absent or arrows are off. Each is Obsidian's
 *    notched dart, its tip just outside the dot it points at.
 * 3. Nodes: one instanced quad per node, shaded as an antialiased circle,
 *    with a ring in the highlight colour for the hovered node and for
 *    flagged ones: Obsidian's hairline, √scale device pixels, held between
 *    one and two CSS pixels (`ringDeviceWidth` in `model/sizing.ts`). A
 *    node is always filled with its own colour, hovered or not. A node
 *    flagged as an end (Tesseract's "a progression ends here") is filled
 *    as a ring with a dot inside it instead, still in its own colour, so it
 *    never reads as the white highlight ring.
 *
 * A line is lit in the highlight when it joins the hovered node to a node
 * the hover lights (in Cortex, every neighbour), or when both its ends are
 * on a lit path (`NODE_STATE_PATH`, Tesseract's way back to the root).
 *
 * Screen space inside the shaders is device pixels measured from the centre
 * of the canvas, y pointing down; `toClip` turns it into clip space. Sizes
 * follow Obsidian, which works in device pixels: its scale is device pixels
 * per world unit, which is the camera's zoom (CSS pixels per world unit)
 * times the pixel ratio (`deviceScale`). A dot is its radius times √scale
 * device pixels across, and a line is `lineSize` device pixels wide, so one
 * device pixel by default (`model/sizing.ts` explains the two kinds of
 * pixel).
 *
 * The uniform name `u_atlasNodePositions` doubles as a bundle marker: the
 * production bundle check looks for it to prove this code never reaches an
 * eager (entry) chunk. Do not rename it without updating that check.
 */

/** The marker the bundle guard searches for; also the positions sampler's name. */
export const SHADER_MARKER = 'u_atlasNodePositions';

/**
 * Declarations and helpers shared by every vertex shader: the node textures,
 * the camera, and the world → screen → clip transforms.
 */
const COMMON = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
precision highp usampler2D;

uniform highp sampler2D u_atlasNodePositions; // RG32F, world units
uniform highp sampler2D u_nodeRadius;         // R32F, device px at scale 1
uniform highp usampler2D u_nodeState;         // R8UI, 0 normal 1 lit 2 hovered
uniform int u_texWidth;
uniform vec3 u_camera;   // world x, world y at the canvas centre; zoom (CSS px per unit)
uniform vec2 u_viewport; // device px
uniform float u_dpr;
uniform float u_fade;    // 0 nothing hovered … 1 hover fully applied

ivec2 texelOf(uint i) {
  uint w = uint(u_texWidth);
  return ivec2(int(i % w), int(i / w));
}
vec2 nodePos(uint i) { return texelFetch(u_atlasNodePositions, texelOf(i), 0).rg; }
float nodeRadius(uint i) { return texelFetch(u_nodeRadius, texelOf(i), 0).r; }
uint nodeState(uint i) { return texelFetch(u_nodeState, texelOf(i), 0).r; }

// Obsidian's scale: device px per world unit.
float deviceScale() { return u_camera.z * u_dpr; }
vec2 toScreen(vec2 world) { return (world - u_camera.xy) * deviceScale(); }
vec4 toClip(vec2 screen) {
  return vec4(screen.x * 2.0 / u_viewport.x, -screen.y * 2.0 / u_viewport.y, 0.0, 1.0);
}
`;

/* ── Lines ─────────────────────────────────────────────────────────────── */

export const LINE_VERTEX = /* glsl */ `${COMMON}
// Per vertex: x is 0 at the first end and 1 at the second; y is the side.
in vec2 a_corner;
// Per line: the two node numbers, and the line's flags.
in uvec2 a_ends;
in uint a_flags;

uniform float u_lineWidth;  // device px
uniform float u_nodeSize;
uniform float u_minRadius;  // device px: the smallest dot drawn
uniform bool u_confidence;
uniform vec4 u_lineColor;   // straight alpha
uniform vec4 u_lineLit;     // the hovered node's lines
uniform float u_dimAlpha;
uniform float u_patternMin; // device px: shorter lines are always solid

out float v_across;   // device px from the centreline
out float v_along;    // device px from the first end
flat out float v_halfWidth;
flat out float v_coverage;
flat out vec4 v_color;
flat out uint v_pattern; // 0 solid, 1 dotted, 2 dashed

void main() {
  vec2 from = toScreen(nodePos(a_ends.x));
  vec2 to = toScreen(nodePos(a_ends.y));
  vec2 d = to - from;
  float centres = length(d);
  vec2 dir = centres > 1e-4 ? d / centres : vec2(1.0, 0.0);
  vec2 normal = vec2(-dir.y, dir.x);
  // From one dot's edge to the other's (Obsidian trims its lines so): each
  // end's radius on screen, as the node shader draws it.
  float root = sqrt(deviceScale());
  float ra = max(nodeRadius(a_ends.x) * u_nodeSize * root, u_minRadius);
  float rb = max(nodeRadius(a_ends.y) * u_nodeSize * root, u_minRadius);
  float len = centres - ra - rb;
  if (len <= 0.0) {
    // The dots overlap: no line shows between them.
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0); // outside the clip volume
    v_across = 0.0;
    v_along = 0.0;
    v_halfWidth = 0.0;
    v_coverage = 0.0;
    v_color = vec4(0.0);
    v_pattern = 0u;
    return;
  }
  vec2 a = from + dir * ra;
  vec2 b = to - dir * rb;
  // Lines thinner than a device pixel are drawn one pixel wide and fainter.
  float width = max(u_lineWidth, 1.0);
  float pad = width * 0.5 + 1.0;
  vec2 p = mix(a, b, a_corner.x) + normal * (a_corner.y * pad);
  gl_Position = toClip(p);

  v_across = a_corner.y * pad;
  v_along = a_corner.x * len;
  v_halfWidth = width * 0.5;
  v_coverage = min(u_lineWidth, 1.0);

  // Lit in the highlight: a line from the hovered node to one it lights
  // (Cortex lights every neighbour, so every line it has), or a line along
  // a lit path, both ends on it (state 3: Tesseract's way back to the root).
  uint sa = nodeState(a_ends.x);
  uint sb = nodeState(a_ends.y);
  bool lit = sa != 0u && sb != 0u &&
    (sa == 2u || sb == 2u || (sa == 3u && sb == 3u));
  vec4 c = u_lineColor;
  if (lit) c = mix(c, u_lineLit, u_fade);
  else c.a *= mix(1.0, u_dimAlpha, u_fade);
  v_color = c;

  v_pattern = 0u;
  if (u_confidence && len >= u_patternMin) {
    if ((a_flags & 1u) != 0u) v_pattern = 1u;
    else if ((a_flags & 2u) != 0u) v_pattern = 2u;
  }
}
`;

export const LINE_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
precision highp int;

uniform float u_dpr;

in float v_across;
in float v_along;
flat in float v_halfWidth;
flat in float v_coverage;
flat in vec4 v_color;
flat in uint v_pattern;

out vec4 outColor;

void main() {
  float cover = clamp(v_halfWidth + 0.5 - abs(v_across), 0.0, 1.0) * v_coverage;
  if (v_pattern == 1u) {
    // Dotted: a 1.5 px dot every 4 px.
    float m = mod(v_along, 4.0 * u_dpr);
    cover *= clamp(1.5 * u_dpr - m + 0.5, 0.0, 1.0);
  } else if (v_pattern == 2u) {
    // Dashed: a 6 px dash every 10 px.
    float m = mod(v_along, 10.0 * u_dpr);
    cover *= clamp(6.0 * u_dpr - m + 0.5, 0.0, 1.0);
  }
  float a = v_color.a * cover;
  if (a <= 0.002) discard;
  outColor = vec4(v_color.rgb * a, a);
}
`;

/* ── Arrows ────────────────────────────────────────────────────────────── */

export const ARROW_VERTEX = /* glsl */ `${COMMON}
// Per vertex: the dart's two triangles, tip at the origin, pointing along
// +x, one unit long (Obsidian's (0,0) (-4,-2) (-3,0) (-4,2), over 4).
in vec2 a_corner;
// Per line, shared by its two instances (divisor 2).
in uvec2 a_ends;
in uint a_flags;

uniform float u_nodeSize;
uniform float u_arrowSize;  // device px, tip to back
uniform float u_arrowAlpha; // 0 hides arrows (off, or zoomed out)
uniform vec4 u_arrowColor;  // straight alpha
uniform float u_dimAlpha;

flat out vec4 v_color;

void main() {
  // Even instances point at the pair's second node, odd ones at its first.
  bool backward = (gl_InstanceID & 1) == 1;
  uint need = backward ? 8u : 4u;
  uint from = backward ? a_ends.y : a_ends.x;
  uint to = backward ? a_ends.x : a_ends.y;
  if (u_arrowAlpha <= 0.0 || (a_flags & need) == 0u) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0); // outside the clip volume
    v_color = vec4(0.0);
    return;
  }
  vec2 a = toScreen(nodePos(from));
  vec2 b = toScreen(nodePos(to));
  vec2 d = b - a;
  float len = length(d);
  vec2 dir = len > 1e-4 ? d / len : vec2(1.0, 0.0);
  vec2 normal = vec2(-dir.y, dir.x);
  // The tip sits one world unit outside the dot, as in Obsidian.
  float scale = deviceScale();
  float r = nodeRadius(to) * u_nodeSize * sqrt(scale) + scale;
  vec2 tip = b - dir * r;
  vec2 p = tip + dir * (a_corner.x * u_arrowSize) + normal * (a_corner.y * u_arrowSize);
  gl_Position = toClip(p);

  // The hovered node's arrows keep their strength; the rest fade with it.
  bool lit = nodeState(from) == 2u || nodeState(to) == 2u;
  vec4 c = u_arrowColor;
  if (!lit) c.a *= mix(1.0, u_dimAlpha, u_fade);
  c.a *= u_arrowAlpha;
  v_color = c;
}
`;

export const ARROW_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;

flat in vec4 v_color;
out vec4 outColor;

void main() {
  if (v_color.a <= 0.002) discard;
  outColor = vec4(v_color.rgb * v_color.a, v_color.a);
}
`;

/* ── Nodes ─────────────────────────────────────────────────────────────── */

export const NODE_VERTEX = /* glsl */ `${COMMON}
// Per vertex: the quad's corners, -1..1.
in vec2 a_corner;

uniform highp sampler2D u_nodeColor;   // RGBA8, straight alpha
uniform highp usampler2D u_nodeFlags;  // R8UI
uniform int u_indexOffset; // draws one chosen node again, on top
uniform float u_nodeSize;
uniform vec4 u_ring;       // the highlight, round hovered and flagged nodes
uniform float u_dimAlpha;
uniform float u_minRadius; // device px

out vec2 v_local;      // device px from the node's centre
flat out float v_radius;
flat out float v_ringWidth;
flat out float v_hole;  // an end's hollow: the gap's outer radius, 0 for a solid dot
flat out float v_dot;   // an end's inner dot radius
flat out vec4 v_color;
flat out vec4 v_ringColor;

void main() {
  uint i = uint(gl_InstanceID + u_indexOffset);
  ivec2 t = texelOf(i);
  vec2 centre = toScreen(nodePos(i));
  uint state = nodeState(i);
  uint flags = texelFetch(u_nodeFlags, t, 0).r;
  vec4 c = texelFetch(u_nodeColor, t, 0);

  float r = max(nodeRadius(i) * u_nodeSize * sqrt(deviceScale()), u_minRadius);
  bool hovered = state == 2u;
  bool ringed = hovered || (flags & 1u) != 0u;
  // Obsidian's hairline, max(1, √scale) device px, kept to 1–2 CSS px.
  float ringWidth = ringed ? clamp(sqrt(deviceScale()), u_dpr, 2.0 * u_dpr) : 0.0;
  float outer = r + ringWidth + 1.0;
  v_local = a_corner * outer;
  v_radius = r;
  v_ringWidth = ringWidth;
  // An end (flag 2, Tesseract's "a progression ends here"): a ring in the
  // node's own colour with a dot inside it. Too small for both, it stays solid.
  bool hollow = (flags & 2u) != 0u;
  float hole = hollow ? max(r - max(1.25 * u_dpr, r * 0.3), 0.0) : 0.0;
  v_hole = hole;
  v_dot = hole > 0.0 ? max(min(r * 0.38, hole - 0.75 * u_dpr), 0.0) : 0.0;
  gl_Position = toClip(centre + v_local);

  // The hovered node keeps its own colour; only its ring fades in.
  vec4 ring = u_ring;
  if (hovered) {
    ring.a *= u_fade;
  } else if (state == 0u) {
    float dim = mix(1.0, u_dimAlpha, u_fade);
    c.a *= dim;
    ring.a *= dim;
  }
  v_color = c;
  v_ringColor = ring;
}
`;

export const NODE_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;

in vec2 v_local;
flat in float v_radius;
flat in float v_ringWidth;
flat in float v_hole;
flat in float v_dot;
flat in vec4 v_color;
flat in vec4 v_ringColor;

out vec4 outColor;

void main() {
  float d = length(v_local);
  float inner = clamp(v_radius - d + 0.5, 0.0, 1.0);
  float body = inner;
  if (v_hole > 0.0) {
    // The disc, less the gap, plus the dot in the middle.
    float gap = clamp(v_hole - d + 0.5, 0.0, 1.0);
    float pip = clamp(v_dot - d + 0.5, 0.0, 1.0);
    body = max(inner - gap, 0.0) + pip;
  }
  float fill = v_color.a * body;
  float ring = 0.0;
  if (v_ringWidth > 0.0) {
    float outer = clamp(v_radius + v_ringWidth - d + 0.5, 0.0, 1.0);
    ring = v_ringColor.a * max(outer - inner, 0.0);
  }
  float a = fill + ring;
  if (a <= 0.002) discard;
  outColor = vec4(v_color.rgb * fill + v_ringColor.rgb * ring, a);
}
`;
