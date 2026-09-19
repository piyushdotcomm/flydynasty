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

function snapshot(colorAttr: THREE.BufferAttribute, indices: ArrayLike<number>): Float32Array {
  const arr = colorAttr.array as Float32Array;
  const saved = new Float32Array(indices.length * 3);
  for (let k = 0; k < indices.length; k++) {
    const i = indices[k];
    saved[k * 3] = arr[i * 3];
    saved[k * 3 + 1] = arr[i * 3 + 1];
    saved[k * 3 + 2] = arr[i * 3 + 2];
  }
  return saved;
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

  // snapshot base colors of exactly the neurons we are about to tint
  const saved = snapshot(colorAttr, responders.i);

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
  restore(colorAttr(state), state.tinted, state.saved);
}

function colorAttr(state: GlowState): THREE.BufferAttribute {
  return state.colorAttr;
}

function restore(colorAttribute: THREE.BufferAttribute, indices: ArrayLike<number>, saved: Float32Array): void {
  const arr = colorAttribute.array as Float32Array;
  for (let k = 0; k < indices.length; k++) {
    const i = indices[k];
    arr[i * 3] = saved[k * 3];
    arr[i * 3 + 1] = saved[k * 3 + 1];
    arr[i * 3 + 2] = saved[k * 3 + 2];
  }
  colorAttribute.needsUpdate = true;
}

// ---------------------------------------------------------------- what-if ---

/** Highlight state for the live what-if run (magenta layer). */
export interface WhatIfGlowState {
  colorAttr: THREE.BufferAttribute;
  indices: number[];
  saved: Float32Array;
}

/**
 * Tint the live sub-sim's responders magenta, brightness from the worker's
 * normalized weights. Applied on top of any trace tint (the snapshot captures
 * whatever is currently displayed, so restore just puts back what was there).
 */
export function applyWhatIfGlow(
  points: THREE.Points,
  indices: number[],
  weights: number[],
): WhatIfGlowState | null {
  const colorAttr = points.geometry.getAttribute("color") as THREE.BufferAttribute | undefined;
  if (!colorAttr || indices.length === 0) return null;
  const magenta = new THREE.Color("#ec4899");
  const arr = colorAttr.array as Float32Array;
  const saved = snapshot(colorAttr, indices);
  for (let k = 0; k < indices.length; k++) {
    const i = indices[k] * 3;
    const t = weights[k] ?? 1;
    arr[i] = magenta.r * t;
    arr[i + 1] = magenta.g * t;
    arr[i + 2] = magenta.b * t;
  }
  colorAttr.needsUpdate = true;
  return { colorAttr, indices, saved };
}

export function clearWhatIfGlow(state: WhatIfGlowState | null): void {
  if (!state) return;
  restore(state.colorAttr, state.indices, state.saved);
}
