"use client";

import { useEffect, useState } from "react";

const TOTAL_NEURONS = 139_243;

export default function ConnectomeLoader() {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0.06);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 2600);
    const tick = window.setInterval(() => {
      setProgress((p) => Math.min(p + 0.013 + Math.random() * 0.02, 0.97));
    }, 90);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(tick);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#050507]">
      <p className="font-mono text-sm text-neutral-300">
        Loading connectome… {TOTAL_NEURONS.toLocaleString("en-US")} neurons
      </p>
      <div
        role="progressbar"
        aria-label="Loading connectome"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-4 h-1 w-64 overflow-hidden rounded-full bg-neutral-800"
      >
        <div
          className="h-full origin-left rounded-full bg-amber-500"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
      <p className="mt-3 font-mono text-[11px] text-neutral-500">
        FlyWire · Dorkenwald et al. 2024
      </p>
    </div>
  );
}
