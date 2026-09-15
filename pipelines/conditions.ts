/**
 * Canonical stimulus conditions for the offline model runs.
 *
 * Every condition reproduces a specific experiment in Shiu et al. 2024,
 * Nature 634, 210–219 ("A Drosophila computational brain model reveals
 * sensorimotor processing", doi:10.1038/s41586-024-07763-9). Nothing here is
 * invented: the neuron groups come from the paper's own supplementary tables
 * (see data/processed/seeds.json + seed-methodology.md), the input modality is
 * Poisson drive at the stated rate (Methods), and the readouts are the paper's
 * named neurons.
 *
 * Trial counts: the paper runs 30 trials per experiment (Methods). We run 30
 * for the headline sugar condition and 5 elsewhere to keep the offline export
 * bounded — the trial count is recorded in every trace file so the UI can state
 * exactly what was run.
 */

export interface StimulusSpec {
  /** seed group name in data/processed/seeds.json */
  group: string
  /** Poisson drive rate in Hz (paper: stimulus rates 10–200 Hz) */
  rateHz: number
}

export interface SilenceSpec {
  /** remove the OUTGOING synapses of this seed group (model-level ablation) */
  group?: string
  /** or of these exact root IDs (resolved by string key; never numbers) */
  neurons?: string[]
  /** human label for the UI */
  label: string
}

export interface ConditionDef {
  id: string
  label: string
  stimuli: StimulusSpec[]
  silence?: SilenceSpec
  /**
   * Paper Methods control: "connectivity weights were shuffled randomly (while
   * maintaining the global connectivity weight distribution)". Permuting the
   * per-edge synapse counts destroys structured strong pathways while keeping
   * topology and NT signs. Deterministic seed per condition.
   */
  shuffleSynSeed?: number
  trials: number
  /** which figure/table of the paper this reproduces */
  paper: string
  note?: string
}

/** Readout neurons reported in every trace (the paper's proboscis motor neurons). */
export const READOUT_IDS = [
  { name: 'MN9_r', id: '720575940660219265', type: 'CB0701 (right)', role: 'rostrum/proboscis motor neuron — primary readout, Fig 1c' },
  { name: 'MN9_l', id: '720575940618238523', type: 'CB0701 (left, putative)', role: 'contralateral MN9' },
  { name: 'MN6_r', id: '720575940627410451', type: 'CB0858', role: 'proboscis motor neuron (Shiu ST1A)' },
  { name: 'MN6_l', id: '720575940630868793', type: 'CB0858', role: 'proboscis motor neuron (Shiu ST1A)' },
  { name: 'MN8_r', id: '720575940628826128', type: 'CB0911', role: 'proboscis motor neuron (Shiu ST1A)' },
  { name: 'MN8_l', id: '720575940630233404', type: 'CB0911', role: 'proboscis motor neuron (Shiu ST1A)' },
  { name: 'MN11_r', id: '720575940623352063', type: 'CB0700', role: 'proboscis motor neuron (Shiu ST1A)' },
  { name: 'MN11_l', id: '720575940618165019', type: 'CB0700', role: 'proboscis motor neuron (Shiu ST1A)' },
] as const

