"use client";

import type { StimulusId } from "@/lib/store";
import { useLabStore } from "@/lib/store";

interface StimulusSpec {
  id: StimulusId;
  label: string;
  hint: string;
}

const STIMULI: StimulusSpec[] = [
  { id: "sugar", label: "Sugar", hint: "GRN activation — Shiu et al. 2024" },
  { id: "water", label: "Water", hint: "Water-sensing GRNs" },
  { id: "bitter", label: "Bitter", hint: "Bitter suppresses feeding" },
  { id: "low-salt", label: "Low Salt", hint: "Ir94e low-salt receptor" },
];

export default function ExperimentDock() {
  const activeStimulus = useLabStore((s) => s.activeStimulus);
  const setStimulus = useLabStore((s) => s.setStimulus);

  return (
    <section
      aria-label="Experiment dock"
      className="pointer-events-auto absolute bottom-6 left-6 z-20 w-64 rounded-xl border border-neutral-800/80 bg-neutral-950/70 p-4 backdrop-blur-md"
    >
      <h2 className="text-xs font-medium uppercase tracking-widest text-neutral-400">
        Experiment Dock
      </h2>
      <p className="mt-1 text-[11px] leading-snug text-neutral-500">
        Deliver a taste stimulus to the real gustatory neurons. The LIF model
        responds exactly as in Shiu et al. 2024.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {STIMULI.map((stimulus) => {
          const isActive = activeStimulus === stimulus.id;
          return (
            <button
              key={stimulus.id}
              type="button"
              data-stimulus={stimulus.id}
              onClick={() => setStimulus(isActive ? null : stimulus.id)}
              title={stimulus.hint}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "border-amber-500 bg-amber-500/15 text-amber-400"
                  : "border-neutral-800 bg-neutral-900/60 text-neutral-300 hover:border-neutral-600 hover:text-foreground"
              }`}
            >
              {stimulus.label}
            </button>
          );
        })}
      </div>
      {activeStimulus && (
        <p className="mt-3 text-[11px] text-amber-500/90">
          Delivering {activeStimulus.replace("-", " ")} stimulus…
        </p>
      )}
    </section>
  );
}
