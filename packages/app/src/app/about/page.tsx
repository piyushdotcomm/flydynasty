import Link from "next/link";
import type { Metadata } from "next";
import GateChecks from "@/components/GateChecks";

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
    thing: "Behavior predictions (sugar → feeding motor neurons)",
    status: "REAL",
    detail:
      "The published model predicted the phenotypes of real optogenetic activation experiments at 90% (feeding), 81% (grooming) and 78% (locomotion) accuracy (Shiu et al. 2024, abstract). This build replays the feeding experiment and its controls.",
  },
  {
    thing: "Shuffled-connectivity control",
    status: "REAL (run here)",
    detail:
      "Permuting per-edge synapse counts while keeping topology and signs: the paper found 99/100 shuffles fail to activate MN9; our own shuffled run is exported and shown in the experiment dock.",
  },
  {
    thing: "Atlas co-registered 3D anatomy (neuropil meshes)",
    status: "NOT IN THIS BUILD",
    detail:
      "The annotated soma coordinates are in raw FlyWire (FAFB14) space, which is NOT co-registered with atlas templates such as JRC2018U. Rather than warp them without a cited transform, this build shows the real neuron point cloud only.",
  },
  {
    thing: "Fly body, environment, lighting",
    status: "REAL ASSETS (stage view)",
    detail:
      "The Stage view shows the real flybody MuJoCo rig (67 bodies, Vaxenburg et al. 2024) baked with its published transforms, standing in a kitchen diorama lit by a Poly Haven HDRI with ambientCG PBR wood/marble and CC-BY food props. The fly's proboscis extends when MN9_r spikes in the selected run — kinematics of real anatomy driven by model output, no dynamics claim.",
  },
  {
    thing: "Free-roaming autonomous fly behavior",
    status: "NOT CLAIMED",
    detail:
      "No published model validates open-ended fly life simulation, and none is presented here.",
  },
  {
    thing: "Precomputed experiment replay",
    status: "FULL MODEL (offline)",
    detail:
      "The dock's experiments are full-model runs (all 139,248 neurons) computed offline with exact string root IDs; the browser replays them spike-for-spike from the exported rasters.",
  },
  {
    thing: "What-if lab (interactive experiments)",
    status: "LIVE APPROXIMATION (labeled)",
    detail:
      "The what-if panel runs the same LIF model live in your browser — but on a recruited subgraph (3 hops through connections of ≥3 synapses around the taste seed neurons, ~28.6K neurons of 139K). The panel shows how close this approximation lands against the precomputed full-model run (MN9_r rate + responder capture). Claims come from the full-model runs.",
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
    citation:
      "FlyWire Consortium. Whole-brain connectome data, release 783 (Zenodo record 10676866), CC-BY-4.0.",
    role: "Source of the bundled connectome, annotations and soma coordinates.",
  },
];

function StatusBadge({ status }: { status: string }) {
  const tone =
    status.startsWith("REAL")
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
      : status === "PRECOMPUTED (labeled)"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
        : "border-zinc-500/40 bg-zinc-500/10 text-zinc-400";
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
          neurons; the published model matched actual optogenetic activation
          phenotypes at{" "}
          <span className="text-foreground">
            90% (feeding), 81% (grooming) and 78% (locomotion)
          </span>{" "}
          accuracy (paper abstract). Shuffling the connectivity destroys the
          predictions — proof that it is the real wiring doing the work. When
          you press “Sugar” in the experiment dock, you are replaying that
          experiment on the real connectome.
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
          Reproducibility gate
        </h2>
        <p className="leading-relaxed text-neutral-300">
          Every exported model run must pass a battery of checks against the
          paper before it ships. These are the actual results from the latest
          export (<code>gate.json</code>) — including any failures.
        </p>
        <GateChecks />
      </section>

      <section className="mt-12 space-y-4">
        <h2 className="text-xl font-semibold text-amber-500">
          Data &amp; licensing
        </h2>
        <p className="leading-relaxed text-neutral-300">
          The connectome bundle, annotations and neurotransmitter signs are
          derived from the FlyWire release 783 data (Zenodo record 10676866)
          under{" "}
          <span className="text-foreground">CC-BY-4.0</span>, with citations to
          the primary papers above. Soma coordinates are shown in the raw
          FlyWire (FAFB14) volume space and are explicitly{" "}
          <span className="text-foreground">not co-registered</span> to atlas
          templates — see <code>graph-meta.json</code> in the open data bundle.
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
