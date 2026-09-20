import { AuthProvider } from "@/context/AuthContext";
import { OwnerLayoutWrapper } from "@/components/owner/OwnerLayoutWrapper";

export const metadata = {
  title: "Owner Portal · QuickCourt",
  description: "Manage facilities, courts, bookings, and revenue intelligence.",
};

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <OwnerLayoutWrapper>{children}</OwnerLayoutWrapper>
    </AuthProvider>
  );
}
