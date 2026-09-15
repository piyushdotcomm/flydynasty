import ConnectomeLoader from "@/components/ConnectomeLoader";
import ExperimentDock from "@/components/ExperimentDock";
import SceneCanvas from "@/components/SceneCanvas";
import StatusCard from "@/components/StatusCard";
import TopBar from "@/components/TopBar";

export default function Home() {
  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <SceneCanvas />
      <ConnectomeLoader />
      <TopBar />
      <ExperimentDock />
      <StatusCard />
    </main>
  );
}