export const CONDITIONS: ConditionDef[] = [
  {
    id: 'baseline',
    label: 'No stimulus (baseline)',
    stimuli: [],
    trials: 5,
    paper: 'Methods / main text: model baseline firing rate is 0 Hz',
    note: 'With no drive the network must stay silent — the model\'s own baseline claim, checked rather than assumed.',
  },
  {
    id: 'sugar-100',
    label: 'Sugar GRNs @ 100 Hz',
    stimuli: [{ group: 'sugar_grns', rateHz: 100 }],
    trials: 30,
    paper: 'Fig 1c–h, Supp Table 1A (sugar_l_* driven at 100 Hz) — the headline sensorimotor result',
  },
  { id: 'sugar-200', label: 'Sugar GRNs @ 200 Hz', stimuli: [{ group: 'sugar_grns', rateHz: 200 }], trials: 5, paper: 'Supp Table 1A rate sweep' },
  { id: 'sugar-50', label: 'Sugar GRNs @ 50 Hz', stimuli: [{ group: 'sugar_grns', rateHz: 50 }], trials: 5, paper: 'Supp Table 1A rate sweep' },
  { id: 'sugar-30', label: 'Sugar GRNs @ 30 Hz', stimuli: [{ group: 'sugar_grns', rateHz: 30 }], trials: 5, paper: 'Supp Table 1A rate sweep' },
  { id: 'sugar-10', label: 'Sugar GRNs @ 10 Hz', stimuli: [{ group: 'sugar_grns', rateHz: 10 }], trials: 5, paper: 'Supp Table 1A rate sweep' },
  { id: 'water-100', label: 'Water GRNs @ 100 Hz', stimuli: [{ group: 'water_grns', rateHz: 100 }], trials: 5, paper: 'Supp Tables 4/5/6A (water_l_*)' },
  { id: 'bitter-100', label: 'Bitter GRNs @ 100 Hz', stimuli: [{ group: 'bitter_grns', rateHz: 100 }], trials: 5, paper: 'Fig 3b/d (bitter_l_*)' },
  { id: 'lowsalt-100', label: 'Ir94e GRNs @ 100 Hz (low salt)', stimuli: [{ group: 'lowsalt_grns', rateHz: 100 }], trials: 5, paper: 'Fig 3c/e (Ir94e_l_*)' },
  {
    id: 'sugar+bitter-100',
    label: 'Sugar + Bitter @ 100 Hz',
    stimuli: [{ group: 'sugar_grns', rateHz: 100 }, { group: 'bitter_grns', rateHz: 100 }],
    trials: 5,
    paper: 'Fig 3 modality interaction (Supp Table 4)',
    note: 'Bitter co-activation should suppress the sugar-driven proboscis motor output.',
  },
  {
    id: 'sugar+lowsalt-100',
    label: 'Sugar + Ir94e @ 100 Hz',
    stimuli: [{ group: 'sugar_grns', rateHz: 100 }, { group: 'lowsalt_grns', rateHz: 100 }],
    trials: 5,
    paper: 'Fig 3 modality interaction (Supp Table 4)',
  },
  {
    id: 'water+bitter-100',
    label: 'Water + Bitter @ 100 Hz',
    stimuli: [{ group: 'water_grns', rateHz: 100 }, { group: 'bitter_grns', rateHz: 100 }],
    trials: 5,
    paper: 'Fig 3 modality interaction (Supp Table 4)',
  },
  {
    id: 'water+lowsalt-100',
    label: 'Water + Ir94e @ 100 Hz',
    stimuli: [{ group: 'water_grns', rateHz: 100 }, { group: 'lowsalt_grns', rateHz: 100 }],
    trials: 5,
    paper: 'Fig 3 modality interaction (Supp Table 4)',
  },
  {
    id: 'silence-mn9r-sugar-100',
    label: 'Sugar @ 100 Hz, MN9_r output silenced',
    stimuli: [{ group: 'sugar_grns', rateHz: 100 }],
    silence: { neurons: ['720575940660219265'], label: 'MN9_r outgoing synapses removed' },
    trials: 5,
    paper: 'Supp Tables 1B/1C (MN9 activation/silencing rows)',
    note: 'Model-level ablation: the neuron can still be driven, it just cannot drive anything downstream.',
  },
  {
    id: 'silence-proboscis-mns-sugar-100',
    label: 'Sugar @ 100 Hz, all proboscis motor neurons silenced',
    stimuli: [{ group: 'sugar_grns', rateHz: 100 }],
    silence: { group: 'proboscis_mns', label: 'proboscis motor neurons (MN6/8/9/11) outgoing synapses removed' },
    trials: 5,
    paper: 'Fig 1f/g silencing logic — the drive into the feeding motor program is cut',
  },
  {
    id: 'shuffle-sugar-100',
    label: 'Sugar @ 100 Hz, shuffled connectivity (control)',
    stimuli: [{ group: 'sugar_grns', rateHz: 100 }],
    shuffleSynSeed: 0xbadc0de,
    trials: 5,
    paper: 'Methods: shuffled-connectivity control — 99/100 shuffles fail to activate MN9',
    note: 'Same topology and NT signs, per-edge synapse counts permuted. The negative control that shows the real wiring does the work.',
  },
]