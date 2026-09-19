import ConnectomeLoader from "@/components/ConnectomeLoader";
import ExperimentDock from "@/components/ExperimentDock";
import FlyModelToggle from "@/components/FlyModelToggle";
import NeuronSearch from "@/components/NeuronSearch";
import SceneCanvas from "@/components/SceneCanvas";
import StatusCard from "@/components/StatusCard";
import TopBar from "@/components/TopBar";
import TracePlayback from "@/components/TracePlayback";
import WhatIfPanel from "@/components/WhatIfPanel";

export default function Home() {
  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <SceneCanvas />
      <ConnectomeLoader />
      <TopBar />
      <ExperimentDock />
      <TracePlayback />
      <FlyModelToggle />
      <NeuronSearch />
      <StatusCard />
      <WhatIfPanel />
    </main>
  );
}
