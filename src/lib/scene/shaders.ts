/**
 * Particle shaders for the Capitol Hill scene.
 * One draw call renders every point: terrain, Capitol, blocks and markers.
 */

export const MAX_PULSES = 6;

/** Keep in sync with `waveAt` in CapitolScene.tsx (used for the pins). */
export const WAVE_GLSL = /* glsl */ `
float waveAt(vec3 p, float t) {
  return sin(p.x * 0.16 + t * 0.55) * 0.38
       + sin(p.z * 0.21 - t * 0.42) * 0.32
       + sin((p.x + p.z) * 0.06 + t * 0.30) * 0.45;
}
`;

export const vertexShader = /* glsl */ `
attribute float aSize;
attribute float aBright;
attribute float aRed;
attribute float aWave;
attribute float aSeed;
attribute float aHollow;
attribute float aGroup;

uniform float uTime;
uniform float uIntro;     // 0 -> 1 assembly on load
uniform float uScroll;    // 0 -> 1 as the hero scrolls away
uniform float uScale;     // px per world unit at distance 1
uniform float uDim;       // global intensity (ambient mode < 1)
uniform vec4  uPulse[${MAX_PULSES}]; // x, z, startTime, radius

varying float vAlpha;
varying float vRed;
varying float vHollow;
varying float vSize;

${WAVE_GLSL}

float hash(float n) { return fract(sin(n) * 43758.5453123); }

void main() {
  vec3 p = position;
  bool isCapitol = aGroup > 1.5 && aGroup < 3.5;

  // living terrain
  p.y += aWave * waveAt(p, uTime);

  // assembly: terrain rises out of the dark, the Capitol condenses last
  float delay = isCapitol ? 0.42 + aSeed * 0.38 : aSeed * 0.45 + (aGroup > 0.5 && aGroup < 1.5 ? 0.0 : 0.12);
  float k = clamp((uIntro * 1.55 - delay) / 0.55, 0.0, 1.0);
  k = 1.0 - pow(1.0 - k, 3.0);
  if (isCapitol) {
    vec3 scatter = vec3(hash(aSeed * 91.7) - 0.5, hash(aSeed * 13.1) * 0.6, hash(aSeed * 47.3) - 0.5) * 9.0;
    p = mix(p + scatter, p, k);
  } else {
    p.y -= (1.0 - k) * 5.0;
  }

  // scroll: the land settles into a flat lattice, the Capitol lifts and dissolves
  float s = uScroll;
  if (isCapitol) {
    p.y += s * s * (2.0 + aSeed * 9.0);
  } else if (aGroup < 1.5) {
    p.y = mix(p.y, -3.2 + aSeed * 0.15, smoothstep(0.0, 0.9, s));
  }

  // activity pulses (red clusters that bloom and fade)
  float red = aRed;
  float hot = 0.0;
  for (int i = 0; i < ${MAX_PULSES}; i++) {
    vec4 pu = uPulse[i];
    float age = uTime - pu.z;
    if (age < 0.0 || age > 6.0 || pu.w <= 0.0) continue;
    float env = smoothstep(0.0, 0.8, age) * (1.0 - smoothstep(2.6, 6.0, age));
    float d = distance(p.xz, pu.xy);
    float fall = 1.0 - smoothstep(pu.w * 0.25, pu.w, d);
    float pick = step(0.42, fract(aSeed * 17.31 + float(i) * 0.37));
    float v = env * fall * pick;
    red = max(red, v);
    hot = max(hot, v * (1.0 - smoothstep(0.0, pu.w * 0.3, d)));
  }

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float depth = -mv.z;
  gl_Position = projectionMatrix * mv;

  float size = aSize * uScale / max(depth, 0.1);
  size *= 1.0 + hot * 0.8;
  gl_PointSize = clamp(size, 1.0, 34.0);
  vSize = gl_PointSize;

  // twinkle + rare glints
  float tw = 0.78 + 0.22 * sin(uTime * (0.8 + aSeed * 1.7) + aSeed * 60.0);
  float glint = pow(max(0.0, sin(uTime * 0.37 + aSeed * 211.0)), 60.0) * 0.9;

  // atmospheric depth
  float fogFar = 1.0 - smoothstep(48.0, 112.0, depth);
  float fogNear = smoothstep(2.5, 9.0, depth);

  float scrollFade = isCapitol ? 1.0 - smoothstep(0.15, 0.75, s) : 1.0 - smoothstep(0.55, 1.0, s) * 0.85;

  vAlpha = clamp((aBright * tw * (isCapitol ? 1.75 : 1.45) + glint + hot * 0.6), 0.0, 1.6) * fogFar * fogNear * k * scrollFade * uDim;
  vRed = red;
  vHollow = aHollow;
}
`;

export const fragmentShader = /* glsl */ `
precision highp float;
uniform vec3 uPaper;
uniform vec3 uSignal;
varying float vAlpha;
varying float vRed;
varying float vHollow;
varying float vSize;

void main() {
  vec2 c = abs(gl_PointCoord - 0.5);
  float edge = max(c.x, c.y);
  // hollow squares (outlined pixels) once they're large enough to read
  if (vHollow > 0.5 && vSize > 4.5 && edge < 0.5 - 1.25 / vSize) discard;
  // a 1px dark seam so big pixels read as tiles, not blobs
  float seam = vSize > 6.0 && edge > 0.5 - 0.9 / vSize ? 0.55 : 1.0;
  vec3 col = mix(uPaper, uSignal, clamp(vRed, 0.0, 1.0));
  float a = vAlpha * seam;
  gl_FragColor = vec4(col * a, a);
}
`;
