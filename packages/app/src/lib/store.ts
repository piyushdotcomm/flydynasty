import { create } from "zustand";

export type StimulusId = "sugar" | "water" | "bitter" | "low-salt";

export interface ExperimentResult {
  stimulus: StimulusId;
  timestamp: number;
  respondingNeurons: number;
  notes: string;
}

interface LabState {
  activeStimulus: StimulusId | null;
  isSimulating: boolean;
  lastResult: ExperimentResult | null;
  setStimulus: (stimulus: StimulusId | null) => void;
  setSimulating: (simulating: boolean) => void;
  setResult: (result: ExperimentResult) => void;
}

export const useLabStore = create<LabState>((set) => ({
  activeStimulus: null,
  isSimulating: false,
  lastResult: null,
  setStimulus: (stimulus) =>
    set((state) => ({
      activeStimulus: stimulus,
      isSimulating: stimulus !== null ? true : state.isSimulating,
    })),
  setSimulating: (simulating) => set({ isSimulating: simulating }),
  setResult: (result) =>
    set({ lastResult: result, isSimulating: false }),
}));
