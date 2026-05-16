import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { SidebarProvider } from "@/components/layout/sidebar-context";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-[#f4f6fb] overflow-hidden print:block print:h-auto print:overflow-visible print:bg-white">
        <div className="print:hidden"><Sidebar /></div>
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden print:block print:overflow-visible">
          <div className="print:hidden"><Header /></div>
          <main className="flex-1 overflow-y-auto print:overflow-visible">
            <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 w-full animate-fade-up print:p-0 print:max-w-none">
              {children}
            </div>
          </main>
        </div>
      </div>
      <div className="print:hidden"><PWAInstallPrompt /></div>
    </SidebarProvider>
  );
}
