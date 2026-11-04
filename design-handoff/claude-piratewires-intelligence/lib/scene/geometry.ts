/**
 * Procedural point cloud for the Capitol Hill scene.
 *
 * Everything is generated from code (no model files): two terrain sheets,
 * the U.S. Capitol (front-facing half only, so additive blending stays legible),
 * a few flanking blocks and a handful of HUD markers.
 *
 * Coordinate system: x right, y up, +z toward the camera. The Capitol faces +z.
 */
import { createNoise2D, createRandom, type Rand } from "./random";

export const GROUP = { far: 0, near: 1, capitol: 2, blocks: 3, marker: 4 } as const;

export interface SceneLayout {
  /** World position of the Capitol's base centre. */
  capitol: { x: number; z: number; scale: number };
  /** 0.35–1. Multiplies particle density (lower on small / slow devices). */
  density: number;
}

export interface PointCloud {
  count: number;
  position: Float32Array;
  size: Float32Array;
  bright: Float32Array;
  red: Float32Array;
  wave: Float32Array;
  seed: Float32Array;
  hollow: Float32Array;
  group: Float32Array;
  /** Anchors used for red data "pins" (vertical lines). */
  pins: { x: number; y: number; z: number; h: number }[];
  /** Points eligible to host transient activity pulses. */
  hotspots: { x: number; z: number }[];
}

interface PointOpts {
  size?: number;
  bright?: number;
  red?: number;
  wave?: number;
  hollow?: number;
  group?: number;
}

class Builder {
  private data: number[][] = [[], [], [], [], [], [], [], []];
  constructor(private rand: Rand) {}
  push(x: number, y: number, z: number, o: PointOpts = {}) {
    const d = this.data;
    d[0].push(x, y, z);
    d[1].push(o.size ?? 0.06);
    d[2].push(o.bright ?? 1);
    d[3].push(o.red ?? 0);
    d[4].push(o.wave ?? 0);
    d[5].push(this.rand());
    d[6].push(o.hollow ?? 0);
    d[7].push(o.group ?? 0);
  }
  build(): Omit<PointCloud, "pins" | "hotspots"> {
    const d = this.data;
    return {
      count: d[1].length,
      position: new Float32Array(d[0]),
      size: new Float32Array(d[1]),
      bright: new Float32Array(d[2]),
      red: new Float32Array(d[3]),
      wave: new Float32Array(d[4]),
      seed: new Float32Array(d[5]),
      hollow: new Float32Array(d[6]),
      group: new Float32Array(d[7]),
    };
  }
}

/* ------------------------------------------------------------------ terrain */

export function createTerrain(seed = 7) {
  const noise = createNoise2D(createRandom(seed));
  /** Back ridge: Capitol Hill and the ridgeline it sits on. */
  const far = (x: number, z: number, cap: SceneLayout["capitol"]) => {
    let h =
      9.5 +
      2.6 * Math.sin(x * 0.085 + 1.2) +
      1.6 * Math.sin(x * 0.19 + 0.4) * Math.cos(z * 0.13) +
      3.2 * noise(x * 0.05, z * 0.07) +
      1.2 * Math.abs(noise(x * 0.12 + 3, z * 0.1)) +
      0.5 * noise(x * 0.3, z * 0.3);
    // the hill: a broad mound under the Capitol, plateau-flat at its top
    const dx = (x - cap.x) / 26;
    const dz = (z - cap.z) / 9;
    const mound = Math.exp(-(dx * dx + dz * dz));
    h = h * (1 - mound * 0.9) + 12.4 * mound;
    // fall off toward the back so the ridge has a crest, not a wall
    h -= Math.max(0, -z - 58) * 0.18;
    return h;
  };
  /** Foreground dunes. */
  const near = (x: number, z: number) =>
    -1.4 +
    1.8 * Math.sin(x * 0.14 + z * 0.09) +
    1.4 * Math.sin(x * 0.065 - 1.1) +
    0.7 * Math.cos(z * 0.32 + x * 0.05) +
    1.3 * noise(x * 0.07 + 10, z * 0.09) +
    // dunes rise toward the screen edges, dip toward the centre line
    Math.min(2.4, Math.abs(x) * 0.045);
  return { far, near, noise };
}

