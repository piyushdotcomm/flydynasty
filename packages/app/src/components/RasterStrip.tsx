"use client";

import { useEffect, useRef } from "react";
import { decodeRaster, type TraceFile } from "@/lib/data";

/**
 * Canonical-trial raster from the trace file: rows = top responders (mean rate
 * desc), columns = 20 ms bins, brightness = spikes in that bin. Drive rows
 * (stimulated neurons present in the raster) are outlined in amber. Drawn
 * from the exported base64 payload — nothing is invented here.
 */
export default function RasterStrip({ raster }: { raster: TraceFile["raster"] }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const data = decodeRaster(raster);
    const { rows, nBins } = raster;
    const cell = 3;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = nBins * cell;
    canvas.height = rows * cell;
    ctx.fillStyle = "#0a0a0d";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    let max = 1;
    for (let i = 0; i < data.length; i++) if (data[i] > max) max = data[i];
    const driveSet = new Set(raster.driveRows);
    for (let r = 0; r < rows; r++) {
      for (let b = 0; b < nBins; b++) {
        const v = data[r * nBins + b];
        if (v === 0) continue;
        const a = 0.25 + 0.75 * (v / max);
        ctx.fillStyle = `rgba(245, 158, 11, ${a.toFixed(3)})`;
        ctx.fillRect(b * cell, r * cell, cell - 1, cell - 1);
      }
      if (driveSet.has(r)) {
        ctx.strokeStyle = "rgba(96, 165, 250, 0.9)";
        ctx.strokeRect(0.5, r * cell + 0.5, canvas.width - 1, cell - 1);
      }
    }
  }, [raster]);

  return (
    <figure className="mt-3">
      <figcaption className="mb-1 text-[10px] leading-snug text-neutral-500">
        Canonical-trial raster — top {raster.rows} responders × {raster.nBins} bins
        of {raster.binsMs} ms ({raster.rows ? "row 0 = highest mean rate" : "no responders"}).
        Blue outline = stimulated neuron. 0–1000 ms.
      </figcaption>
      <canvas
        ref={ref}
        role="img"
        aria-label={`Spike raster of the canonical trial: ${raster.rows} rows by ${raster.nBins} time bins`}
        className="w-full rounded-md border border-neutral-800"
      />
    </figure>
  );
}