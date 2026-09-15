"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function SceneCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050507);

    const camera = new THREE.PerspectiveCamera(
      50,
      mount.clientWidth / mount.clientHeight,
      0.1,
      200,
    );
    camera.position.set(2.2, 1.6, 3.2);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x050507, 1);
    mount.appendChild(renderer.domElement);

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: 0x7c2d12,
      roughness: 0.45,
      metalness: 0.1,
    });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    const wire = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({ color: 0xf59e0b }),
    );
    cube.add(wire);

    scene.add(new THREE.AmbientLight(0xffffff, 0.25));

    const keyLight = new THREE.DirectionalLight(0xffd9a0, 2.2);
    keyLight.position.set(3, 4, 2);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x3b82f6, 0.8);
    rimLight.position.set(-3, 2, -2);
    scene.add(rimLight);

    let frame = 0;
    let raf = 0;
    const animate = () => {
      frame += 1;
      cube.rotation.y = frame * 0.004;
      cube.rotation.x = Math.sin(frame * 0.01) * 0.15;
      cube.position.y = Math.sin(frame * 0.02) * 0.08;
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
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      wire.geometry.dispose();
      (wire.material as THREE.Material).dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      id="scene-canvas"
      ref={mountRef}
      aria-label="3D scene"
      className="absolute inset-0 h-full w-full"
    />
  );
}
