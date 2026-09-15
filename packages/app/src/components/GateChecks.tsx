"use client";

import { useEffect, useState } from "react";
import { loadGate, type GateFile } from "@/lib/data";

/**
 * The offline paper-check gate (gate.json), shown verbatim: every check the
 * exported runs must pass against Shiu et al. 2024, with pass/fail.
 */
export default function GateChecks() {
  const [gate, setGate] = useState<GateFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGate()
      .then(setGate)
      .catch((err) => setError(String((err as Error)?.message ?? err)));
  }, []);

  if (error) {
    return <p className="text-sm text-red-300">gate.json unavailable: {error}</p>;
  }
  if (!gate) return <p className="text-sm text-neutral-500">Loading gate results…</p>;

  return (
    <div>
      <p className="text-sm text-neutral-400">
        {gate.complete
          ? gate.passed === gate.total
            ? "All checks pass"
            : "FAILING CHECKS PRESENT"
          : "Export in progress — checks below cover completed runs only"}{" "}
        — {gate.passed}/{gate.total} pass, generated{" "}
        {new Date(gate.generated).toISOString().slice(0, 16).replace("T", " ")} UTC
        for {gate.model.paper}.
      </p>
      <ul className="mt-3 space-y-2">
        {gate.checks.map((c) => (
          <li
            key={c.id}
            className={`rounded-lg border p-3 text-sm ${
              c.pass
                ? "border-emerald-800 bg-emerald-950/20"
                : "border-red-800 bg-red-950/20"
            }`}
          >
            <p className="font-medium">
              <span className={c.pass ? "text-emerald-400" : "text-red-400"}>
                {c.pass ? "PASS" : "FAIL"}
              </span>{" "}
              <span className="text-foreground">{c.id}</span>
            </p>
            <p className="mt-1 text-neutral-400">{c.claim}</p>
            <p className="mt-1 font-mono text-[11px] text-neutral-500">{c.observed}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}