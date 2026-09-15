import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About & Methodology — Real Fly Lab",
  description:
    "How Real Fly Lab works: the Shiu et al. 2024 leaky integrate-and-fire brain model on the FlyWire connectome, which parts are real science and which are presentation.",
};

const HONESTY_TABLE: {
  thing: string;
  status: string;
  detail: string;
}[] = [
  {
    thing: "Connectome (neurons + synapses)",
    status: "REAL",
    detail:
      "FlyWire proofread female adult brain: ~139K neurons, ~50M synapses (Dorkenwald et al., Nature 2024).",
  },
  {
    thing: "Neuron cell-type annotations",
    status: "REAL",
    detail:
      "Hierarchical annotations from Schlegel et al., Nature 2024 — names, types, hemispheres.",
  },
  {
    thing: "Neurotransmitter identity (E/I signs)",
    status: "REAL",
    detail:
      "Predicted neurotransmitters per neuron from Eckstein et al., Cell 2024 — this is what makes edges excitatory or inhibitory.",
  },
  {
    thing: "Brain dynamics (the model)",
    status: "REAL",
    detail:
      "Leaky integrate-and-fire simulation from Shiu et al., Nature 2024 — the only free parameter is W_syn; everything else comes from published Drosophila electrophysiology.",
  },
  {
    thing: "Behavior predictions (sugar → feeding, bitter suppression, grooming)",
    status: "REAL",
    detail:
      "Model matched real optogenetic activation phenotypes at >90% accuracy across 106 cell types. Shuffled-connectivity controls abolish predictions.",
  },
  {
    thing: "Brain anatomy (3D meshes)",
    status: "REAL",
    detail:
      "Neuropil meshes from Virtual Fly Brain (JRC2018U template) — real anatomy, no invented shapes.",
  },
  {
    thing: "Fly body, environment, lighting",
    status: "SIMULATED (presentation only)",
    detail:
      "Photoreal fly body (TuragaLab flybody, Apache-2.0), HDRIs (Poly Haven, CC0), textures (ambientCG, CC0). These visualize model output; they never drive it.",
  },
  {
    thing: "Free-roaming autonomous fly behavior",
    status: "NOT CLAIMED",
    detail:
      "No published model validates open-ended fly life simulation. Body animations here are visualizations of validated circuit outputs only — never presented as emergent behavior.",
  },
  {
    thing: "Interactive what-if simulations",
    status: "APPROXIMATION (labeled)",
    detail:
      "Activating arbitrary neurons simulates only the recruited subgraph live. Full-model precomputed runs are shown when available; approximation quality is displayed, not hidden.",
  },
];

