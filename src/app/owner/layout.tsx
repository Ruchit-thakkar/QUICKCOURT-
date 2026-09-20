import { OwnerSidebar } from "@/components/owner/OwnerSidebar";

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-qc-black">
      <OwnerSidebar />
      <div className="flex-1 overflow-x-hidden">
        <div className="border-b border-white/8 px-4 py-4 lg:hidden">
          <p className="font-display text-xl">QuickCourt Owner</p>
        </div>
        <div className="px-4 py-6 md:px-8 md:py-8">{children}</div>
      </div>
    </div>
  );
}
