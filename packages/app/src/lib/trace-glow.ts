/**
 * Trace-driven scene updates: when a precomputed condition is selected, the
 * point cloud highlights the neurons the REAL model responded with.
 *
 * Every payload here comes from trace-*.json (pipelines/export_traces.ts):
 * responder node indices are exact positions in the ids.txt / neurons.bin
 * ordering, so responder `i` maps 1:1 onto point cloud index `i`. Nothing is
 * simulated or invented in the browser — this is a playback of the offline
 * full-model run, recolored per point.
 */
import * as THREE from "three";
import type { TraceFile } from "@/lib/data";

/** What changed on the points object after applying a trace. */
export interface GlowStats {
  responders: number;
  mode: "rate" | "binary";
}

/**
 * Recolor a subset of points in place.
 *
 * Implementation note: three.js draws with `needsUpdate` on the whole color
 * attribute, but we only *write* the responder slice — base colors for all
 * other indices stay untouched, so restoring is a second partial write.
 */
function writeColors(
  colorAttr: THREE.BufferAttribute,
  indices: ArrayLike<number>,
  color: THREE.Color,
  scalars?: ArrayLike<number>,
  scalarMax?: number,
): void {
  const arr = colorAttr.array as Float32Array;
  for (let k = 0; k < indices.length; k++) {
    const i = indices[k];
    let t = 1;
    if (scalars && scalarMax && scalarMax > 0) {
      // normalize to 0.25..1 so weak responders still read as active
      t = 0.25 + 0.75 * Math.min(1, scalars[k] / scalarMax);
    }
    arr[i * 3] = color.r * t;
    arr[i * 3 + 1] = color.g * t;
    arr[i * 3 + 2] = color.b * t;
  }
  colorAttr.needsUpdate = true;
}

/** Saved base colors for the points currently tinted by a trace. */
export interface GlowState {
  colorAttr: THREE.BufferAttribute;
  /** responder index -> base rgb snapshot */
  tinted: number[];
  tintedCount: number;
  saved: Float32Array;
}

/**
 * Apply the selected trace: responders glow amber (rate-weighted when the
 * condition has any responders). Returns null if the trace has no responders
 * (e.g. baseline) — the caller keeps the plain view in that case.
 */
export function applyTraceGlow(
  points: THREE.Points,
  trace: TraceFile,
): GlowState | null {
  const geo = points.geometry;
  const colorAttr = geo.getAttribute("color") as THREE.BufferAttribute;
  if (!colorAttr) return null;

  const responders = trace.responders;
  if (!responders || responders.count === 0) return null;

  const arr = colorAttr.array as Float32Array;
  // snapshot base colors of exactly the neurons we are about to tint
  const saved = new Float32Array(responders.count * 3);
  for (let k = 0; k < responders.count; k++) {
    const i = responders.i[k];
    saved[k * 3] = arr[i * 3];
    saved[k * 3 + 1] = arr[i * 3 + 1];
    saved[k * 3 + 2] = arr[i * 3 + 2];
  }

  // rate-weighted amber when there is dynamic range, flat amber otherwise
  const maxRate = trace.stats.maxMeanRateHz;
  const amber = new THREE.Color("#f59e0b");
  if (maxRate > 0) {
    writeColors(colorAttr, responders.i, amber, responders.meanRateHz, maxRate);
  } else {
    writeColors(colorAttr, responders.i, amber);
  }

  return { colorAttr, tinted: Array.from(responders.i), tintedCount: responders.count, saved };
}

/** Restore the base colors for the tinted neurons (trace deselected/changed). */
export function clearTraceGlow(state: GlowState | null): void {
  if (!state) return;
  const arr = state.colorAttr.array as Float32Array;
  for (let k = 0; k < state.tintedCount; k++) {
    const i = state.tinted[k];
    arr[i * 3] = state.saved[k * 3];
    arr[i * 3 + 1] = state.saved[k * 3 + 1];
    arr[i * 3 + 2] = state.saved[k * 3 + 2];
  }
  state.colorAttr.needsUpdate = true;
}
