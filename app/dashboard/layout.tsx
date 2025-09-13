"use client";

import { AppSidebar } from "@/app/dashboard/app-sidebar";
import { LoadingBar } from "@/app/dashboard/loading-bar";
import { SiteHeader } from "@/app/dashboard/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { redirect } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = useAuth();
  const currentUser = useQuery(api.users.current);

  // Redirect to onboarding if user hasn't completed it
  useEffect(() => {
    if (currentUser && !currentUser.onboardingCompleted) {
      redirect("/onboarding");
    }
  }, [currentUser]);

  // Show loading while user data is being fetched
  if (currentUser === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
      className="group/layout"
    >
      <AppSidebar variant="inset" userRole={currentUser?.role} />
      <SidebarInset>
        <LoadingBar />
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">{children}</div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
