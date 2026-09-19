"use client";

import { useEffect, useMemo, useState } from "react";
import { loadNeurons, loadGraphMeta, loadTrace, fmtInt } from "@/lib/data";
import { useLabStore } from "@/lib/store";

/**
 * Per-neuron search over the REAL catalogue (ids.txt + neurons.bin labels):
 * type a cell type ("MN9", "CB0701", "LB3") or an exact root ID and get the
 * matching neurons with their labels. Root IDs are handled as exact decimal
 * STRINGS end to end (they exceed Number.MAX_SAFE_INTEGER).
 *
 * No invented data: every result row is a real annotated neuron from the
 * exported bundle.
 */
interface Hit {
  index: number;
  id: string;
  type: string;
  cls: string;
  sub: string;
  sup: string;
  nt: string;
}

export default function NeuronSearch() {
  const selectedId = useLabStore((s) => s.selectedId);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<{
    n: number;
    ids: string[];
    type: string[];
    cls: string[];
    sub: string[];
    sup: string[];
    nt: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [topResponders, setTopResponders] = useState<
    Array<{ id: string; type: string; meanRateHz: number; spikes: number }> | null
  >(null);

  // lazy-load the catalogue the first time the panel opens
  useEffect(() => {
    if (!open || catalog || error) return;
    let cancelled = false;
    (async () => {
      try {
        const [neurons, meta] = await Promise.all([loadNeurons(), loadGraphMeta()]);
        const idsRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/data/ids.txt`);
        if (!idsRes.ok) throw new Error(`ids.txt: HTTP ${idsRes.status}`);
        const ids = (await idsRes.text()).split(/\r?\n/).filter(Boolean);
        if (ids.length !== neurons.n) {
          throw new Error(`ids.txt has ${ids.length} lines but neurons.bin has ${neurons.n}`);
        }
        if (cancelled) return;
        const dicts = meta.labels;
        const decode = (field: keyof typeof dicts, labels: Uint16Array) =>
          Array.from(labels, (k) => (dicts[field] as string[])[k] ?? "unknown");
        setCatalog({
          n: neurons.n,
          ids,
          type: decode("type", neurons.labels[0]),
          cls: decode("cls", neurons.labels[1]),
          sub: decode("sub", neurons.labels[2]),
          sup: decode("sup", neurons.labels[3]),
          nt: decode("nt", neurons.labels[4]),
        });
      } catch (err) {
        if (!cancelled) setError(String((err as Error)?.message ?? err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, catalog, error]);

  // top responders of the selected run (from the trace file)
  useEffect(() => {
    if (!open || !selectedId) {
      setTopResponders(null);
      return;
    }
    let cancelled = false;
    loadTrace({ id: selectedId, file: `trace-${selectedId}.json` } as never)
      .then((t) => {
        if (cancelled) return;
        setTopResponders(
          t.responders.count
            ? t.responders.id.slice(0, 12).map((id, k) => ({
                id,
                type: t.responders.type[k],
                meanRateHz: t.responders.meanRateHz[k],
                spikes: t.responders.spikes[k],
              }))
            : null,
        );
      })
      .catch(() => setTopResponders(null));
    return () => {
      cancelled = true;
    };
  }, [open, selectedId]);

  const hits: Hit[] = useMemo(() => {
    if (!catalog) return [];
    const q = query.trim();
    if (!q) return [];
    const ql = q.toLowerCase();
    const out: Hit[] = [];
    // exact root-ID hit first (string comparison — never numeric)
    const exact = catalog.ids.indexOf(q);
    if (exact !== -1) {
      out.push({
        index: exact,
        id: catalog.ids[exact],
        type: catalog.type[exact],
        cls: catalog.cls[exact],
        sub: catalog.sub[exact],
        sup: catalog.sup[exact],
        nt: catalog.nt[exact],
      });
    }
    // then label matches (case-insensitive substring), capped
    const cap = 40;
    for (let i = 0; i < catalog.n && out.length < cap; i++) {
      if (i === exact) continue;
      if (
        catalog.type[i].toLowerCase().includes(ql) ||
        catalog.sub[i].toLowerCase().includes(ql) ||
        catalog.cls[i].toLowerCase().includes(ql)
      ) {
        out.push({
          index: i,
          id: catalog.ids[i],
          type: catalog.type[i],
          cls: catalog.cls[i],
          sub: catalog.sub[i],
          sup: catalog.sup[i],
          nt: catalog.nt[i],
        });
      }
    }
    return out;
  }, [catalog, query]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pointer-events-auto absolute right-6 top-20 z-20 rounded-lg border border-neutral-800 bg-neutral-950/70 px-3 py-1.5 text-xs text-neutral-300 backdrop-blur-md transition-colors hover:border-amber-500 hover:text-amber-400"
      >
        Search neurons
      </button>
    );
  }

  return (
    <section
      aria-label="Neuron search"
      className="pointer-events-auto absolute right-6 top-20 z-20 max-h-[70dvh] w-80 overflow-y-auto rounded-xl border border-neutral-800/80 bg-neutral-950/70 p-4 backdrop-blur-md"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-widest text-neutral-400">
          Neuron Search
        </h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-neutral-500 transition-colors hover:text-neutral-300"
          aria-label="Close neuron search"
        >
          ✕
        </button>
      </div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder='cell type (MN9, CB0701, LB3) or root ID'
        className="mt-2 w-full rounded-md border border-neutral-800 bg-neutral-900/60 px-2 py-1.5 font-mono text-xs text-neutral-200 placeholder:text-neutral-600 focus:border-amber-500 focus:outline-none"
      />
      {error && (
        <p role="alert" className="mt-2 text-[11px] text-red-300">
          {error}
        </p>
      )}
      {!catalog && !error && (
        <p className="mt-2 text-[11px] text-neutral-500">Loading catalogue…</p>
      )}
      {catalog && (
        <p className="mt-1 text-[10px] text-neutral-600">
          {fmtInt(catalog.n)} annotated neurons · exact string IDs
        </p>
      )}
      <ul className="mt-2 space-y-1">
        {hits.map((h) => (
          <li
            key={`${h.index}-${h.id}`}
            className="rounded-md border border-neutral-800/60 bg-neutral-900/40 px-2 py-1.5"
          >
            <p className="font-mono text-[10px] text-amber-500/90">{h.id}</p>
            <p className="text-[11px] text-neutral-300">
              {h.type}
              {h.sub !== "unknown" ? ` · ${h.sub}` : ""}
            </p>
            <p className="text-[10px] text-neutral-500">
              {h.sup} · {h.nt} · node #{h.index}
            </p>
          </li>
        ))}
      </ul>

      {topResponders && (
        <div className="mt-3 border-t border-neutral-800/80 pt-2">
          <p className="text-[10px] uppercase tracking-widest text-neutral-500">
            Top responders of selected run
          </p>
          <ul className="mt-1 space-y-0.5">
            {topResponders.map((r) => (
              <li key={r.id} className="flex items-center justify-between text-[10px]">
                <span className="truncate font-mono text-neutral-400">{r.type}</span>
                <span className="font-mono text-neutral-500">
                  {r.meanRateHz} Hz
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
