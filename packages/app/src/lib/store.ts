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
  /** scene view: brain point cloud vs the kitchen stage diorama */
  view: "brain" | "stage";
  /** fly proboscis extension 0..1 (MN9_r spike level; stage view only) */
  proboscisLevel: number;
  /** fly wing buzz 0..1 (arousal garnish; stage view only, honesty-labeled) */
  wingBuzz: number;
  /** what-if lab: seed group currently running (null = idle) */
  whatIfGroup: string | null;
  /** what-if lab: main-bundle node indices of the responding sub-sim neurons */
  whatIfResponders: number[] | null;
  /** what-if lab: rate-weighted brightness per responder (parallel to whatIfResponders) */
  whatIfWeights: number[] | null;
  /** what-if lab: true while the worker sim runs (scene throttles to give it CPU) */
  whatIfRunning: boolean;
  setSelected: (id: string | null) => void;
  setPlayhead: (ms: number) => void;
  setPlaying: (playing: boolean) => void;
  setView: (view: "brain" | "stage") => void;
  setFlyBehavior: (proboscisLevel: number, wingBuzz: number) => void;
  setWhatIf: (group: string | null, responders: number[] | null, weights: number[] | null) => void;
  setWhatIfRunning: (running: boolean) => void;
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
  view: "brain",
  setView: (view) => set({ view }),
  proboscisLevel: 0,
  wingBuzz: 0,
  setFlyBehavior: (proboscisLevel, wingBuzz) => set({ proboscisLevel, wingBuzz }),
  whatIfGroup: null,
  whatIfResponders: null,
  whatIfWeights: null,
  whatIfRunning: false,
  setWhatIf: (whatIfGroup, whatIfResponders, whatIfWeights) =>
    set({
      whatIfGroup,
      whatIfResponders: whatIfResponders ?? null,
      whatIfWeights: whatIfWeights ?? null,
    }),
  setWhatIfRunning: (whatIfRunning) => set({ whatIfRunning }),
  setPhase: (phase, error = null) => set({ phase, error }),
}));
