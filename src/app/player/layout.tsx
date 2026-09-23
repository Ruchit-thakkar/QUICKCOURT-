import { AuthProvider } from "@/context/AuthContext";
import { PlayerLayoutWrapper } from "@/components/player/PlayerLayoutWrapper";

export const metadata = {
  title: "Play · QuickCourt",
  description: "Discover nearby sports facilities, turfs, and courts. Play your game.",
};

export default function PlayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <PlayerLayoutWrapper>{children}</PlayerLayoutWrapper>
    </AuthProvider>
  );
}