/* ------------------------------------------------------------------ capitol */

function buildCapitol(b: Builder, rand: Rand, ox: number, oy: number, oz: number, s: number) {
  const G = GROUP.capitol;
  const P = (x: number, y: number, z: number, bright = 1, size = 0.068, red = 0) =>
    b.push(ox + x * s, oy + y * s, oz + z * s, { bright, size: size * Math.max(0.8, s), group: G, red });

  const line = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, step = 0.14, bright = 1) => {
    const len = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
    const n = Math.max(2, Math.round(len / step));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      P(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, z0 + (z1 - z0) * t, bright);
    }
  };

  /** Classical facade: pilasters, window bays, cornice and base course. */
  const facade = (x0: number, x1: number, y0: number, y1: number, z: number, bay = 0.62) => {
    const step = 0.13;
    for (let x = x0; x <= x1 + 1e-6; x += step) {
      for (let y = y0; y <= y1 + 1e-6; y += step) {
        const bx = ((x - x0) % bay) / bay; // position inside the bay
        const fy = (y - y0) / (y1 - y0);
        const pilaster = bx < 0.18;
        const cornice = fy > 0.88;
        const baseCourse = fy < 0.12;
        const windowBand = (fy > 0.22 && fy < 0.45) || (fy > 0.56 && fy < 0.8);
        let bright = pilaster || cornice || baseCourse ? 0.95 : windowBand ? 0.08 : 0.42;
        if (rand() < 0.08) bright *= 0.35; // pixel dropout
        if (bright > 0.05) P(x, y, z, bright, 0.062);
      }
    }
    line(x0, y1 + 0.05, z, x1, y1 + 0.05, z, 0.1, 1); // roofline
  };

  /** Free-standing portico: columns + pediment. */
  const portico = (cx: number, w: number, y0: number, y1: number, z: number, cols: number, pedH: number) => {
    for (let i = 0; i < cols; i++) {
      const x = cx - w / 2 + (w * i) / (cols - 1);
      line(x, y0, z, x, y1, z, 0.11, 1);
      line(x + 0.07, y0, z, x + 0.07, y1, z, 0.11, 0.5);
    }
    line(cx - w / 2 - 0.2, y1, z, cx + w / 2 + 0.2, y1, z, 0.09, 1); // entablature
    line(cx - w / 2 - 0.2, y1 + 0.18, z, cx + w / 2 + 0.2, y1 + 0.18, z, 0.09, 0.8);
    // pediment
    line(cx - w / 2 - 0.2, y1 + 0.18, z, cx, y1 + 0.18 + pedH, z, 0.09, 1);
    line(cx, y1 + 0.18 + pedH, z, cx + w / 2 + 0.2, y1 + 0.18, z, 0.09, 1);
    for (let k = 0; k < 40; k++) {
      const t = rand();
      const u = rand() * (1 - Math.abs(t - 0.5) * 2);
      P(cx - w / 2 + w * t, y1 + 0.22 + pedH * u * 0.9, z, 0.35);
    }
    // steps
    for (let k = 0; k < 4; k++) line(cx - w / 2 - 0.4 + k * 0.1, y0 - k * 0.12, z + 0.2 + k * 0.2, cx + w / 2 + 0.4 - k * 0.1, y0 - k * 0.12, z + 0.2 + k * 0.2, 0.12, 0.55);
  };

  /** Roof edges give the blocks depth so they read as volumes, not cards. */
  const roof = (x0: number, x1: number, y: number, zf: number, zb: number) => {
    line(x0, y, zb, x1, y, zb, 0.16, 0.45);
    line(x0, y, zf, x0, y, zb, 0.16, 0.6);
    line(x1, y, zf, x1, y, zb, 0.16, 0.6);
  };

  const front = (deg: number) => Math.abs(deg) <= 112; // only the camera-facing half

  /** Ring of points (or columns) around the dome axis. */
  const ring = (r: number, y: number, stepDeg = 3, bright = 1) => {
    for (let a = -180; a < 180; a += stepDeg) {
      if (!front(a)) continue;
      const t = (a * Math.PI) / 180;
      P(Math.sin(t) * r, y, Math.cos(t) * r, bright);
    }
  };
  const colonnade = (r: number, y0: number, y1: number, everyDeg: number, bright = 1) => {
    for (let a = -180; a < 180; a += everyDeg) {
      if (!front(a)) continue;
      const t = (a * Math.PI) / 180;
      const facing = 0.45 + 0.55 * Math.cos(t);
      line(Math.sin(t) * r, y0, Math.cos(t) * r, Math.sin(t) * r, y1, Math.cos(t) * r, 0.1, bright * facing);
    }
  };

  // ---- podium / plaza, with a skirt that bleeds down into the hill
  for (let x = -13.5; x <= 13.5; x += 0.22) {
    for (let k = 0; k < 3; k++) P(x, -0.1 + k * 0.18, 5.2 - k * 0.15, 0.4 + 0.2 * k);
    for (let k = 0; k < 6; k++) if (rand() < 0.55 - k * 0.07) P(x + (rand() - 0.5) * 0.2, -0.3 - k * 0.32 - rand() * 0.2, 5.4 + k * 0.5, 0.55 - k * 0.07);
  }

  // ---- main blocks (centre, connectors, Senate + House wings)
  facade(-4.2, 4.2, 0.4, 3.0, 2.6);
  roof(-4.2, 4.2, 3.05, 2.6, -2.6);
  portico(0, 5.0, 0.4, 2.55, 4.0, 10, 0.95);
  for (const sgn of [-1, 1]) {
    const c0 = sgn * 4.2;
    const c1 = sgn * 7.4;
    facade(Math.min(c0, c1), Math.max(c0, c1), 0.4, 2.7, 1.8);
    roof(Math.min(c0, c1), Math.max(c0, c1), 2.75, 1.8, -1.8);
    const w0 = sgn * 7.4;
    const w1 = sgn * 12.6;
    facade(Math.min(w0, w1), Math.max(w0, w1), 0.4, 2.85, 3.2);
    roof(Math.min(w0, w1), Math.max(w0, w1), 2.9, 3.2, -3.0);
    portico(sgn * 10.0, 3.0, 0.4, 2.45, 4.0, 8, 0.7);
    // side return of the wing so the end reads as a corner
    for (let z = -3; z <= 3.2; z += 0.18) for (let y = 0.4; y <= 2.85; y += 0.2) P(w1, y, z, 0.28);
  }

  // ---- dome assembly
  const yBase = 3.05;
  for (let y = yBase; y < yBase + 0.6; y += 0.12) ring(3.3, y, 2.6, 0.75); // podium drum
  colonnade(3.15, yBase + 0.6, yBase + 2.3, 7.5, 1); // peristyle
  for (let y = yBase + 0.7; y < yBase + 2.2; y += 0.24) ring(2.7, y, 4, 0.18); // wall behind
  ring(3.25, yBase + 2.35, 1.8, 1); // entablature
  ring(3.25, yBase + 2.5, 1.8, 0.8);
  for (let y = yBase + 2.6; y < yBase + 3.2; y += 0.12) ring(2.85, y, 2.2, 0.7); // attic
  colonnade(2.55, yBase + 3.2, yBase + 4.0, 9, 0.7); // upper drum windows
  ring(2.6, yBase + 4.05, 1.8, 1);

  const domeY = yBase + 4.1;
  const domeR = 2.55;
  const domeH = 2.75;
  // ribs
  for (let a = -180; a < 180; a += 9) {
    if (!front(a)) continue;
    const t = (a * Math.PI) / 180;
    for (let th = 0; th <= Math.PI / 2 - 0.08; th += 0.035) {
      const r = domeR * Math.cos(th);
      const facing = 0.4 + 0.6 * Math.cos(t);
      P(Math.sin(t) * r, domeY + domeH * Math.sin(th), Math.cos(t) * r, facing);
    }
  }
  // horizontal courses + window rows on the dome
  for (const th of [0.08, 0.32, 0.55, 0.8, 1.05, 1.28]) {
    ring(domeR * Math.cos(th), domeY + domeH * Math.sin(th), th > 1 ? 4 : 2.2, 0.8);
  }

  // lantern + Statue of Freedom
  const lY = domeY + domeH - 0.15;
  colonnade(0.55, lY, lY + 1.0, 24, 1);
  ring(0.6, lY, 12, 1);
  ring(0.6, lY + 1.02, 12, 1);
  for (let th = 0; th < Math.PI / 2; th += 0.15) ring(0.6 * Math.cos(th), lY + 1.05 + 0.45 * Math.sin(th), 20, 0.9);
  line(0, lY + 1.5, 0, 0, lY + 2.35, 0, 0.06, 1);
  for (let k = 0; k < 14; k++) P((rand() - 0.5) * 0.18, lY + 1.95 + rand() * 0.35, 0, 1);
}

