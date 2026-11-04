"use client";

/**
 * <CapitolScene />
 *
 * The defining visual: the U.S. Capitol condensing out of a living landscape of
 * white pixels and red data points. Pure Three.js (no R3F) — one Points draw
 * call plus a few line segments, so it holds 60fps on a laptop GPU.
 *
 * - `progress` (ref, 0→1) is driven by scroll; the land flattens into the lattice
 *   that the Intelligence Database sits on.
 * - Cursor parallax is subtle and eased.
 * - prefers-reduced-motion renders a single, fully-assembled still frame.
 * - Rendering pauses when the tab is hidden or the scene is scrolled away.
 */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { color } from "@/lib/design/tokens";
import { buildScene, type SceneLayout } from "@/lib/scene/geometry";
import { MAX_PULSES, fragmentShader, vertexShader } from "@/lib/scene/shaders";

type Mode = "hero" | "ambient";

interface Props {
  /** Scroll progress 0→1, written by the parent without re-rendering. */
  progress?: React.MutableRefObject<number>;
  mode?: Mode;
  className?: string;
}

const LAYOUT: SceneLayout = { capitol: { x: 11, z: -44, scale: 0.86 }, density: 1 };

/** JS twin of the GLSL wave (used to keep the red pins glued to the terrain). */
function waveAt(x: number, z: number, t: number) {
  return Math.sin(x * 0.16 + t * 0.55) * 0.38 + Math.sin(z * 0.21 - t * 0.42) * 0.32 + Math.sin((x + z) * 0.06 + t * 0.3) * 0.45;
}

function hexToVec3(hex: string) {
  const c = new THREE.Color(hex);
  return new THREE.Vector3(c.r, c.g, c.b);
}

