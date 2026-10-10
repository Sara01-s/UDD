(function () {
'use strict';

const HEADER = `#version 300 es
precision highp float;
precision highp int;
uniform vec2 uRes;
uniform float uTime;
uniform float uParam;
out vec4 outColor;
#define PI 3.14159265359
#define TAU 6.28318530718
#define BG vec3(0.106, 0.071, 0.227) // brand Indigo Dark #1B123A
#define CORAL vec3(1.0, 0.443, 0.435)
#define ACCENT vec3(0.976, 0.639, 0.196)
#define YELLOW vec3(0.976, 0.933, 0.204)
#define CYAN vec3(0.482, 0.851, 0.882)
#define BLUE vec3(0.008, 0.592, 0.996)
#define INK vec3(0.188, 0.157, 0.478)
#define GBG vec3(0.075, 0.063, 0.2)
#define ASPECT vec2(uRes.x / uRes.y, 1.)
`;

const LIB = `
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
float saturate(float x) { return clamp(x, 0., 1.); }
vec2 saturate(vec2 x) { return clamp(x, 0., 1.); }
vec3 saturate(vec3 x) { return clamp(x, 0., 1.); }
float luminance(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
// Screen coords with height = 2. On panes narrower than FIT_W the view zooms out so that
// at least FIT_W units fit horizontally (portrait panes would otherwise crop the scene).
vec2 toScreen(vec2 uv, vec2 size) {
  float a = size.x / size.y;
  return (uv * 2. - 1.) * vec2(a, 1.) * max(1., FIT_W / a);
}
vec2 aspectUV(vec2 uv) { return toScreen(uv, uRes); }
vec3 toSRGB(vec3 c) { return pow(saturate(c), vec3(1. / 2.2)); }

vec3 hue2rgb(float h) { return clamp(abs(fract(h + vec3(0., 2., 1.) / 3.) * 6. - 3.) - 1., 0., 1.); }
vec3 hsv2rgb(vec3 c) { return c.z * mix(vec3(1.), hue2rgb(c.x), c.y); }
vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0., -1. / 3., 2. / 3., -1.);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6. * d + e)), d / (q.x + e), q.x);
}

vec3 viridis(float t) {
  const vec3 c0 = vec3(0.2777273272234177, 0.005407344544966578, 0.3340998053353061);
  const vec3 c1 = vec3(0.1050930431085774, 1.404613529898575, 1.384590162594685);
  const vec3 c2 = vec3(-0.3308618287255563, 0.214847559468213, 0.09509516302823659);
  const vec3 c3 = vec3(-4.634230498983486, -5.799100973351585, -19.33244095627987);
  const vec3 c4 = vec3(6.228269936347081, 14.17993336680509, 56.69055260068105);
  const vec3 c5 = vec3(4.776384997670288, -13.74514537774601, -65.35303263337234);
  const vec3 c6 = vec3(-5.435455855934631, 4.645852612178535, 26.3124352495832);
  t = saturate(t);
  return c0 + t * (c1 + t * (c2 + t * (c3 + t * (c4 + t * (c5 + t * c6)))));
}

vec3 turbo(float x) {
  const vec4 kR4 = vec4(0.13572138, 4.61539260, -42.66032258, 132.13108234);
  const vec4 kG4 = vec4(0.09140261, 2.19418839, 4.84296658, -14.18503333);
  const vec4 kB4 = vec4(0.10667330, 12.64194608, -60.58204836, 110.36276771);
  const vec2 kR2 = vec2(-152.94239396, 59.28637943);
  const vec2 kG2 = vec2(4.27729857, 2.82956604);
  const vec2 kB2 = vec2(-89.90310912, 27.34824973);
  x = saturate(x);
  vec4 v4 = vec4(1., x, x * x, x * x * x);
  vec2 v2 = v4.zw * v4.z;
  return vec3(dot(v4, kR4) + dot(v2, kR2), dot(v4, kG4) + dot(v2, kG2), dot(v4, kB4) + dot(v2, kB2));
}

uint pcg(uint v) {
  uint s = v * 747796405u + 2891336453u;
  uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
  return (w >> 22u) ^ w;
}
float hash12(vec2 p) {
  uvec2 q = uvec2(ivec2(floor(p)) + 32768);
  return float(pcg(q.x + pcg(q.y))) / 4294967295.;
}
vec3 hashColor(uint id) {
  uint h = pcg(id);
  return vec3(float(h & 255u), float((h >> 8u) & 255u), float((h >> 16u) & 255u)) / 255.;
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3. - 2. * f);
  float a = hash12(i), b = hash12(i + vec2(1., 0.));
  float c = hash12(i + vec2(0., 1.)), d = hash12(i + vec2(1., 1.));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0., a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return s / 0.96875;
}

float bayer4(vec2 p) {
  const float m[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
  ivec2 i = ivec2(mod(p, 4.));
  return (m[i.y * 4 + i.x] + 0.5) / 16.;
}
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
float ditherQuant(float v, float levels, float th) {
  float x = v * (levels - 1.);
  return (floor(x) + step(th, fract(x))) / (levels - 1.);
}

// ---------- procedural test images ----------
// brand colours (Gamelogic palette): sky Carrot -> Indigo Light, sun Lemon Light, hills Apple / Apple Dark
const vec3 BRAND_DOTS[4] = vec3[4](vec3(1.000, 0.443, 0.435), vec3(0.008, 0.592, 0.996), vec3(0.976, 0.933, 0.204), vec3(0.482, 0.851, 0.882));
vec3 testImage(vec2 uv, float t) {
  vec3 col = mix(vec3(0.976, 0.639, 0.196), vec3(0.373, 0.322, 0.784), smoothstep(0.2, 1.0, uv.y));
  float sd = length((uv - vec2(0.72, 0.66)) * ASPECT);
  col = mix(col, vec3(0.988, 0.969, 0.604), step(sd, 0.1));
  float h1 = 0.42 + 0.06 * sin(uv.x * 7. + 1.3) + 0.03 * sin(uv.x * 19. + t * 0.4);
  col = mix(col, vec3(0.463, 0.784, 0.239), step(uv.y, h1));
  float h2 = 0.24 + 0.05 * sin(uv.x * 11. - t * 0.3 + 2.);
  col = mix(col, vec3(0.102, 0.565, 0.176), step(uv.y, h2));
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    vec2 c = vec2(fract(0.15 + fi * 0.27 + t * 0.03 * (1. + fi * 0.3)), 0.1 + 0.16 * fract(fi * 0.618));
    float d = length((uv - c) * ASPECT);
    col = mix(col, BRAND_DOTS[i], step(d, 0.05 + 0.015 * fi));
  }
  return col;
}
vec3 testImageHDR(vec2 uv, float t) {
  vec3 col = testImage(uv, t);
  float sd = length((uv - vec2(0.72, 0.66)) * ASPECT);
  float k = 3.5 + 3. * sin(t * 0.8);
  return col + vec3(1.0, 0.8, 0.5) * exp(-sd * sd * 60.) * k + vec3(1.0, 0.9, 0.7) * step(sd, 0.1) * k;
}
vec3 uvGrid(vec2 uv) {
  vec2 g = uv * 8.;
  vec2 c = floor(g), f = fract(g);
  float chk = mod(c.x + c.y, 2.);
  vec3 tint = vec3(uv.x, uv.y, 1. - uv.x) * 0.75 + 0.25;
  vec3 col = tint * (0.55 + 0.4 * chk);
  float line = 1. - step(0.035, min(min(f.x, f.y), min(1. - f.x, 1. - f.y)));
  return mix(col, vec3(0.08), line);
}
vec3 hlsMap(vec2 uv) {
  vec3 c = hue2rgb(uv.x);
  float l = uv.y;
  return l < 0.5 ? c * l * 2. : mix(c, vec3(1.), l * 2. - 1.);
}
vec3 colorGrid(vec2 uv) {
  vec2 g = uv * vec2(6., 4.);
  vec2 c = floor(g), f = fract(g);
  float h = c.x / 6.;
  vec3 col;
  if (c.y > 2.5) col = hue2rgb(h);
  else if (c.y > 1.5) col = hue2rgb(h + 1. / 12.);
  else if (c.y > 0.5) col = mix(hue2rgb(h), vec3(1.), 0.5) * 0.9;
  else col = vec3(c.x / 5.);
  vec2 cellPx = uRes / vec2(6., 4.);
  vec2 b = min(f, 1. - f) * cellPx;
  return mix(vec3(0.06), col, step(min(cellPx.x, cellPx.y) * 0.05, min(b.x, b.y)));
}
vec3 polarGrid(vec2 p) {
  float r = length(p), a = atan(p.y, p.x);
  float ringD = abs(fract(r * 5. + 0.5) - 0.5) / 5.;
  float spokeD = abs(fract(a / TAU * 24. + 0.5) - 0.5) * TAU / 24. * r;
  float w = 0.01, aa = 2.5 / uRes.y;
  vec3 col = vec3(0.07);
  col = mix(col, hue2rgb(a / TAU + 0.5) * 0.8 + 0.2, 1. - smoothstep(w - aa, w + aa, spokeD));
  col = mix(col, vec3(0.95), 1. - smoothstep(w - aa, w + aa, ringD));
  return col;
}
float pointImg(ivec2 ip) { return ip == ivec2(80, 45) ? 1. : 0.; }
vec3 rgbwImg(ivec2 ip) {
  if (ip == ivec2(68, 50)) return vec3(1., 0., 0.);
  if (ip == ivec2(82, 50)) return vec3(0., 1., 0.);
  if (ip == ivec2(75, 38)) return vec3(0., 0., 1.);
  if (ip == ivec2(100, 44)) return vec3(1.);
  return vec3(0.);
}
// 90-cell-tall pixel grid with square cells at any aspect; cell (80, 45) of a 160x90 grid stays at the center.
ivec2 gridCell(vec2 uv) {
  ivec2 grid = ivec2(floor(90. * ASPECT.x + 0.5), 90);
  return ivec2(floor(uv * vec2(grid))) + ivec2(80, 45) - grid / 2;
}

// ---------- 3x5 digit font ----------
const uint FONT[10] = uint[10](0x7B6Fu, 0x749Au, 0x73E7u, 0x79E7u, 0x49EDu, 0x79CFu, 0x7BCFu, 0x4927u, 0x7BEFu, 0x79EFu);
float digitBit(uint d, vec2 p) {
  uvec2 cell = uvec2(p * vec2(3., 5.));
  uint bit = (4u - cell.y) * 3u + cell.x;
  return float((FONT[d] >> bit) & 1u);
}
float printInt(uint value, vec2 uv, uint count) {
  if (any(lessThan(uv, vec2(0.))) || any(greaterThanEqual(uv, vec2(1.)))) return 0.;
  uint index = uint(uv.x * float(count));
  for (uint k = index + 1u; k < count; k++) value /= 10u;
  vec2 p = vec2(fract(uv.x * float(count)) * 1.25, uv.y);
  if (p.x >= 1.) return 0.;
  return digitBit(value % 10u, p);
}
float printIntPx(uint value, vec2 frag, vec2 origin, float px, uint count) {
  return printInt(value, (frag - origin) / vec2(float(count) * 3.75 * px, 5. * px), count);
}

// ---------- SDF primitives ----------
float sdBox(vec3 p, vec3 b) { vec3 q = abs(p) - b; return length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.); }
float sdTorus(vec3 p, vec2 t) { vec2 q = vec2(length(p.xz) - t.x, p.y); return length(q) - t.y; }
float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.);
  return length(pa - ba * h) - r;
}
float sdPyramid(vec3 p, float h) {
  float m2 = h * h + 0.25;
  p.xz = abs(p.xz);
  p.xz = (p.z > p.x) ? p.zx : p.xz;
  p.xz -= 0.5;
  vec3 q = vec3(p.z, h * p.y - 0.5 * p.x, h * p.x + 0.5 * p.y);
  float s = max(-q.x, 0.);
  float t = clamp((q.y - 0.5 * p.z) / (m2 + 0.25), 0., 1.);
  float a = m2 * (q.x + s) * (q.x + s) + q.y * q.y;
  float b = m2 * (q.x + 0.5 * t) * (q.x + 0.5 * t) + (q.y - m2 * t) * (q.y - m2 * t);
  float d2 = min(q.y, -q.x * m2 - q.y * 0.5) > 0. ? 0. : min(a, b);
  return sqrt((d2 + q.z * q.z) / m2) * sign(max(q.z, -p.y));
}
vec2 planarUV(vec3 p, vec3 n) {
  vec3 a = abs(n);
  vec2 uv = (a.x > a.y && a.x > a.z) ? p.zy : (a.y > a.z ? p.xz : p.xy);
  return fract(uv * 0.5 + 0.5);
}
`;

const MAPS = {
  none: `
vec2 map(vec3 p) { return vec2(1e9, -1.); }
vec2 objUV(vec3 p, vec3 n, float id) { return vec2(0.); }
`,
  sphere: `
#define CAM_DIST 3.4
#define CAM_ELEV 0.25
vec2 map(vec3 p) { return vec2(length(p) - 1., 1.); }
vec2 objUV(vec3 p, vec3 n, float id) {
  vec3 q = normalize(p);
  return vec2(atan(q.z, q.x) / TAU + 0.5, acos(clamp(q.y, -1., 1.)) / PI);
}
`,
  showcase: `
#define CAM_DIST 5.7
#define CAM_ELEV 0.36
#define CAM_TARGET vec3(0., -0.1, 0.)
vec2 map(vec3 p) {
  vec2 r = vec2(p.y + 1., 0.);
  float d = length(p - vec3(-2.3, 0., 0.)) - 1.;
  if (d < r.x) r = vec2(d, 1.);
  d = sdBox(p, vec3(0.75)) - 0.12;
  if (d < r.x) r = vec2(d, 2.);
  vec3 q = p - vec3(2.3, 0.05, 0.);
  d = length(vec2(length(q.xy) - 0.75, q.z)) - 0.28;
  if (d < r.x) r = vec2(d, 3.);
  return r;
}
vec2 objUV(vec3 p, vec3 n, float id) {
  if (id < 0.5) return fract(p.xz * 0.25);
  if (id < 1.5) {
    vec3 q = normalize(p - vec3(-2.3, 0., 0.));
    return vec2(atan(q.z, q.x) / TAU + 0.5, acos(clamp(q.y, -1., 1.)) / PI);
  }
  if (id < 2.5) {
    vec3 a = abs(n);
    vec2 uv = (a.x > a.y && a.x > a.z) ? p.zy : (a.y > a.z ? p.xz : p.xy);
    return saturate(uv / 1.74 + 0.5);
  }
  vec3 q = p - vec3(2.3, 0.05, 0.);
  return vec2(atan(q.y, q.x) / TAU + 0.5, atan(q.z, length(q.xy) - 0.75) / TAU + 0.5);
}
`,
  shapes: `
#define CAM_DIST 6.3
#define CAM_ELEV 0.3
#define CAM_TARGET vec3(0., -0.2, 0.)
vec2 map(vec3 p) {
  vec2 r = vec2(1e9, -1.);
  float d = sdBox(p - vec3(-2.8, 1., 0.), vec3(0.65));
  if (d < r.x) r = vec2(d, 1.);
  d = length(p - vec3(0., 1., 0.)) - 0.8;
  if (d < r.x) r = vec2(d, 2.);
  d = sdPyramid((p - vec3(2.8, 0.25, 0.)) / 1.5, 1.) * 1.5;
  if (d < r.x) r = vec2(d, 3.);
  vec3 q = p - vec3(-2.8, -1.3, 0.);
  q.yz = rot(1.1) * q.yz;
  d = sdTorus(q, vec2(0.62, 0.24));
  if (d < r.x) r = vec2(d, 4.);
  for (int i = 0; i < 3; i++) {
    float x = -0.4 + 0.4 * float(i);
    d = sdCapsule(p, vec3(x, -2.1, 0.), vec3(x, -0.5, 0.), 0.05);
    if (d < r.x) r = vec2(d, 5.);
  }
  for (int i = 0; i < 5; i++) {
    float a = (float(i) - 2.) * 0.38;
    vec3 tip = vec3(2.8 + sin(a) * 0.9, -2.1 + cos(a) * 1.5, cos(a * 3.) * 0.3 - 0.15);
    d = sdCapsule(p, vec3(2.8, -2.1, 0.), tip, 0.035);
    if (d < r.x) r = vec2(d, 6.);
    d = length(p - tip) - 0.12;
    if (d < r.x) r = vec2(d, 1.);
  }
  return r;
}
vec2 objUV(vec3 p, vec3 n, float id) { return planarUV(p, n); }
`,
  outline: `
#define CAM_DIST 6.
#define CAM_ELEV 0.35
#define CAM_TARGET vec3(0., -0.4, 0.)
vec2 map(vec3 p) {
  vec2 r = vec2(1e9, -1.);
  vec3 q = p - vec3(-2.6, 0.6, 0.);
  q.xy = rot(0.5) * q.xy;
  float d = sdBox(q, vec3(0.9, 0.04, 0.9));
  if (d < r.x) r = vec2(d, 1.);
  q = p - vec3(0., 0.6, 0.);
  d = min(sdBox(q - vec3(0., -0.5, 0.), vec3(0.9, 0.3, 0.5)), sdBox(q - vec3(-0.6, 0.3, 0.), vec3(0.3, 0.6, 0.5)));
  if (d < r.x) r = vec2(d, 2.);
  q = p - vec3(2.6, 0.5, 0.);
  d = min(length(q - vec3(-0.35, 0., 0.)) - 0.6, length(q - vec3(0.35, 0.2, 0.2)) - 0.5);
  if (d < r.x) r = vec2(d, 3.);
  q = p - vec3(-1.3, -1.6, 0.);
  d = min(min(sdBox(q - vec3(-0.6, -0.2, 0.), vec3(0.3, 0.2, 0.5)), sdBox(q, vec3(0.3, 0.4, 0.5))), sdBox(q - vec3(0.6, 0.2, 0.), vec3(0.3, 0.6, 0.5)));
  if (d < r.x) r = vec2(d, 4.);
  q = p - vec3(1.4, -1.5, 0.);
  q.yz = rot(1.2) * q.yz;
  d = sdTorus(q, vec2(0.7, 0.06));
  if (d < r.x) r = vec2(d, 5.);
  return r;
}
vec2 objUV(vec3 p, vec3 n, float id) { return planarUV(p, n); }
`
};

const RAY = `
#ifndef CAM_DIST
#define CAM_DIST 7.
#endif
#ifndef CAM_ELEV
#define CAM_ELEV 0.35
#endif
#ifndef CAM_TARGET
#define CAM_TARGET vec3(0.)
#endif

float march(vec3 ro, vec3 rd, out float id) {
  id = -1.;
  float t = 0.;
  for (int i = 0; i < 128; i++) {
    vec2 h = map(ro + rd * t);
    if (h.x < 0.0005 * (1. + t)) { id = h.y; return t; }
    t += h.x * 0.9;
    if (t > 40.) break;
  }
  return -1.;
}
vec3 calcNormal(vec3 p) {
  const vec2 e = vec2(1., -1.) * 0.0008;
  return normalize(e.xyy * map(p + e.xyy).x + e.yyx * map(p + e.yyx).x + e.yxy * map(p + e.yxy).x + e.xxx * map(p + e.xxx).x);
}
float softShadow(vec3 ro, vec3 rd) {
  float res = 1., t = 0.02;
  for (int i = 0; i < 48; i++) {
    float h = map(ro + rd * t).x;
    res = min(res, 10. * h / t);
    t += clamp(h, 0.02, 0.3);
    if (res < 0.002 || t > 12.) break;
  }
  return saturate(res);
}
float ambientOcclusion(vec3 p, vec3 n) {
  float o = 0., s = 1.;
  for (int i = 0; i < 5; i++) {
    float h = 0.02 + 0.1 * float(i);
    o += (h - map(p + n * h).x) * s;
    s *= 0.75;
  }
  return saturate(1. - 2. * o);
}
void orbit(vec2 p, float ang, out vec3 ro, out vec3 rd) {
  ro = CAM_TARGET + CAM_DIST * vec3(cos(ang) * cos(CAM_ELEV), sin(CAM_ELEV), sin(ang) * cos(CAM_ELEV));
  vec3 f = normalize(CAM_TARGET - ro);
  vec3 r = normalize(cross(f, vec3(0., 1., 0.)));
  vec3 u = cross(r, f);
  rd = normalize(p.x * r + p.y * u + 1.8 * f);
}

struct Hit { float t; float id; vec3 p; vec3 n; vec3 ro; vec3 rd; };
Hit traceCam(vec2 p, float ang) {
  Hit h;
  orbit(p, ang, h.ro, h.rd);
  h.t = march(h.ro, h.rd, h.id);
  h.p = h.ro + h.rd * max(h.t, 0.);
  h.n = h.t > 0. ? calcNormal(h.p) : vec3(0.);
  return h;
}
float camAng() { return 0.7 + uTime * 0.2; }
vec3 sunDir() { float a = uTime * 0.6; return normalize(vec3(cos(a), 0.85, sin(a))); }
float fogF(float t) { return 1. - exp(-0.0012 * t * t); }
vec3 albedoOf(float id) {
  if (id < 1.5) return vec3(0.949, 0.859, 0.030); // Lemon
  if (id < 2.5) return vec3(0.000, 0.316, 0.991); // Azure
  if (id < 3.5) return vec3(1.000, 0.167, 0.160); // Coral
  if (id < 4.5) return vec3(0.42, 0.22, 0.62);
  if (id < 5.5) return vec3(0.75, 0.72, 0.66);
  return vec3(0.2, 0.5, 0.15);
}
// checker floor: #C8B6D1 / #72629D (linear)
vec3 floorAlbedo(vec3 p) { return mix(vec3(0.586, 0.476, 0.646), vec3(0.170, 0.122, 0.344), mod(floor(p.x) + floor(p.z), 2.)); }
vec3 lit(Hit h, vec3 albedo, vec3 l) {
  float dif = max(dot(h.n, l), 0.);
  float sh = dif > 0. ? softShadow(h.p + h.n * 0.01, l) : 0.;
  float occ = ambientOcclusion(h.p, h.n);
  return albedo * (dif * sh * vec3(1.1, 1.0, 0.9) + occ * vec3(0.16, 0.18, 0.24));
}
vec3 sceneColor(Hit h) {
  if (h.t < 0.) return BG;
  vec3 alb = h.id < 0.5 ? floorAlbedo(h.p) : albedoOf(h.id);
  return mix(toSRGB(lit(h, alb, sunDir())), BG, fogF(h.t));
}
float edgeBetween(Hit a, Hit b) {
  if (a.id != b.id) return 1.;
  if (a.t < 0.) return 0.;
  float dd = abs(a.t - b.t) / a.t;
  float nd = 1. - dot(a.n, b.n);
  return saturate(max(dd * 8., nd * 3.));
}
float edgeAt(vec2 p, float pxW, float ang, out Hit h) {
  h = traceCam(p, ang);
  Hit hx = traceCam(p + vec2(pxW * 1.5, 0.), ang);
  Hit hy = traceCam(p + vec2(0., pxW * 1.5), ang);
  return max(edgeBetween(h, hx), edgeBetween(h, hy));
}
`;

const MAIN = `
void main() { outColor = demo(gl_FragCoord.xy / uRes); }
`;

const RING = `
vec2 ringVec(vec2 uv) {
  vec2 p = aspectUV(uv);
  vec2 c = vec2(0.3 * sin(uTime * 0.5), 0.12 * sin(uTime * 0.8));
  float r = 0.62 + 0.06 * sin(uTime * 1.1);
  vec2 q = c - p;
  float m = 1. - smoothstep(0.05, 0.13, abs(length(q) - r));
  return normalize(q + 1e-6) * m;
}
`;

const GRAPH = `
// Plot area inside 8% / 10% margins; g is in [0,1]^2 over the plot. Dark background so it
// reads as a separate pane next to the indigo code panel.
vec3 graphBase(vec2 uv, out vec2 g) {
  vec2 pad = vec2(0.08, 0.1);
  vec2 size = 1. - 2. * pad;
  g = (uv - pad) / size;
  vec2 d = abs(fract(g * 4. + 0.5) - 0.5) / 4. * uRes * size;
  float inside = step(-0.004, g.x) * step(g.x, 1.004) * step(-0.004, g.y) * step(g.y, 1.004);
  float grid = (1. - smoothstep(0.8, 1.8, min(d.x, d.y))) * inside;
  return mix(GBG, GBG + 0.16, grid);
}
vec3 graphCurve(vec3 col, vec2 g, float y, vec3 color) {
  float f = g.y - y;
  float d = abs(f) / max(length(vec2(dFdx(f), dFdy(f))), 1e-5);
  float w = uRes.y / 330.;
  float a = (1. - smoothstep(w, w + 1.4, d)) * step(0., g.x) * step(g.x, 1.);
  return mix(col, color, a);
}
`;

const DEMOS = {
  scene: { map: 'showcase', fs: `
vec4 demo(vec2 uv) { return vec4(sceneColor(traceCam(aspectUV(uv), camAng())), 1.); }` },

  diffuse: { map: 'sphere', fs: `
vec4 demo(vec2 uv) {
  Hit h = traceCam(aspectUV(uv), 0.4);
  if (h.t < 0.) return vec4(BG, 1.);
  vec3 l = normalize(vec3(cos(uTime * 0.8), 0.4, sin(uTime * 0.8)));
  float ndotl = saturate(dot(h.n, l));
  vec3 albedo = uvGrid(objUV(h.p, h.n, h.id));
  return vec4(toSRGB(albedo * albedo * ndotl), 1.);
}` },

  err_nan: { map: 'sphere', scale: 0.8, fs: `
vec4 demo(vec2 uv) {
  vec2 frag = uv * uRes;
  float px = max(4., uRes.y / 45.);
  vec2 cell = floor(frag / px);
  Hit h = traceCam(aspectUV(uv), 0.4);
  Hit hc = traceCam(aspectUV((cell + 0.5) * px / uRes), 0.4);
  vec3 l = normalize(vec3(cos(uTime * 0.8), 0.4, sin(uTime * 0.8)));
  vec3 col = BG;
  if (h.t > 0.) { vec3 a = uvGrid(objUV(h.p, h.n, h.id)); col = toSRGB(a * a * saturate(dot(h.n, l)) + 0.01); }
  if (hc.t > 0.) {
    float flick = hash12(cell + floor(uTime * 6.) * vec2(7., 13.));
    if (abs(dot(hc.n, l)) < 0.14 && flick > 0.35) col = vec3(0.);
  }
  return vec4(col, 1.);
}` },

  err_viewnormals: { map: 'showcase', fs: `
vec4 demo(vec2 uv) {
  Hit h = traceCam(aspectUV(uv), uTime * 0.5);
  if (h.t < 0.) return vec4(BG, 1.);
  vec3 f = normalize(CAM_TARGET - h.ro);
  vec3 r = normalize(cross(f, vec3(0., 1., 0.)));
  vec3 u = cross(r, f);
  vec3 nv = vec3(dot(h.n, r), dot(h.n, u), dot(h.n, -f));
  vec3 l = normalize(vec3(0.6, 0.8, 0.3));
  vec3 alb = h.id < 0.5 ? floorAlbedo(h.p) : albedoOf(h.id);
  vec3 col = toSRGB(alb * (saturate(dot(nv, l)) + 0.08));
  return vec4(mix(col, BG, fogF(h.t)), 1.);
}` },

  err_stretched_uv: { map: 'sphere', fs: `
vec4 demo(vec2 uv) {
  Hit h = traceCam(aspectUV(uv), 0.);
  if (h.t < 0.) return vec4(BG, 1.);
  vec3 q = h.p;
  q.xz = rot(0.6 * sin(uTime * 0.5)) * q.xz;
  vec3 a = uvGrid(q.xy * 0.5 + 0.5);
  vec3 l = normalize(vec3(1., 0.6, 0.3));
  return vec4(toSRGB(a * a * (0.1 + saturate(dot(h.n, l)))), 1.);
}` },

  compound: { map: 'showcase', scale: 0.85, fs: `
bool inRect(vec2 uv, vec4 r) { return uv.x > r.x && uv.x < r.z && uv.y > r.y && uv.y < r.w; }
vec4 demo(vec2 uv) {
  vec2 frag = uv * uRes;
  vec4 rN = vec4(0.70, 0.52, 0.98, 0.94);
  vec4 rD = vec4(0.70, 0.08, 0.98, 0.50);
  int mode = 0;
  vec2 local = uv;
  vec2 size = uRes;
  if (inRect(uv, rN)) { mode = 1; local = (uv - rN.xy) / (rN.zw - rN.xy); size = uRes * (rN.zw - rN.xy); }
  else if (inRect(uv, rD)) { mode = 2; local = (uv - rD.xy) / (rD.zw - rD.xy); size = uRes * (rD.zw - rD.xy); }
  Hit h = traceCam(toScreen(local, size), camAng());
  vec3 col;
  if (mode == 0) col = sceneColor(h);
  else if (mode == 1) col = h.t < 0. ? vec3(0.) : h.n * 0.5 + 0.5;
  else col = h.t < 0. ? vec3(0.) : turbo(1. - saturate((h.t - 4.) / 9.));
  if (mode != 0) {
    vec2 b = min(local, 1. - local) * size;
    if (min(b.x, b.y) < 2.) col = vec3(0.92);
  }
  float value = 0.5 + 0.5 * sin(uTime * 1.3);
  if (uv.y < 0.035) col = mix(vec3(0.15), vec3(0.95), step(uv.x, value));
  float px = uRes.y / 90.;
  vec2 o = vec2(px * 4., uRes.y - px * 10.);
  if (frag.x < o.x + 5. * 3.75 * px + px * 2. && frag.y > o.y - px * 2. && frag.y < o.y + px * 7.) col *= 0.3;
  col = mix(col, vec3(1.), printIntPx(uint(uTime * 100.) % 100000u, frag, o, px, 5u));
  return vec4(col, 1.);
}` },

  fullscreen: { fs: `
vec4 demo(vec2 uv) {
  float value = fbm(aspectUV(uv) * 1.8 + vec2(uTime * 0.12, uTime * 0.05));
  return vec4(vec3(value), 1.);
}` },

  corner: { map: 'showcase', scale: 0.7, fs: `
vec4 demo(vec2 uv) {
  vec2 debugMin = vec2(0.75, 0.75);
  bool inDebug = all(greaterThan(uv, debugMin));
  vec2 local = inDebug ? (uv - debugMin) / (1. - debugMin) : uv;
  vec2 size = inDebug ? uRes * (1. - debugMin) : uRes;
  Hit h;
  float e = edgeAt(toScreen(local, size), 2. / size.y, camAng(), h);
  vec3 col;
  if (inDebug) {
    col = vec3(e);
    vec2 b = min(local, 1. - local) * size;
    if (min(b.x, b.y) < 2.) col = ACCENT;
  } else {
    col = mix(sceneColor(h), vec3(0.02), step(0.5, e) * step(0.5, h.id));
  }
  return vec4(col, 1.);
}` },

  float_color: { fs: `
vec4 demo(vec2 uv) {
  float v = smoothstep(0.2, 0.8, fbm(aspectUV(uv) * 1.3 + vec2(uTime * 0.1, -uTime * 0.04)));
  float band = floor(uv.x * 3.);
  vec3 col = band < 0.5 ? vec3(v) : (band < 1.5 ? viridis(v) : turbo(v));
  float gap = abs(fract(uv.x * 3. + 0.5) - 0.5) * uRes.x / 3.;
  if (gap < 2. && uv.x > 0.1 && uv.x < 0.9) col = BG;
  return vec4(col, 1.);
}` },

  viridis_field: { fs: `
vec4 demo(vec2 uv) {
  float v = smoothstep(0.2, 0.8, fbm(aspectUV(uv) * 1.3 + vec2(uTime * 0.1, -uTime * 0.04)));
  return vec4(viridis(v), 1.);
}` },

  float_bar: { map: 'showcase', fs: `
vec4 demo(vec2 uv) {
  vec4 color = vec4(sceneColor(traceCam(aspectUV(uv), camAng())), 1.);
  float value = 0.5 + 0.5 * sin(uTime * 1.1);
  float bar = step(uv.x, value) * step(uv.y, 0.05);
  color = mix(color, vec4(0., 0., 0., 1.), step(uv.y, 0.05) * 0.6);
  return mix(color, vec4(1.), bar);
}` },

  float_dial: { fs: `
vec4 demo(vec2 uv) {
  vec2 p = aspectUV(uv) * 1.15;
  float value = 0.5 + 0.5 * sin(uTime * 0.9);
  float angle = atan(p.x, p.y) / TAU + 0.5;
  float r = length(p);
  float aa = 2.3 / uRes.y;
  float ring = smoothstep(0.8 - aa, 0.8, r) * (1. - smoothstep(1., 1. + aa, r));
  float filled = step(angle, value);
  vec3 col = mix(BG, vec3(0.22), ring);
  col = mix(col, vec3(1.), ring * filled);
  vec2 frag = uv * uRes;
  float px = uRes.y / 36.;
  vec2 o = uRes * 0.5 - vec2(3. * 3.75 * px - 0.75 * px, 5. * px) * 0.5;
  col = mix(col, vec3(1.), printIntPx(uint(value * 100.), frag, o, px, 3u));
  return vec4(col, 1.);
}` },

  vec2_rg_norm: { fs: RING + `
vec4 demo(vec2 uv) { vec2 v = ringVec(uv); return vec4(v * 0.5 + 0.5, 0., 1.); }` },

  vec2_rg_abs: { fs: RING + `
vec4 demo(vec2 uv) { vec2 v = ringVec(uv); return vec4(abs(v), 0., 1.); }` },

  vec2_angle_mag: { fs: RING + `
vec4 demo(vec2 uv) {
  vec2 v = ringVec(uv);
  if (dot(v, v) < 1e-6) return vec4(0., 0., 0., 1.);
  float angle = atan(v.y, v.x) / TAU + 0.5;
  return vec4(hue2rgb(angle) * saturate(length(v)), 1.);
}` },

  vec3_norm: { map: 'showcase', fs: `
vec4 demo(vec2 uv) {
  Hit h = traceCam(aspectUV(uv), camAng());
  if (h.t < 0.) return vec4(BG, 1.);
  return vec4(h.n * 0.5 + 0.5, 1.);
}` },

  // Same scene and camera as the showcase map, with the sphere, box and torus replaced by real
  // models from the Fx project (models.js), rasterized instead of ray-marched.
  vec3_norm_mesh: { scene: 'fx_models', fs: `
vec3 shade(vec3 n) { return normalize(n) * 0.5 + 0.5; }` },

  vec3_abs: { map: 'showcase', fs: `
vec4 demo(vec2 uv) {
  Hit h = traceCam(aspectUV(uv), camAng());
  if (h.t < 0.) return vec4(BG, 1.);
  return vec4(abs(h.n), 1.);
}` },

  vec3_abs_mesh: { scene: 'fx_models', fs: `
vec3 shade(vec3 n) { return abs(normalize(n)); }` },

  ids_palette: { fs: `
const vec3 PALETTE[4] = vec3[4](vec3(0.90, 0.10, 0.10), vec3(0.10, 0.60, 0.20), vec3(0.10, 0.30, 0.90), vec3(0.95, 0.75, 0.10));
uint voronoi(vec2 p, out float border) {
  vec2 n = floor(p), f = fract(p);
  float md = 8., md2 = 8.;
  vec2 mc = vec2(0.);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j));
    vec2 o = vec2(hash12(n + g), hash12(n + g + 31.7));
    o = 0.5 + 0.4 * sin(uTime * 0.6 + TAU * o);
    vec2 r = g + o - f;
    float d = dot(r, r);
    if (d < md) { md2 = md; md = d; mc = n + g; } else if (d < md2) md2 = d;
  }
  border = sqrt(md2) - sqrt(md);
  return pcg(uint(int(mc.x) + 1000) * 7919u + uint(int(mc.y) + 1000));
}
vec4 demo(vec2 uv) {
  float border;
  uint id = voronoi(aspectUV(uv) * 3., border);
  vec3 col = PALETTE[id % 4u];
  return vec4(col * smoothstep(0.02, 0.06, border), 1.);
}` },

  ids_hash: { fs: `
uint voronoi(vec2 p, out float border) {
  vec2 n = floor(p), f = fract(p);
  float md = 8., md2 = 8.;
  vec2 mc = vec2(0.);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j));
    vec2 o = vec2(hash12(n + g), hash12(n + g + 31.7));
    o = 0.5 + 0.4 * sin(uTime * 0.6 + TAU * o);
    vec2 r = g + o - f;
    float d = dot(r, r);
    if (d < md) { md2 = md; md = d; mc = n + g; } else if (d < md2) md2 = d;
  }
  border = sqrt(md2) - sqrt(md);
  return uint(int(mc.x) + 1000) * 7919u + uint(int(mc.y) + 1000);
}
vec4 demo(vec2 uv) {
  float border;
  uint id = voronoi(aspectUV(uv) * 3., border);
  return vec4(hashColor(id) * smoothstep(0.02, 0.06, border), 1.);
}` },

  digits_probe: { fs: `
float field(vec2 uv) { return smoothstep(0.2, 0.8, fbm(aspectUV(uv) * 1.4 + 3.)); }
vec4 demo(vec2 uv) {
  vec2 frag = uv * uRes;
  vec3 col = viridis(field(uv)) * 0.85;
  vec2 probeUV = vec2(0.5 + 0.3 * sin(uTime * 0.5), 0.5 + 0.28 * sin(uTime * 0.73 + 1.));
  float pv = field(probeUV);
  vec2 probe = probeUV * uRes;
  float px = uRes.y / 60.;
  float ring = abs(length(frag - probe) - px * 1.6);
  col = mix(col, vec3(1.), 1. - smoothstep(px * 0.3, px * 0.6, ring));
  vec2 o = probe + vec2(px * 3.5, px * 1.5);
  vec2 bMin = o - px, bMax = o + vec2(4. * 3.75 * px, 5. * px) + px * 0.25;
  if (all(greaterThan(frag, bMin)) && all(lessThan(frag, bMax))) col = mix(col, vec3(0.), 0.75);
  col = mix(col, vec3(1.), printIntPx(uint(pv * 1000.), frag, o, px, 4u));
  return vec4(col, 1.);
}` },

  early_return: { map: 'showcase', fs: `
vec4 demo(vec2 uv) {
  Hit h = traceCam(aspectUV(uv), camAng());
  if (h.t < 0.) return vec4(BG, 1.);
  vec3 l = sunDir();
  float shadow = softShadow(h.p + h.n * 0.01, l) * step(0., dot(h.n, l));
  if (shadow < 0.5) {
    return vec4(1., 0., 1., 1.);
  }
  return vec4(sceneColor(h), 1.);
}` },

  branch_colors: { map: 'showcase', fs: `
vec4 demo(vec2 uv) {
  Hit h = traceCam(aspectUV(uv), camAng());
  if (h.t < 0.) return vec4(BG, 1.);
  float a = uTime * 0.6;
  float ndotl = dot(h.n, normalize(vec3(cos(a), 0.3, sin(a))));
  if (ndotl > 0.5) return vec4(1., 0., 0., 1.);
  else if (ndotl > 0.) return vec4(0., 1., 0., 1.);
  else return vec4(0., 0., 1., 1.);
}` },

  debug_views: { map: 'showcase', fs: `
vec4 demo(vec2 uv) {
  int mode = int(mod(uTime / 2.5, 4.));
  Hit h = traceCam(aspectUV(uv), camAng());
  vec3 col = BG;
  if (h.t > 0.) {
    vec3 l = sunDir();
    vec3 alb = h.id < 0.5 ? floorAlbedo(h.p) : albedoOf(h.id);
    if (mode == 0) col = sceneColor(h);
    else if (mode == 1) col = toSRGB(alb);
    else if (mode == 2) col = h.n * 0.5 + 0.5;
    else col = vec3(softShadow(h.p + h.n * 0.01, l) * step(0., dot(h.n, l)));
  }
  if (uv.y > 0.965) {
    col = floor(uv.x * 4.) == float(mode) ? ACCENT : vec3(0.3);
    if (abs(fract(uv.x * 4.) - 0.5) * uRes.x / 4. > uRes.x / 8. - 2.) col = BG;
  }
  return vec4(col, 1.);
}` },

  lerp: { fs: `
vec4 demo(vec2 uv) {
  vec3 original = testImage(uv, uTime);
  vec3 effect = saturate(floor(vec3(luminance(original)) * 4.) / 3.) * vec3(1., 0.86, 0.7);
  float blend = 0.5 + 0.5 * sin(uTime * 0.9);
  vec3 col = mix(original, effect, blend);
  if (uv.y < 0.03) col = mix(vec3(0.15), ACCENT, step(uv.x, blend));
  return vec4(col, 1.);
}` },

  depth_rrr: { map: 'showcase', fs: `
vec4 demo(vec2 uv) {
  Hit h = traceCam(aspectUV(uv), camAng());
  float depth = h.t < 0. ? 1. : saturate(h.t / 25.);
  return vec4(vec3(depth), 1.);
}` },

  box_blur: { scale: 0.5, fs: `
vec4 demo(vec2 uv) {
  int radius = int(3. + 3. * sin(uTime * 0.8) + 0.5);
  vec2 stride = 1.5 / (180. * ASPECT);
  vec3 sum = vec3(0.);
  for (int x = -radius; x <= radius; x++)
    for (int y = -radius; y <= radius; y++)
      sum += testImage(uv + vec2(float(x), float(y)) * stride, uTime);
  float count = float((2 * radius + 1) * (2 * radius + 1));
  vec3 col = sum / count;
  if (uv.y < 0.03) col = mix(vec3(0.15), ACCENT, step(uv.x, float(radius) / 6.));
  return vec4(col, 1.);
}` },

  blur_r: { scale: 0.6, fs: `
vec4 demo(vec2 uv) {
  vec2 stride = (uParam / 4.) / (180. * ASPECT);
  vec3 sum = vec3(0.);
  for (int x = -4; x <= 4; x++)
    for (int y = -4; y <= 4; y++)
      sum += testImage(uv + vec2(float(x), float(y)) * stride, uTime);
  return vec4(sum / 81., 1.);
}` },

  blur_r_sin: { scale: 0.6, fs: `
vec4 demo(vec2 uv) {
  float radius = 21. + 19. * sin(uTime * 0.8);
  vec2 stride = (radius / 4.) / (180. * ASPECT);
  vec3 sum = vec3(0.);
  for (int x = -4; x <= 4; x++)
    for (int y = -4; y <= 4; y++)
      sum += testImage(uv + vec2(float(x), float(y)) * stride, uTime);
  vec3 col = sum / 81.;
  vec2 frag = uv * uRes;
  float px = uRes.y / 48.;
  vec2 o = vec2(px * 1.5, uRes.y - px * 7.5);
  if (frag.x < o.x + 2. * 3.75 * px + px && frag.y > o.y - px && frag.y < o.y + px * 6.) col *= 0.3;
  col = mix(col, vec3(1.), printIntPx(uint(radius + 0.5), frag, o, px, 2u));
  return vec4(col, 1.);
}` },

  normal_strength: { fs: `
float bumps(vec2 p) {
  float h = 0.;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    vec2 c = vec2(-1.1 + 1.1 * mod(fi, 3.), fi < 2.5 ? 0.45 : -0.45);
    float s = mod(fi, 2.) < 0.5 ? 1. : -1.;
    h += s * 0.03 * exp(-dot(p - c, p - c) / 0.12);
  }
  return h;
}
vec4 demo(vec2 uv) {
  vec2 p = aspectUV(uv);
  float e = 0.002;
  vec2 g = vec2(bumps(p + vec2(e, 0.)) - bumps(p - vec2(e, 0.)), bumps(p + vec2(0., e)) - bumps(p - vec2(0., e))) / (2. * e);
  vec3 n = vec3(-g, 1.);
  n.xy *= uParam;
  n = normalize(n);
  vec3 l = normalize(vec3(cos(uTime * 0.8), sin(uTime * 0.8), 0.7));
  vec3 col = vec3(0.6, 0.57, 0.53) * (0.15 + 0.85 * saturate(dot(n, l)));
  return vec4(toSRGB(col), 1.);
}` },

  hdr_view: { fs: `
vec4 demo(vec2 uv) {
  vec3 hdr = testImageHDR(uv, uTime);
  vec3 col = uParam < 0.5 ? saturate(hdr) : log2(hdr + 1.) / 3.;
  return vec4(col, 1.);
}` },

  threshold_anim: { fs: `
vec4 demo(vec2 uv) {
  float threshold = fract(uTime * 0.1);
  float lum = luminance(testImage(uv, uTime));
  vec3 col = vec3(step(threshold, lum));
  if (uv.y < 0.03) {
    col = vec3(0.15);
    if (abs(uv.x - threshold) * uRes.x < 2.5) col = ACCENT;
  }
  return vec4(col, 1.);
}` },

  // UvGrid.png (window.ShaderTextures.uvGrid, in models.js) on the sphere, box and torus
  uv_grid_scene: { map: 'showcase', tex: 'uvGrid', fs: `
uniform sampler2D uTex;
vec4 demo(vec2 uv) {
  Hit h = traceCam(aspectUV(uv), camAng());
  if (h.t < 0.) return vec4(BG, 1.);
  vec3 a = h.id < 0.5 ? floorAlbedo(h.p) : textureLod(uTex, objUV(h.p, h.n, h.id), 0.).rgb;
  if (h.id > 0.5) a *= a;
  return vec4(mix(toSRGB(lit(h, a, sunDir())), BG, fogF(h.t)), 1.);
}` },

  debug_albedo: { map: 'showcase', fs: `
vec4 demo(vec2 uv) {
  Hit h = traceCam(aspectUV(uv), camAng());
  if (h.t < 0.) return vec4(BG, 1.);
  vec3 alb = floorAlbedo(h.p);
  if (h.id > 0.5) {
    alb = mix(vec3(1., 0.5, 0.), vec3(0.1, 0.5, 1.), objUV(h.p, h.n, h.id).x);
    alb *= alb;
  }
  return vec4(mix(toSRGB(lit(h, alb, sunDir())), BG, fogF(h.t)), 1.);
}` },

  uv_gradient_scene: { map: 'showcase', fs: `
vec4 demo(vec2 uv) {
  Hit h = traceCam(aspectUV(uv), camAng());
  if (h.t < 0.) return vec4(BG, 1.);
  vec3 col = h.id < 0.5 ? toSRGB(lit(h, floorAlbedo(h.p), sunDir())) : vec3(objUV(h.p, h.n, h.id), 0.);
  return vec4(mix(col, BG, fogF(h.t)), 1.);
}` },

  in_gradient: { fs: `
vec4 demo(vec2 uv) { return vec4(vec3(uv.x), 1.); }` },

  in_hls: { fs: `
vec4 demo(vec2 uv) { return vec4(hlsMap(uv), 1.); }` },

  in_colorgrid: { fs: `
vec4 demo(vec2 uv) { return vec4(colorGrid(uv), 1.); }` },

  in_polar: { fs: `
vec4 demo(vec2 uv) { return vec4(polarGrid(aspectUV(uv) * 1.1), 1.); }` },

  quantize_grad: { fs: `
vec4 demo(vec2 uv) {
  float levels = 2. + mod(floor(uTime * 0.6), 9.);
  return vec4(vec3(min(floor(uv.x * levels), levels - 1.) / (levels - 1.)), 1.);
}` },

  dither_grad: { fs: `
vec4 demo(vec2 uv) {
  vec2 frag = uv * uRes;
  float px = max(2., floor(uRes.y / 180.));
  float levels = 2. + mod(floor(uTime * 0.5), 3.);
  return vec4(vec3(ditherQuant(uv.x, levels, bayer4(floor(frag / px)))), 1.);
}` },

  hatch_grad: { fs: `
float lineD(float x) { return abs(fract(x) - 0.5) * 2.; }
vec4 demo(vec2 uv) {
  vec2 frag = uv * uRes;
  float s = uRes.y / 40.;
  float dark = (1. - uv.x) * 1.6;
  float off = uTime * 6.;
  float ink = step(lineD((frag.x + frag.y + off) / s), saturate(dark) * 0.5);
  ink = max(ink, step(lineD((frag.x - frag.y - off) / s), saturate(dark - 0.6) * 0.5));
  ink = max(ink, step(lineD(frag.y / (s * 0.5)), saturate(dark - 1.1) * 0.6));
  return vec4(vec3(mix(0.96, 0.08, ink)), 1.);
}` },

  quantize_hls: { fs: `
vec4 demo(vec2 uv) {
  float levels = 2. + mod(floor(uTime * 0.6), 5.);
  return vec4(min(floor(hlsMap(uv) * levels), levels - 1.) / (levels - 1.), 1.);
}` },

  dither_hls: { fs: `
vec4 demo(vec2 uv) {
  vec2 frag = uv * uRes;
  float px = max(2., floor(uRes.y / 180.));
  float th = bayer4(floor(frag / px));
  vec3 c = hlsMap(uv);
  return vec4(ditherQuant(c.r, 2., th), ditherQuant(c.g, 2., th), ditherQuant(c.b, 2., th), 1.);
}` },

  dither_hls2: { fs: `
vec4 demo(vec2 uv) {
  vec2 frag = uv * uRes;
  float px = max(2., floor(uRes.y / 180.));
  float th = ign(floor(frag / px) + 5.588238 * mod(floor(uTime * 20.), 64.));
  vec3 c = hlsMap(uv);
  return vec4(ditherQuant(c.r, 2., th), ditherQuant(c.g, 2., th), ditherQuant(c.b, 2., th), 1.);
}` },

  in_point: { fs: `
vec4 demo(vec2 uv) { return vec4(vec3(pointImg(gridCell(uv))), 1.); }` },

  max_point: { fs: `
vec4 demo(vec2 uv) {
  ivec2 ip = gridCell(uv);
  int r = int(4.5 + 4.5 * sin(uTime * 0.9) + 0.5);
  float m = 0.;
  for (int y = -r; y <= r; y++)
    for (int x = -r; x <= r; x++)
      m = max(m, pointImg(ip + ivec2(x, y)));
  return vec4(vec3(m), 1.);
}` },

  in_rgbw: { fs: `
vec4 demo(vec2 uv) { return vec4(rgbwImg(gridCell(uv)), 1.); }` },

  max_rgbw: { fs: `
vec4 demo(vec2 uv) {
  ivec2 ip = gridCell(uv);
  int r = int(4.5 + 4.5 * sin(uTime * 0.9) + 0.5);
  vec3 m = vec3(0.);
  for (int y = -r; y <= r; y++)
    for (int x = -r; x <= r; x++)
      m = max(m, rgbwImg(ip + ivec2(x, y)));
  return vec4(m, 1.);
}` },

  huemap_grid: { fs: `
vec4 demo(vec2 uv) {
  vec3 hsv = rgb2hsv(colorGrid(uv));
  hsv.x = fract(hsv.x + uTime * 0.08);
  return vec4(hsv2rgb(hsv), 1.);
}` },

  tritone_grid: { fs: `
vec4 demo(vec2 uv) {
  float l = luminance(colorGrid(uv));
  float mid = 0.5 + 0.25 * sin(uTime * 0.8);
  vec3 sh = vec3(0.08, 0.1, 0.28), md = vec3(0.92, 0.42, 0.2), hi = vec3(1., 0.95, 0.82);
  return vec4(l < mid ? mix(sh, md, l / mid) : mix(md, hi, (l - mid) / (1. - mid)), 1.);
}` },

  polar_blur: { scale: 0.8, fs: `
vec4 demo(vec2 uv) {
  int phase = int(mod(uTime / 2.5, 3.));
  vec2 p = aspectUV(uv) * 1.1;
  float px = 2.2 / uRes.y;
  vec3 sum = vec3(0.);
  float n = 0.;
  if (phase < 2) {
    vec2 dir = phase == 0 ? vec2(1., 0.) : vec2(0., 1.);
    for (int i = -18; i <= 18; i++) { sum += polarGrid(p + dir * float(i) * px); n += 1.; }
  } else {
    for (int y = -4; y <= 4; y++)
      for (int x = -4; x <= 4; x++) { sum += polarGrid(p + vec2(float(x), float(y)) * px * 4.); n += 1.; }
  }
  vec3 col = sum / n;
  if (uv.y > 0.965) {
    col = floor(uv.x * 3.) == float(phase) ? ACCENT : vec3(0.3);
    if (abs(fract(uv.x * 3.) - 0.5) * uRes.x / 3. > uRes.x / 6. - 2.) col = BG;
  }
  return vec4(col, 1.);
}` },

  shapes_scene: { map: 'shapes', scale: 0.7, fs: `
vec4 demo(vec2 uv) {
  vec2 frag = uv * uRes;
  Hit h;
  float e = edgeAt(aspectUV(uv), 2. / uRes.y, camAng(), h);
  vec3 paper = vec3(0.93, 0.91, 0.86), ink = vec3(0.2, 0.18, 0.28);
  vec3 col = vec3(0.8, 0.78, 0.74);
  if (h.t > 0.) {
    float dif = saturate(dot(h.n, sunDir())) * 0.85 + 0.1;
    col = dif > bayer4(floor(frag / 2.)) ? paper : ink;
  }
  return vec4(mix(col, vec3(0.03), step(0.5, e)), 1.);
}` },

  outline_shapes: { map: 'outline', scale: 0.7, fs: `
vec4 demo(vec2 uv) {
  Hit h;
  float e = edgeAt(aspectUV(uv), 2. / uRes.y, camAng(), h);
  vec3 col = vec3(0.78, 0.76, 0.72);
  if (h.t > 0.) {
    float dif = saturate(dot(h.n, sunDir()));
    float band = dif > 0.6 ? 1. : (dif > 0.2 ? 0.65 : 0.35);
    col = toSRGB(albedoOf(h.id) * band + 0.03);
  }
  return vec4(mix(col, vec3(0.03), step(0.5, e)), 1.);
}` },

  shadow_map: { map: 'showcase', scale: 0.85, fs: `
vec4 demo(vec2 uv) {
  bool right = uv.x > 0.5;
  vec2 local = vec2(fract(uv.x * 2.), uv.y);
  vec2 p = toScreen(local, vec2(uRes.x * 0.5, uRes.y));
  vec3 l = sunDir();
  vec3 col;
  if (!right) {
    col = sceneColor(traceCam(p, 0.9));
  } else {
    vec3 f = -l;
    vec3 r = normalize(cross(f, vec3(0., 1., 0.)));
    vec3 u = cross(r, f);
    float id;
    float t = march(l * 12. + (r * p.x + u * p.y) * 4.2, f, id);
    col = vec3(t < 0. ? 1. : saturate((t - 9.) / 6.));
  }
  if (abs(uv.x - 0.5) * uRes.x < 1.5) col = BG;
  return vec4(col, 1.);
}` },

  graph_smoothstep: { fs: GRAPH + `
vec4 demo(vec2 uv) {
  vec2 g;
  vec3 col = graphBase(uv, g);
  col = graphCurve(col, g, smoothstep(0.2, 0.8, g.x), YELLOW);
  return vec4(col, 1.);
}` },

  graph_falloff: { fs: GRAPH + `
vec4 demo(vec2 uv) {
  vec2 g;
  vec3 col = graphBase(uv, g);
  float x = g.x * 2.;
  col = graphCurve(col, g, 1. / (1. + 16. * x * x), CYAN);
  col = graphCurve(col, g, 1. / (1. + 4. * x * x), YELLOW);
  col = graphCurve(col, g, 1. / (1. + 1. * x * x), CORAL);
  return vec4(col, 1.);
}` },

  plot_shader: { fs: `
float Plot(vec2 uv, float y, float thickness) {
  float d = abs(uv.y - y);
  float aa = max(fwidth(uv.y - y), 1e-4);
  return 1. - smoothstep(thickness - aa, thickness + aa, d);
}
vec4 demo(vec2 uv) {
  vec2 g = (uv - vec2(0.06, 0.1)) / vec2(0.88, 0.8);
  vec3 col = GBG;
  vec2 gp = abs(fract(g * 4. + 0.5) - 0.5) / 4. * uRes * vec2(0.88, 0.8);
  float inside = step(0., g.x) * step(g.x, 1.) * step(0., g.y) * step(g.y, 1.);
  col = mix(col, GBG + 0.12, inside * (1. - step(1., min(gp.x, gp.y))));
  float x = g.x;
  float y = smoothstep(0.2, 0.8, x);
  float curve = Plot(g, y, 0.006);
  col = mix(col, YELLOW, curve * step(0., x) * step(x, 1.));
  float dx = fract(uTime * 0.2);
  vec2 dot2 = (vec2(dx, smoothstep(0.2, 0.8, dx)) * vec2(0.88, 0.8) + vec2(0.06, 0.1)) * uRes;
  col = mix(col, CORAL, 1. - smoothstep(5., 7., length(uv * uRes - dot2)));
  return vec4(col, 1.);
}` },

  sine_vs_noise: { fs: `
vec4 demo(vec2 uv) {
  bool top = uv.y > 0.5;
  float ly = fract(uv.y * 2.);
  float x = uv.x * 8. + uTime * 0.6;
  float y = top ? vnoise(vec2(x, 3.7)) : sin(x * PI) * 0.5 + 0.5;
  float f = ly - (0.15 + 0.7 * y);
  float d = abs(f) / max(length(vec2(dFdx(f), dFdy(f))), 1e-5);
  vec3 col = GBG;
  col = mix(col, top ? CYAN : ACCENT, 1. - smoothstep(1.5, 2.5, d));
  if (abs(uv.y - 0.5) * uRes.y < 1.) col = GBG + 0.15;
  return vec4(col, 1.);
}` }
};

const VS = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0., 1.); }
`;

// Minimum horizontal half-extent (in screen units, height = 2) that each scene keeps in view
// when the pane is narrower than that; see toScreen().
const MAP_FIT = { none: 1.1, sphere: 0.9, showcase: 1.45, shapes: 1.5, outline: 1.5 };

function buildSource(spec) {
  const map = spec.map || 'none';
  const fit = (spec.fit != null ? spec.fit : MAP_FIT[map]).toFixed(2);
  return HEADER + '#define FIT_W ' + fit + '\n' + LIB + MAPS[map] + RAY + spec.fs + MAIN;
}

function createRenderer(opts) {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2', Object.assign({
    antialias: false, alpha: false, depth: false, stencil: false,
    preserveDrawingBuffer: false, powerPreference: 'high-performance'
  }, opts || {}));
  if (!gl) return null;
  const vsh = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vsh, VS);
  gl.compileShader(vsh);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const programs = {};

  function program(name, spec) {
    if (programs[name]) return programs[name];
    let entry;
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, buildSource(spec));
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      entry = { error: gl.getShaderInfoLog(fs) };
    } else {
      const p = gl.createProgram();
      gl.attachShader(p, vsh);
      gl.attachShader(p, fs);
      gl.bindAttribLocation(p, 0, 'aPos');
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) entry = { error: gl.getProgramInfoLog(p) };
      else entry = {
        prog: p,
        uRes: gl.getUniformLocation(p, 'uRes'),
        uTime: gl.getUniformLocation(p, 'uTime'),
        uParam: gl.getUniformLocation(p, 'uParam'),
        uTex: gl.getUniformLocation(p, 'uTex')
      };
    }
    if (entry.error) console.error('[shader-demos] ' + name + ':\n' + entry.error);
    programs[name] = entry;
    return entry;
  }

  const textures = {};
  function texture(key) {
    if (textures[key]) return textures[key];
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([128, 128, 128, 255]));
    const src = (window.ShaderTextures || {})[key];
    if (src) {
      const img = new Image();
      img.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      };
      img.src = src;
    } else console.error('[shader-demos] missing texture: ' + key);
    return (textures[key] = t);
  }

  function render(name, spec, w, h, time, param) {
    const e = program(name, spec);
    if (e.error) return false;
    if (canvas.width < w || canvas.height < h) {
      canvas.width = Math.max(canvas.width, w);
      canvas.height = Math.max(canvas.height, h);
    }
    gl.viewport(0, 0, w, h);
    gl.useProgram(e.prog);
    gl.uniform2f(e.uRes, w, h);
    gl.uniform1f(e.uTime, time);
    gl.uniform1f(e.uParam, param);
    if (spec.tex && e.uTex) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture(spec.tex));
      gl.uniform1i(e.uTex, 0);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return true;
  }

  return { canvas, gl, program, render };
}

// ---- mesh renderer: draws models from models.js (window.ShaderModels) with a depth buffer -------
const MESH_VS = `#version 300 es
in vec3 aPos;
in vec3 aNrm;
uniform mat4 uMVP;
uniform mat3 uRot;
out vec3 vN;
void main() {
  vN = uRot * aNrm;
  gl_Position = uMVP * vec4(aPos, 1.);
}
`;

const MESH_FS_HEAD = `#version 300 es
precision highp float;
uniform float uTime;
in vec3 vN;
out vec4 outColor;
`;

const MESH_FS_MAIN = `
void main() { outColor = vec4(shade(vN), 1.); }
`;

function mat4Mul(a, b) {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  return o;
}

function perspective(fovY, aspect, near, far) {
  const f = 1 / Math.tan(fovY / 2), nf = 1 / (near - far);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
}

// where the models stand: the showcase map's sphere (-2.3), box (0) and torus (2.3), on the floor at y = -1
const MESH_SCENES = {
  fx_models: {
    floorY: -1,
    objects: [
      { model: 'tree', pos: [-2.3, -1, 0], size: 2.3 },
      { model: 'rock', pos: [0, -1, 0], size: 2.0 },
      { model: 'mushroom', pos: [2.3, -1, 0], size: 1.9 }
    ]
  }
};

// same camera as orbit() in the ray-marched demos (CAM_DIST, CAM_ELEV, CAM_TARGET, camAng, focal 1.8)
function orbitView(ang) {
  const dist = 5.7, elev = 0.36, tg = [0, -0.1, 0];
  const eye = [tg[0] + dist * Math.cos(ang) * Math.cos(elev), tg[1] + dist * Math.sin(elev), tg[2] + dist * Math.sin(ang) * Math.cos(elev)];
  const norm = v => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const f = norm([tg[0] - eye[0], tg[1] - eye[1], tg[2] - eye[2]]);
  const r = norm(cross(f, [0, 1, 0]));
  const u = cross(r, f);
  return new Float32Array([r[0], u[0], -f[0], 0, r[1], u[1], -f[1], 0, r[2], u[2], -f[2], 0, -dot(r, eye), -dot(u, eye), dot(f, eye), 1]);
}

function floorDisc(y, radius) {
  const p = [], n = [], seg = 96;
  for (let i = 0; i < seg; i++) {
    const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2;
    p.push(0, y, 0, Math.cos(a1) * radius, y, Math.sin(a1) * radius, Math.cos(a0) * radius, y, Math.sin(a0) * radius);
    n.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
  }
  return { p, n };
}

function createMeshRenderer() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2', {
    antialias: true, alpha: false, depth: true, stencil: false,
    preserveDrawingBuffer: false, powerPreference: 'high-performance'
  });
  if (!gl) return null;
  const vsh = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vsh, MESH_VS);
  gl.compileShader(vsh);
  const programs = {}, meshes = {};

  function program(name, spec) {
    if (programs[name]) return programs[name];
    let entry;
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, MESH_FS_HEAD + spec.fs + MESH_FS_MAIN);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      entry = { error: gl.getShaderInfoLog(fs) };
    } else {
      const p = gl.createProgram();
      gl.attachShader(p, vsh);
      gl.attachShader(p, fs);
      gl.bindAttribLocation(p, 0, 'aPos');
      gl.bindAttribLocation(p, 1, 'aNrm');
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) entry = { error: gl.getProgramInfoLog(p) };
      else entry = {
        prog: p,
        uMVP: gl.getUniformLocation(p, 'uMVP'),
        uRot: gl.getUniformLocation(p, 'uRot'),
        uTime: gl.getUniformLocation(p, 'uTime')
      };
    }
    if (entry.error) console.error('[shader-demos] ' + name + ':\n' + entry.error);
    programs[name] = entry;
    return entry;
  }

  function mesh(key, inline) {
    if (meshes[key]) return meshes[key];
    const m = inline || (window.ShaderModels || {})[key];
    if (!m) { console.error('[shader-demos] missing model: ' + key); return (meshes[key] = null); }
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    [[0, m.p], [1, m.n]].forEach(([loc, data]) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);
    });
    gl.bindVertexArray(null);
    let top = 0;
    for (let i = 1; i < m.p.length; i += 3) top = Math.max(top, m.p[i]);
    return (meshes[key] = { vao, count: m.p.length / 3, top });
  }

  function render(name, spec, w, h, time) {
    const e = program(name, spec);
    if (e.error) return false;
    const scene = MESH_SCENES[spec.scene];
    if (canvas.width < w || canvas.height < h) {
      canvas.width = Math.max(canvas.width, w);
      canvas.height = Math.max(canvas.height, h);
    }
    gl.viewport(0, 0, w, h);
    gl.clearColor(0.106, 0.071, 0.227, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(e.prog);
    gl.uniform1f(e.uTime, time);
    // vertical field of view as in toScreen(): at least FIT_W (1.45) units across on narrow panes
    const aspect = w / h;
    const fovY = 2 * Math.atan(Math.max(1, 1.45 / aspect) / 1.8);
    const vp = mat4Mul(perspective(fovY, aspect, 0.05, 60), orbitView(0.7 + time * 0.2));
    gl.uniformMatrix3fv(e.uRot, false, new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]));
    const draw = (m, model) => {
      gl.uniformMatrix4fv(e.uMVP, false, mat4Mul(vp, model));
      gl.bindVertexArray(m.vao);
      gl.drawArrays(gl.TRIANGLES, 0, m.count);
    };
    const floor = mesh('__floor', floorDisc(scene.floorY, 38));
    draw(floor, new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]));
    scene.objects.forEach(o => {
      const m = mesh(o.model);
      if (!m) return;
      const k = o.size;
      draw(m, new Float32Array([k, 0, 0, 0, 0, k, 0, 0, 0, 0, k, 0, o.pos[0], o.pos[1], o.pos[2], 1]));
    });
    gl.bindVertexArray(null);
    return true;
  }

  return { canvas, gl, program, render };
}

let meshRenderer;

const MAX_PIXELS = 1.1e6;

function drawCanvas(r, el, time) {
  const spec = DEMOS[el.dataset.demo];
  if (!spec) return;
  const rect = el.getBoundingClientRect();
  if (rect.width < 4 || rect.height < 4) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2) * (spec.scale || 1);
  let w = rect.width * dpr, h = rect.height * dpr;
  const k = Math.min(1, Math.sqrt(MAX_PIXELS / (w * h)));
  w = Math.max(1, Math.round(w * k));
  h = Math.max(1, Math.round(h * k));
  if (el.width !== w || el.height !== h) { el.width = w; el.height = h; }
  const ctx = el._ctx || (el._ctx = el.getContext('2d'));
  let rr = r;
  if (spec.scene) rr = meshRenderer === undefined ? (meshRenderer = createMeshRenderer()) : meshRenderer;
  if (!rr || !rr.render(el.dataset.demo, spec, w, h, time, parseFloat(el.dataset.param || '0'))) {
    ctx.fillStyle = '#2a0d0d';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ff8a7a';
    ctx.font = Math.round(h / 14) + 'px monospace';
    ctx.fillText('shader error: ' + el.dataset.demo, 12, h / 6);
    return;
  }
  ctx.drawImage(rr.canvas, 0, rr.canvas.height - h, w, h, 0, 0, w, h);
}

function start(getSlide) {
  const r = createRenderer();
  const all = Array.from(document.querySelectorAll('canvas[data-demo]'));
  if (!r) {
    all.forEach(el => {
      const ctx = el.getContext('2d');
      ctx.fillStyle = '#222'; ctx.fillRect(0, 0, el.width, el.height);
      ctx.fillStyle = '#aaa'; ctx.font = '14px monospace';
      ctx.fillText('WebGL2 no disponible', 10, 24);
    });
    return;
  }
  const t0 = performance.now();
  function frame(now) {
    const slide = getSlide();
    if (slide) slide.querySelectorAll('canvas[data-demo]').forEach(el => drawCanvas(r, el, (now - t0) / 1000));
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  const names = Array.from(new Set(all.map(el => el.dataset.demo)));
  let i = 0;
  (function warm() {
    if (i >= names.length) return;
    const n = names[i++];
    if (DEMOS[n] && !DEMOS[n].scene) r.program(n, DEMOS[n]);
    setTimeout(warm, 40);
  })();
}

window.ShaderDemos = { DEMOS, MAPS, buildSource, createRenderer, start };
})();