/** Office blocks flanking the hill. `red` paints one as a live data cluster. */
function buildBlock(b: Builder, rand: Rand, x0: number, x1: number, y0: number, h: number, z: number, red: number) {
  const step = 0.2;
  for (let x = x0; x <= x1; x += step) {
    for (let y = y0; y <= y0 + h; y += step) {
      const window = Math.floor((x - x0) / 0.6) % 2 === 1 && Math.floor((y - y0) / 0.4) % 2 === 1;
      const edge = y > y0 + h - step * 1.2 || x - x0 < step || x1 - x < step;
      const bright = edge ? 0.95 : window ? 0.2 : 0.55;
      if (rand() < 0.1) continue;
      b.push(x, y, z, { bright, size: 0.06, red: red * (edge ? 1 : rand() < 0.75 ? 1 : 0.2), group: GROUP.blocks });
    }
  }
  // a mast on the red block — reads as a node / antenna
  if (red > 0) {
    for (let y = y0 + h; y < y0 + h + 2.4; y += 0.1) b.push((x0 + x1) / 2 + 1.3, y, z, { bright: 1, size: 0.05, red: 1, group: GROUP.blocks });
  }
}

/* ------------------------------------------------------------------ assemble */

export function buildScene(layout: SceneLayout, seed = 2028): PointCloud {
  const rand = createRandom(seed);
  const b = new Builder(rand);
  const terrain = createTerrain(seed % 97);
  const cap = layout.capitol;
  const dens = Math.max(0.35, Math.min(1, layout.density));

  // Red data clusters baked into the ground (activity pulses add more at runtime)
  const clusters = [
    { x: -40, z: -40, r: 7 },
    { x: cap.x + 21, z: cap.z + 3, r: 8 },
    { x: 44, z: -34, r: 8 },
    { x: -27, z: -3, r: 7 },
    { x: 22, z: -1, r: 8 },
  ];
  const redAt = (x: number, z: number) => {
    let r = 0;
    for (const c of clusters) {
      const d2 = ((x - c.x) ** 2 + (z - c.z) ** 2) / (c.r * c.r);
      r = Math.max(r, Math.exp(-d2 * 1.6));
    }
    return r;
  };

  // ---- far ridge
  const fx = 0.34 / Math.sqrt(dens);
  const fz = 0.5 / Math.sqrt(dens);
  for (let z = -78; z <= -22; z += fz) {
    for (let x = -78; x <= 78; x += fx) {
      const jx = x + (rand() - 0.5) * fx * 0.25;
      const h = terrain.far(jx, z, cap);
      const slope = terrain.far(jx, z + 0.6, cap) - h; // >0 => faces camera
      const crest = Math.max(0, h - terrain.far(jx, z - 1.6, cap)) * 0.6;
      let bright = 0.3 + Math.max(0, slope) * 2.6 + crest * 0.9;
      bright = Math.min(1, bright) * (0.45 + 0.55 * rand());
      if (rand() < 0.18) continue; // sparse, pixelated
      // keep the Capitol's footprint clear
      if (Math.abs(jx - cap.x) < 14 * cap.scale && z > cap.z - 4 && z < cap.z + 6) {
        if (rand() < 0.75) continue;
        bright *= 0.4;
      }
      const edgeFade = 1 - Math.max(0, (Math.abs(x) - 55) / 23);
      const red = redAt(jx, z) * (rand() < 0.55 ? 1 : 0);
      b.push(jx, h, z, {
        bright: Math.max(bright, red * 0.85) * edgeFade,
        size: 0.1 + rand() * 0.06,
        red,
        wave: 0.45,
        hollow: rand() < 0.05 ? 1 : 0,
        group: GROUP.far,
      });
    }
  }

  // ---- near dunes
  const nx = 0.42 / Math.sqrt(dens);
  const nz = 0.42 / Math.sqrt(dens);
  for (let z = -10; z <= 17; z += nz) {
    for (let x = -46; x <= 46; x += nx) {
      const h = terrain.near(x, z);
      const slope = terrain.near(x, z + 0.5) - h;
      const crest = Math.max(0, h - terrain.near(x, z - 1.2)) * 0.5;
      let bright = 0.26 + Math.max(0, slope) * 2.2 + Math.max(0, -slope) * 0.6 + crest * 1.1;
      bright = Math.min(1, bright) * (0.4 + 0.6 * rand());
      if (rand() < 0.2) continue;
      const red = redAt(x, z) * (rand() < 0.5 ? 1 : 0.15);
      b.push(x + (rand() - 0.5) * 0.1, h, z, {
        bright: Math.max(bright, red * 0.8),
        size: 0.07 + rand() * 0.06,
        red,
        wave: 1,
        hollow: rand() < 0.14 ? 1 : 0,
        group: GROUP.near,
      });
    }
  }

  // ---- the Capitol on its hill
  const capY = terrain.far(cap.x, cap.z, cap) - 0.2;
  buildCapitol(b, rand, cap.x, capY, cap.z, cap.scale);

  // ---- flanking blocks (left: plain, right: the red cluster)
  const s = cap.scale;
  const ground = (x: number, z: number) => Math.min(capY + 0.4, terrain.far(x, z, cap)) - 0.5;
  buildBlock(b, rand, cap.x - 26 * s, cap.x - 17 * s, ground(cap.x - 21 * s, cap.z + 1), 2.2 * s, cap.z + 1, 0);
  buildBlock(b, rand, cap.x - 35 * s, cap.x - 28 * s, ground(cap.x - 31 * s, cap.z - 2), 1.6 * s, cap.z - 2, 0);
  buildBlock(b, rand, cap.x + 17 * s, cap.x + 27 * s, ground(cap.x + 22 * s, cap.z + 1), 2.4 * s, cap.z + 1, 1);

  // ---- floating HUD markers (hollow squares)
  const markers: [number, number, number][] = [
    [-34, 24, -50],
    [-22, 23, -48],
    [cap.x + 24, 25, -52],
    [-6, 2.0, -14],
    [38, 21, -46],
  ];
  for (const [x, y, z] of markers) b.push(x, y, z, { size: 0.42, bright: 0.9, hollow: 1, group: GROUP.marker });

  // ---- pins: thin vertical lines above red clusters
  const pins = [
    { x: cap.x + 26 * s, z: cap.z + 1, h: 6 },
    { x: -40, z: -40, h: 9 },
    { x: 44, z: -34, h: 7 },
    { x: -27, z: -3, h: 10 },
  ].map((p) => ({ ...p, y: p.z > -20 ? terrain.near(p.x, p.z) : terrain.far(p.x, p.z, cap) }));

  const hotspots = [
    ...clusters.map((c) => ({ x: c.x, z: c.z })),
    { x: -12, z: -30 },
    { x: 10, z: 2 },
    { x: -40, z: 12 },
    { x: 48, z: -36 },
    { x: -52, z: -55 },
  ];

  return { ...b.build(), pins, hotspots };
}
