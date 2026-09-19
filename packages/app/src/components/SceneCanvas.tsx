"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { buildBrainPoints, type BrainPoints } from "@/lib/brain-points";
import { applyTraceGlow, clearTraceGlow, applyWhatIfGlow, clearWhatIfGlow, type GlowState, type WhatIfGlowState } from "@/lib/trace-glow";
import {
  buildSpikePlayback,
  applySpikePlayback,
  clearSpikePlayback,
  type SpikePlaybackState,
} from "@/lib/spike-playback";
import { buildFlyModel, type FlyModel } from "@/lib/fly-model";
import { buildStage, placeFlyOnStage, type Stage } from "@/lib/stage";
import { loadTrace } from "@/lib/data";
import { useLabStore } from "@/lib/store";

/**
 * The scene has two views (docs 04 + 09 §4):
 *
 *  - brain (default): the real connectome — 139,248 FlyWire neurons at their
 *    annotated soma coordinates. Trace/what-if glow + spike playback.
 *
 *  - stage: the photoreal kitchen diorama — HDRI-lit counter, PBR wood +
 *    marble, food props, and the real flybody rig standing on the counter.
 *    The fly's proboscis extends with MN9_r spikes from the SELECTED RUN
 *    (playback of precomputed data, labeled on the HUD) — never a live claim.
 */
