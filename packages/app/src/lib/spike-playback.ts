/**
 * Time-driven spike playback over the point cloud.
 *
 * The raster in trace-*.json is the canonical trial of the offline full-model
 * run: rows = top responders (responders.i order), columns = 20 ms bins,
 * values = spike counts in that bin. As the store's playhead advances, the
 * neurons that spiked in the bin under the playhead glow amber, brightness
 * scaled by spikes in that bin, with a short exponential decay so activity
 * reads as a cascade sweeping through the brain — a frame-accurate playback
 * of the exported run, never a simulation.
 */
import * as THREE from "three";
import { decodeRaster, type TraceFile } from "@/lib/data";

const AMBER = new THREE.Color("#f59e0b");
/** decay half-life of the glow, in ms of trial time */
const DECAY_MS = 120;
/** minimum brightness floor so weak spikes still read */
const FLOOR = 0.3;

export interface SpikePlaybackState {
  colorAttr: THREE.BufferAttribute;
  /** node indices of raster rows (responders.i) */
  rows: Int32Array;
  /** decoded raster: rows.length * nBins spike counts */
  data: Uint8Array;
  nBins: number;
  binsMs: number;
  /** base colors of the raster rows, for restoring */
  saved: Float32Array;
  /** per-row current brightness 0..1 (for incremental restores) */
  level: Float32Array;
  /** trial-time (ms) of the last apply() */
  lastMs: number;
}

export function buildSpikePlayback(points: THREE.Points, trace: TraceFile): SpikePlaybackState | null {
  const colorAttr = points.geometry.getAttribute("color") as THREE.BufferAttribute | undefined;
  if (!colorAttr || trace.raster.rows === 0) return null;
  const rows = Int32Array.from(trace.responders.i.slice(0, trace.raster.rows));
  const data = decodeRaster(trace.raster);
  const saved = new Float32Array(rows.length * 3);
  const arr = colorAttr.array as Float32Array;
  for (let r = 0; r < rows.length; r++) {
    const i = rows[r] * 3;
    saved[r * 3] = arr[i];
    saved[r * 3 + 1] = arr[i + 1];
    saved[r * 3 + 2] = arr[i + 2];
  }
  return {
    colorAttr,
    rows,
    data,
    nBins: trace.raster.nBins,
    binsMs: trace.raster.binsMs,
    saved,
    level: new Float32Array(rows.length),
    lastMs: -1,
  };
}

/**
 * Advance the glow to `ms` of trial time. Rows that spiked in the bin under
 * the playhead snap to full brightness (scaled by spikes); all others decay
 * exponentially. Only rows whose level changed are rewritten.
 */
export function applySpikePlayback(st: SpikePlaybackState, ms: number): void {
  const bin = Math.min(st.nBins - 1, Math.max(0, Math.floor(ms / st.binsMs)));
  const arr = st.colorAttr.array as Float32Array;
  // decay factor from the time elapsed since the last apply
  const dt = st.lastMs < 0 ? DECAY_MS : Math.max(0, ms - st.lastMs);
  st.lastMs = ms;
  const decay = Math.pow(0.5, dt / DECAY_MS);
  let dirty = false;
  for (let r = 0; r < st.rows.length; r++) {
    const spikes = st.data[r * st.nBins + bin];
    const target = spikes > 0 ? Math.min(1, FLOOR + spikes * 0.35) : 0;
    const prev = st.level[r];
    const next = target > prev ? target : prev * decay;
    if (next === prev) continue;
    st.level[r] = next;
    dirty = true;
    const i = st.rows[r] * 3;
    if (next <= 0.01) {
      // fully decayed: restore the saved super-class color exactly
      arr[i] = st.saved[r * 3];
      arr[i + 1] = st.saved[r * 3 + 1];
      arr[i + 2] = st.saved[r * 3 + 2];
      st.level[r] = 0;
    } else {
      arr[i] = AMBER.r * next;
      arr[i + 1] = AMBER.g * next;
      arr[i + 2] = AMBER.b * next;
    }
  }
  // only re-upload the 139k-point color attribute when something actually changed
  if (dirty) st.colorAttr.needsUpdate = true;
}

/** Restore every raster row to its base color (deselect / teardown). */
export function clearSpikePlayback(st: SpikePlaybackState | null): void {
  if (!st) return;
  const arr = st.colorAttr.array as Float32Array;
  for (let r = 0; r < st.rows.length; r++) {
    const i = st.rows[r] * 3;
    arr[i] = st.saved[r * 3];
    arr[i + 1] = st.saved[r * 3 + 1];
    arr[i + 2] = st.saved[r * 3 + 2];
  }
  st.level.fill(0);
  st.colorAttr.needsUpdate = true;
}
