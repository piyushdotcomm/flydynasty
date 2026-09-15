import { create } from "zustand";

/**
 * UI state: which precomputed condition is selected, and the loaded data.
 * "Selecting a stimulus" plays back the matching offline model run — the
 * browser does not run the 139k-neuron simulation live; every trace was
 * computed by pipelines/export_traces.ts with the string-ID graph.
 */
export type LoadPhase =
  | "idle"
  | "loading-meta"
  | "loading-neurons"
  | "loading-index"
  | "ready"
  | "error";

interface LabState {
  phase: LoadPhase;
  error: string | null;
  selectedId: string | null;
  setSelected: (id: string | null) => void;
  setPhase: (phase: LoadPhase, error?: string | null) => void;
}

export const useLabStore = create<LabState>((set) => ({
  phase: "idle",
  error: null,
  selectedId: null,
  setSelected: (id) => set({ selectedId: id }),
  setPhase: (phase, error = null) => set({ phase, error }),
}));