export default function SceneCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);
  const setPhase = useLabStore((s) => s.setPhase);
  const selectedId = useLabStore((s) => s.selectedId);
  const glowRef = useRef<GlowState | null>(null);
  const playbackRef = useRef<SpikePlaybackState | null>(null);
  const pointsRef = useRef<THREE.Points | null>(null);
  const view = useLabStore((s) => s.view);
  const whatIfResponders = useLabStore((s) => s.whatIfResponders);
  const whatIfWeights = useLabStore((s) => s.whatIfWeights);
  const whatIfGlowRef = useRef<WhatIfGlowState | null>(null);
  /** the main bootstrap's renderer — the stage needs it for PMREM env baking */
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // live what-if responders: magenta highlight, applied on top of any trace tint
  useEffect(() => {
    const points = pointsRef.current;
    if (!points || view !== "brain") return;
    clearWhatIfGlow(whatIfGlowRef.current);
    whatIfGlowRef.current = null;
    if (!whatIfResponders) return;
    whatIfGlowRef.current = applyWhatIfGlow(points, whatIfResponders, whatIfWeights ?? []);
    return () => {
      clearWhatIfGlow(whatIfGlowRef.current);
      whatIfGlowRef.current = null;
    };
  }, [whatIfResponders, whatIfWeights, view]);

  // trace playback: recolor responders of the selected condition (brain view)
  useEffect(() => {
    if (view !== "brain") return;
    const points = pointsRef.current;
    if (!points) return;
    let disposed = false;
    (async () => {
      clearSpikePlayback(playbackRef.current);
      playbackRef.current = null;
      clearTraceGlow(glowRef.current);
      glowRef.current = null;
      if (!selectedId) return;
      try {
        const entry = { id: selectedId, file: `trace-${selectedId}.json` } as const;
        const trace = await loadTrace(entry as never);
        if (disposed) return;
        glowRef.current = applyTraceGlow(points, trace);
        playbackRef.current = buildSpikePlayback(points, trace);
      } catch {
        // a missing/failed trace must not break the scene; dock shows the error
      }
    })();
    return () => {
      disposed = true;
      clearSpikePlayback(playbackRef.current);
      playbackRef.current = null;
      clearTraceGlow(glowRef.current);
      glowRef.current = null;
    };
  }, [selectedId, view]);

  // ---- the stage layer: mounted on demand, torn down on view switch
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    if (view !== "stage") return;
    let disposed = false;
    let stage: Stage | null = null;
    let fly: FlyModel | null = null;

    // the main bootstrap owns the scene + renderer; wait for it
    let retries = 0;
    const wait = window.setInterval(() => {
      const scene = (mount as HTMLDivElement & { __scene?: THREE.Scene }).__scene;
      const renderer = rendererRef.current;
      if (!scene || !renderer) {
        if (++retries > 100) window.clearInterval(wait); // ~10 s, then give up
        return;
      }
      window.clearInterval(wait);
      if (disposed) return;

      (async () => {
        try {
          stage = await buildStage(renderer);
          if (disposed) {
            stage.dispose();
            return;
          }
          scene.background = stage.root.userData.envMap as THREE.Texture;
          scene.environment = stage.root.userData.envMap as THREE.Texture;
          scene.fog = new THREE.FogExp2(0x1a120b, 0.1);
          scene.add(stage.root);

          fly = await buildFlyModel();
          if (disposed) {
            fly.dispose();
            return;
          }
          placeFlyOnStage(fly, stage);
          scene.add(fly.group);
          (mount as HTMLDivElement & { __stage?: Stage }).__stage = stage;
          (mount as HTMLDivElement & { __fly?: FlyModel }).__fly = fly;
        } catch (err) {
          // stage assets must not break the app; log loudly in dev
          console.error("[stage] build failed:", err);
        }
      })();
    }, 100);

    return () => {
      disposed = true;
      window.clearInterval(wait);
      const sc = (mount as HTMLDivElement & { __scene?: THREE.Scene }).__scene;
      if (fly && sc) {
        sc.remove(fly.group);
        fly.dispose();
      }
      if (stage && sc) {
        sc.remove(stage.root);
        stage.dispose();
      }
      if (sc) {
        sc.background = null;
        sc.environment = null;
        sc.fog = null;
      }
      (mount as HTMLDivElement & { __stage?: Stage }).__stage = undefined;
      (mount as HTMLDivElement & { __fly?: FlyModel }).__fly = undefined;
    };
  }, [view]);

  // ---- main scene bootstrap (runs once)
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let raf = 0;
    let disposed = false;
    let brain: BrainPoints | null = null;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050507);
    const camera = new THREE.PerspectiveCamera(50, mount.clientWidth / mount.clientHeight, 0.01, 500000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x050507, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // camera control state — two presets, one orbit rig
    const controls = {
      theta: 0.6, phi: 1.15, dist: 300000, target: new THREE.Vector3(),
      dragging: false, lx: 0, ly: 0,
    };
    // stage presets (units are stage units; fly ≈ 0.24 long)
    const STAGE_PRESET = {
      theta: 0.6, phi: 1.25, dist: 0.58, target: new THREE.Vector3(0.0, 0.05, 0.0),
    };
    const BRAIN_PRESET = { theta: 0.6, phi: 1.15, dist: 300000, target: new THREE.Vector3() };
    let viewMode: "brain" | "stage" = "brain";

    const applyPreset = (p: typeof BRAIN_PRESET) => {
      controls.theta = p.theta;
      controls.phi = p.phi;
      controls.dist = p.dist;
      controls.target.copy(p.target);
    };

    const onDown = (e: PointerEvent) => { controls.dragging = true; controls.lx = e.clientX; controls.ly = e.clientY; };
    const onMove = (e: PointerEvent) => {
      if (!controls.dragging) return;
      controls.theta -= (e.clientX - controls.lx) * 0.005;
      controls.phi = Math.min(Math.PI - 0.05, Math.max(0.05, controls.phi - (e.clientY - controls.ly) * 0.005));
      controls.lx = e.clientX; controls.ly = e.clientY;
    };
    const onUp = () => { controls.dragging = false; };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = 1 + Math.sign(e.deltaY) * 0.12;
      controls.dist = viewMode === "stage"
        ? Math.min(2, Math.max(0.12, controls.dist * factor))
        : Math.min(700000, Math.max(50000, controls.dist * factor));
    };
    mount.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    mount.addEventListener("wheel", onWheel, { passive: false });

    const applyCamera = () => {
      const { theta, phi, dist, target } = controls;
      camera.position.set(
        target.x + dist * Math.sin(phi) * Math.sin(theta),
        target.y + dist * Math.cos(phi),
        target.z + dist * Math.sin(phi) * Math.cos(theta),
      );
      camera.lookAt(target);
    };

    (async () => {
      try {
        brain = await buildBrainPoints();
        if (disposed) return;
        controls.target.set(0, 0, 0);
        scene.add(brain.points);
        pointsRef.current = brain.points;
        (mount as HTMLDivElement & { __scene?: THREE.Scene }).__scene = scene;
        setPhase("ready");
      } catch (err) {
        if (!disposed) setPhase("error", String((err as Error)?.message ?? err));
      }
    })();

    // react to view switches from inside the render loop bootstrap
    const unsubView = useLabStore.subscribe((s) => {
      const next = s.view;
      if (next === viewMode) return;
      viewMode = next;
      if (next === "stage") {
        applyPreset(STAGE_PRESET);
        if (brain) brain.points.visible = false;
      } else {
        applyPreset(BRAIN_PRESET);
        if (brain) brain.points.visible = true;
      }
    });

    let frame = 0;
    const animate = () => {
      // while a what-if sim runs in the worker, throttle rendering (~2 fps)
      const simRunning = useLabStore.getState().whatIfRunning;
      frame++;
      const tick = !simRunning || frame % 30 === 0;
      if (tick) {
        if (!controls.dragging) controls.theta += viewMode === "stage" ? 0.0004 : 0.0008;
        const st = useLabStore.getState();
        if (viewMode === "brain") {
          const pb = playbackRef.current;
          if (pb) applySpikePlayback(pb, st.playheadMs);
        } else {
          // stage: drive the fly from model output (playback of precomputed
          // runs / live what-if results — labeled on the HUD, never a claim)
          const fly = (mount as HTMLDivElement & { __fly?: FlyModel }).__fly;
          if (fly) {
            fly.extendProboscis(st.proboscisLevel);
            fly.wingBuzz(st.wingBuzz);
            fly.tick(performance.now());
          }
        }
        applyCamera();
        renderer.render(scene, camera);
      }
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(mount);

    return () => {
      disposed = true;
      unsubView();
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      mount.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      mount.removeEventListener("wheel", onWheel);
      clearSpikePlayback(playbackRef.current);
      playbackRef.current = null;
      clearWhatIfGlow(whatIfGlowRef.current);
      whatIfGlowRef.current = null;
      clearTraceGlow(glowRef.current);
      glowRef.current = null;
      pointsRef.current = null;
      brain?.dispose();
      rendererRef.current = null;
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [setPhase]);

  // hide the brain points in stage view (state-driven; covers the bootstrap
  // subscription before brain finished loading)
  useEffect(() => {
    const points = pointsRef.current;
    if (points) points.visible = view === "brain";
  }, [view]);

  return (
    <div
      id="scene-canvas"
      ref={mountRef}
      aria-label="3D view: the FlyWire connectome point cloud, or the kitchen stage with the real fly"
      className="absolute inset-0 h-full w-full"
    />
  );
}
