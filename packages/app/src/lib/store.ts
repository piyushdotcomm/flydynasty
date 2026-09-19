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
  /** playback position within the selected trial (ms, 0..durationMs) */
  playheadMs: number;
  /** whether the playhead is advancing */
  playing: boolean;
  /** show the real-anatomy fly body viewer (flybody meshes) */
  showFly: boolean;
  setSelected: (id: string | null) => void;
  setPlayhead: (ms: number) => void;
  setPlaying: (playing: boolean) => void;
  setShowFly: (show: boolean) => void;
  setPhase: (phase: LoadPhase, error?: string | null) => void;
}

export const useLabStore = create<LabState>((set) => ({
  phase: "idle",
  error: null,
  selectedId: null,
  playheadMs: 0,
  playing: false,
  setSelected: (id) => set({ selectedId: id, playheadMs: 0, playing: false }),
  setPlayhead: (ms) => set({ playheadMs: ms }),
  setPlaying: (playing) => set({ playing }),
  showFly: false,
  setShowFly: (showFly) => set({ showFly }),
  setPhase: (phase, error = null) => set({ phase, error }),
}));
