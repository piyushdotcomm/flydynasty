/**
 * LIF model parameters — Shiu et al. 2024, Nature 634, 210–219.
 * "A Drosophila computational brain model reveals sensorimotor processing"
 * https://www.nature.com/articles/s41586-024-07763-9 (open access).
 * Extracted verbatim from the paper's Methods > Computational model.
 * Every value carries its paper citation. Zero invented numbers.
 */

/** Source paper DOI. */
export const SOURCE = '10.1038/s41586-024-07763-9'

/**
 * Governing equations (Methods, α-synapse LIF, implemented in Brian2):
 *   dv_i/dt = (g_i - (v_i - V_resting)) / T_mbr
 *   dg_i/dt = -g_i / tau
 *   g_i <- g_i + w_j,i   upon spike from presynaptic neuron j
 */

/** Resting potential, −52 mV (Kakaria & de Bivort 2017, ref. 18). */
export const V_RESTING_MV = -52

/** Reset potential after spike, −52 mV (Kakaria & de Bivort 2017, ref. 18). */
export const V_RESET_MV = -52

/** Spike threshold, −45 mV (Kakaria & de Bivort 2017, ref. 18). */
export const V_THRESHOLD_MV = -45

/** Membrane resistance, 10 kΩ·cm² (ref. 18). */
export const R_MBR_KOHM_CM2 = 10

/** Membrane capacitance, 2 µF·cm⁻² (ref. 18). */
export const C_MBR_UF_CM2 = 2

/** Membrane timescale T_mbr = C_mbr × R_mbr = 2 µF·cm⁻² × 10 kΩ·cm² = 20 ms. */
export const T_MBR_MS = 20

/** Refractory period, 2.2 ms (ref. 18; Lazar et al. 2021, ref. 59). */
export const T_REFRACTORY_MS = 2.2

/** Synapse decay timescale τ, 5 ms (Jürgensen et al. 2021, ref. 61). */
export const TAU_SYN_MS = 5

/** Spike → membrane-potential change delay, 1.8 ms (Paul et al. 2015, ref. 62). */
export const T_DLY_MS = 1.8

/**
 * W_syn = 0.275 mV — the model's SINGLE free parameter (Methods):
 * change in downstream membrane potential per single excitatory or
 * inhibitory synapse. Robustness: ±30% perturbation retains 85–88%
 * prediction accuracy (Methods, Supplementary Table 11).
 */
export const W_SYN_MV = 0.275

/** Baseline firing rate of every neuron: 0 Hz (main text). */
export const BASELINE_FIRING_HZ = 0

/** Simulations per experiment: 30 trials of 1,000 ms (Methods). */
export const N_TRIALS = 30
export const TRIAL_MS = 1000

/** Sensory neurons stimulated with Poisson-distributed input (Methods). */
export const INPUT_TYPE = 'poisson'

/** All 127,400 proofread neurons, FlyWire materialization v.630 (Methods). */
export const N_NEURONS = 127400
export const FLYWIRE_MATERIALIZATION = 'v630'

/**
 * Connection weight w_j,i = FlyWire synapse count × sign × W_syn (Methods).
 * sign = +1 if neuron j is cholinergic/dopaminergic/octopaminergic/serotonergic
 * (excitatory), −1 if GABAergic or glutamatergic (inhibitory).
 * NT assignment: Eckstein et al. 2024 predictions, cleft score cutoff 50;
 * neuron is inhibitory if >50% of its presynaptic sites predict GABA/Glut.
 */
export const NT_CLEFT_SCORE_CUTOFF = 50
export const INHIBITORY_NTS = ['GABA', 'Glut'] as const
export const EXCITATORY_NTS = ['ACh', 'Dopamine', 'Octopamine', 'Serotonin'] as const