const SOURCES: { citation: string; role: string }[] = [
  {
    citation:
      "Shiu, Sterne, Spiller, … Bates, Jefferis, Murthy, Bidaye, Hampel, Seeds, Scott. “A Drosophila computational brain model reveals sensorimotor processing.” Nature 634, 210–219 (2024).",
    role: "The model we run: leaky integrate-and-fire on the FlyWire connectome, validated at >90% against real optogenetic experiments.",
  },
  {
    citation:
      "Dorkenwald et al. “Neuronal wiring diagram of an adult brain.” Nature (2024).",
    role: "The connectome: the proofread FlyWire female adult brain — every neuron and synapse.",
  },
  {
    citation:
      "Schlegel et al. “Whole-brain annotation of the Drosophila connectome.” Nature (2024).",
    role: "Cell-type annotations: hierarchical names and identities for every neuron.",
  },
  {
    citation:
      "Eckstein et al. “Neurotransmitter identity from connectome-style electron microscopy.” Cell (2024).",
    role: "Neurotransmitter predictions: determines whether each connection is excitatory or inhibitory.",
  },
  {
    citation: "Virtual Fly Brain — JRC2018U neuropil meshes (virtualflybrain.org).",
    role: "3D brain region anatomy for the visualizer.",
  },
  {
    citation: "TuragaLab flybody (Apache-2.0).",
    role: "Photorealistic fly body model.",
  },
  {
    citation: "Poly Haven (CC0) — HDRI environments; ambientCG (CC0) — PBR textures.",
    role: "Lighting and materials for the lab stage.",
  },
];

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "REAL"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
      : status === "SIMULATED (presentation only)" || status === "APPROXIMATION (labeled)"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
        : "border-red-500/40 bg-red-500/10 text-red-400";
  return (
    <span
      className={`inline-block whitespace-nowrap rounded border px-2 py-0.5 text-[11px] font-medium tracking-wide ${tone}`}
    >
      {status}
    </span>
  );
}

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-10">
      <p className="text-sm text-neutral-500">
        <Link href="/" className="text-amber-500 hover:underline">
          Real Fly Lab
        </Link>{" "}
        / About
      </p>

      <h1 className="mt-4 text-4xl font-semibold tracking-tight">
        What this is, honestly
      </h1>
      <p className="mt-2 text-lg text-neutral-400">
        A living exhibit of the real fruit fly brain — not a metaphor, not a
        cartoon.
      </p>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold text-amber-500">
          The model is published science
        </h2>
        <p className="leading-relaxed text-neutral-300">
          Everything that “thinks” here comes from{" "}
          <span className="text-foreground">
            Shiu et al., Nature 2024
          </span>{" "}
          — a leaky integrate-and-fire model of the entire adult fly central
          brain, built from exactly two ingredients: synaptic connectivity from
          the FlyWire connectome, and predicted neurotransmitter identity for
          each neuron. There are no invented parameters beyond a single
          synaptic weight constant (W<sub>syn</sub>); every other biophysical
          constant comes from prior Drosophila electrophysiology and modeling
          (Kakaria &amp; de Bivort 2017; Churgin et al. 2021).
        </p>
        <p className="leading-relaxed text-neutral-300">
          This is not a loose inspiration. The published model was{" "}
          <span className="text-foreground">
            validated against real experiments
          </span>
          : activating sugar-sensing neurons predicted the real feeding motor
          neurons, matching actual optogenetic activation phenotypes at{" "}
          <span className="text-foreground">over 90% accuracy</span> across 106
          cell types. Shuffling the connectivity destroys the predictions —
          proof that it is the real wiring doing the work. When you press
          “Sugar” in the experiment dock, you are replaying that experiment on
          the real connectome.
        </p>
      </section>

      <section className="mt-12 space-y-4">
        <h2 className="text-xl font-semibold text-amber-500">
          The data is the real connectome
        </h2>
        <ul className="space-y-3 leading-relaxed text-neutral-300">
          <li className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
            <span className="font-medium text-foreground">
              FlyWire connectome
            </span>{" "}
            — the proofread wiring diagram of an adult female brain: ~139,000
            neurons and ~50 million synapses (Dorkenwald et al., Nature 2024).
            Every edge in our graph is a real synapse count.
          </li>
          <li className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
            <span className="font-medium text-foreground">Annotations</span> —
            hierarchical cell-type names and identities for every neuron
            (Schlegel et al., Nature 2024). This is why we can say “sugar GRN”
            or “feeding motor neuron MN9” instead of node #48,291.
          </li>
          <li className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
            <span className="font-medium text-foreground">
              Neurotransmitters
            </span>{" "}
            — per-neuron transmitter predictions (Eckstein et al., Cell 2024)
            that turn anatomical wiring into signed, excitatory/inhibitory
            circuitry.
          </li>
        </ul>
      </section>

      <section className="mt-12 space-y-4">
        <h2 className="text-xl font-semibold text-amber-500">
          What&rsquo;s real vs simulated
        </h2>
        <p className="text-sm text-neutral-400">
          The honesty contract: every animation is either (a) driven by a
          model-computed activity trace from a real stimulus, or (b) clearly
          anatomical structure. Nothing in between.
        </p>
        <div className="overflow-hidden rounded-xl border border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900/60 text-xs uppercase tracking-wider text-neutral-400">
              <tr>
                <th className="px-4 py-3 font-medium">Component</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80">
              {HONESTY_TABLE.map((row) => (
                <tr
                  key={row.thing}
                  className="bg-neutral-950/40 align-top text-neutral-300"
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {row.thing}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3">{row.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12 space-y-4">
        <h2 className="text-xl font-semibold text-amber-500">
          Visual assets &amp; licensing
        </h2>
        <p className="leading-relaxed text-neutral-300">
          The stage around the science uses open assets, clearly separated from
          the data: brain region meshes come from{" "}
          <span className="text-foreground">
            Virtual Fly Brain (JRC2018U template)
          </span>
          , the photorealistic fly body from{" "}
          <span className="text-foreground">
            TuragaLab&rsquo;s flybody (Apache-2.0)
          </span>
          , HDRIs from <span className="text-foreground">Poly Haven (CC0)</span>{" "}
          and PBR textures from{" "}
          <span className="text-foreground">ambientCG (CC0)</span>.
        </p>
      </section>

      <section className="mt-12 space-y-4">
        <h2 className="text-xl font-semibold text-amber-500">Sources</h2>
        <ol className="space-y-4">
          {SOURCES.map((source, i) => (
            <li
              key={i}
              className="border-l-2 border-amber-500/40 pl-4 text-sm leading-relaxed"
            >
              <p className="text-neutral-300">{source.citation}</p>
              <p className="mt-1 text-neutral-500">{source.role}</p>
            </li>
          ))}
        </ol>
      </section>

      <p className="mt-16 text-sm text-neutral-500">
        Found an inaccuracy?{" "}
        <a
          href="https://github.com/piyushdotcomm/flydynasty"
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-500 hover:underline"
        >
          Open an issue on GitHub
        </a>
        . Wrong claims about the brain are the one thing this project refuses
        to ship.
      </p>
    </main>
  );
}