export default function CapitolScene({ progress, mode = "hero", className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = Math.min(window.innerWidth, window.innerHeight) < 700;
    const lowPower = (navigator.hardwareConcurrency ?? 8) <= 4;
    const density = small ? 0.5 : lowPower ? 0.7 : 1;

    // ---- renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "high-performance" });
    } catch {
      host.dataset.fallback = "true"; // CSS shows the static lattice instead
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
    renderer.domElement.setAttribute("aria-hidden", "true");

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);

    // ---- points
    const cloud = buildScene({ ...LAYOUT, density });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(cloud.position, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(cloud.size, 1));
    geo.setAttribute("aBright", new THREE.BufferAttribute(cloud.bright, 1));
    geo.setAttribute("aRed", new THREE.BufferAttribute(cloud.red, 1));
    geo.setAttribute("aWave", new THREE.BufferAttribute(cloud.wave, 1));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(cloud.seed, 1));
    geo.setAttribute("aHollow", new THREE.BufferAttribute(cloud.hollow, 1));
    geo.setAttribute("aGroup", new THREE.BufferAttribute(cloud.group, 1));

    const pulses = Array.from({ length: MAX_PULSES }, () => new THREE.Vector4(0, 0, -100, 0));
    const uniforms = {
      uTime: { value: 0 },
      uIntro: { value: reduced ? 1 : 0 },
      uScroll: { value: 0 },
      uScale: { value: 1 },
      uDim: { value: mode === "ambient" ? 0.55 : 1 },
      uPulse: { value: pulses },
      uPaper: { value: hexToVec3(color.paper.DEFAULT) },
      uSignal: { value: hexToVec3(color.signal.DEFAULT) },
    };
    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    scene.add(points);

    // ---- red pins (thin vertical data lines)
    const pinPos = new Float32Array(cloud.pins.length * 2 * 3);
    const pinGeo = new THREE.BufferGeometry();
    pinGeo.setAttribute("position", new THREE.BufferAttribute(pinPos, 3));
    const pinMat = new THREE.LineBasicMaterial({ color: color.signal.DEFAULT, transparent: true, opacity: 0.38, depthWrite: false });
    const pins = new THREE.LineSegments(pinGeo, pinMat);
    scene.add(pins);

    // ---- sizing / framing
    const target = new THREE.Vector3();
    const base = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
    const frame = () => {
      const w = host.clientWidth || window.innerWidth;
      const h = host.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      const aspect = w / h;
      camera.aspect = aspect;
      // portrait screens: wider lens, recentre on the dome
      const portrait = aspect < 1;
      camera.fov = portrait ? 58 : aspect < 1.4 ? 46 : 38;
      const capFocus = portrait ? LAYOUT.capitol.x * 0.95 : aspect < 1.4 ? LAYOUT.capitol.x * 0.5 : 0;
      base.pos.set(capFocus, mode === "ambient" ? 9 : 6.4, portrait ? 30 : 26);
      // portrait: tilt down so the dome clears the search field
      base.look.set(capFocus, portrait ? -2.4 : 5.6, -24);
      camera.updateProjectionMatrix();
      const pr = renderer.getPixelRatio();
      uniforms.uScale.value = (h * pr) / (2 * Math.tan((camera.fov * Math.PI) / 360));
    };
    frame();
    const ro = new ResizeObserver(frame);
    ro.observe(host);

    // ---- cursor parallax
    const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
    const onMove = (e: PointerEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    if (!reduced) window.addEventListener("pointermove", onMove, { passive: true });

    // ---- activity pulses
    let pulseIdx = 0;
    let nextPulse = 1.8;
    const firePulse = (t: number) => {
      const h = cloud.hotspots[Math.floor(Math.random() * cloud.hotspots.length)];
      pulses[pulseIdx].set(h.x + (Math.random() - 0.5) * 6, h.z + (Math.random() - 0.5) * 6, t, 3 + Math.random() * 5);
      pulseIdx = (pulseIdx + 1) % MAX_PULSES;
    };

    // ---- loop
    const clock = new THREE.Clock();
    let raf = 0;
    let running = true;
    const introDuration = 2.6;

    const render = (t: number) => {
      const s = progress?.current ?? 0;
      uniforms.uTime.value = t;
      uniforms.uScroll.value = s;

      mouse.sx += (mouse.x - mouse.sx) * 0.04;
      mouse.sy += (mouse.y - mouse.sy) * 0.04;

      // camera: slow drift + parallax; tilts down toward the lattice on scroll
      camera.position.set(
        base.pos.x + mouse.sx * 1.4 + Math.sin(t * 0.07) * 0.6,
        base.pos.y - mouse.sy * 0.5 + s * 9,
        base.pos.z - s * 6
      );
      target.set(base.look.x + mouse.sx * 0.6, base.look.y - s * 14, base.look.z);
      camera.lookAt(target);

      // pins follow the waving ground
      cloud.pins.forEach((p, i) => {
        const wave = (p.z > -20 ? 1 : 0.45) * waveAt(p.x, p.z, t);
        const y0 = p.y + wave;
        pinPos.set([p.x, y0, p.z, p.x, y0 + p.h, p.z], i * 6);
      });
      pinGeo.attributes.position.needsUpdate = true;
      pinMat.opacity = 0.38 * Math.min(1, uniforms.uIntro.value * 1.5) * (1 - s) * uniforms.uDim.value;

      renderer.render(scene, camera);
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!running) return;
      const t = clock.getElapsedTime();
      if (uniforms.uIntro.value < 1) uniforms.uIntro.value = Math.min(1, t / introDuration);
      if (t > nextPulse) {
        firePulse(t);
        nextPulse = t + 1.4 + Math.random() * 2.2;
      }
      // fully scrolled away: idle
      if ((progress?.current ?? 0) >= 0.999) return;
      render(t);
    };

    if (reduced) {
      // one composed still, re-rendered only on resize
      firePulse(9);
      const still = () => {
        frame();
        render(10);
      };
      still();
      ro.disconnect();
      const ro2 = new ResizeObserver(still);
      ro2.observe(host);
      return () => {
        ro2.disconnect();
        renderer.dispose();
        geo.dispose();
        mat.dispose();
        pinGeo.dispose();
        pinMat.dispose();
        renderer.domElement.remove();
      };
    }

    const onVis = () => {
      running = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", onVis);
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVis);
      renderer.dispose();
      geo.dispose();
      mat.dispose();
      pinGeo.dispose();
      pinMat.dispose();
      renderer.domElement.remove();
    };
  }, [mode, progress]);

  return <div ref={hostRef} className={className} aria-hidden="true" />;
}
