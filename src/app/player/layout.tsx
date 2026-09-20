import { PlayerNavbar, PlayerTopBar } from "@/components/player/PlayerNavbar";

export default function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-qc-black pb-24 md:pb-0">
      <PlayerTopBar />
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">{children}</div>
      <PlayerNavbar />
    </div>
  );
}
