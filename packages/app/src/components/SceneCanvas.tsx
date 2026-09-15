"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { buildBrainPoints, type BrainPoints } from "@/lib/brain-points";
import { useLabStore } from "@/lib/store";

/**
 * The real brain: a point cloud of all 139,248 FlyWire neurons at their
 * annotated soma coordinates (FlyWire/FAFB14 nm — see graph-meta.json for the
 * honest coordinate-space note). Drag to orbit, wheel to zoom.
 */
export default function SceneCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);
  const setPhase = useLabStore((s) => s.setPhase);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let raf = 0;
    let disposed = false;
    let brain: BrainPoints | null = null;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050507);
    const camera = new THREE.PerspectiveCamera(50, mount.clientWidth / mount.clientHeight, 100, 500000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x050507, 1);
    mount.appendChild(renderer.domElement);

    const controls = {
      theta: 0.6, phi: 1.15, dist: 300000, target: new THREE.Vector3(),
      dragging: false, lx: 0, ly: 0,
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
      controls.dist = Math.min(700000, Math.max(50000, controls.dist * (1 + Math.sign(e.deltaY) * 0.12)));
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
    applyCamera();

    (async () => {
      try {
        brain = await buildBrainPoints();
        if (disposed) return;
        // positions are already centred on the annotated centroid -> orbit origin
        controls.target.set(0, 0, 0);
        scene.add(brain.points);
        setPhase("ready");
      } catch (err) {
        if (!disposed) setPhase("error", String((err as Error)?.message ?? err));
      }
    })();

    const animate = () => {
      if (!controls.dragging) controls.theta += 0.0008;
      applyCamera();
      renderer.render(scene, camera);
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
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      mount.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      mount.removeEventListener("wheel", onWheel);
      brain?.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [setPhase]);

  return (
    <div
      id="scene-canvas"
      ref={mountRef}
      aria-label="3D view of the FlyWire connectome: every neuron at its real annotated soma position"
      className="absolute inset-0 h-full w-full"
    />
  );
}
