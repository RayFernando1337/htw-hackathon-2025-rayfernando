"use client";

import {
  IconCalendar,
  IconClipboardCheck,
  IconDashboard,
  IconHelp,
  IconPlus,
  IconReport,
  IconSettings,
  IconUser,
} from "@tabler/icons-react";
import * as React from "react";

import { NavMain } from "@/app/dashboard/nav-main";
import { NavSecondary } from "@/app/dashboard/nav-secondary";
import { NavUser } from "@/app/dashboard/nav-user";
import { ChatMaxingIconColoured } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";

// Host navigation items
const hostNavItems = [
  { title: "Dashboard", url: "/dashboard", icon: IconDashboard },
  { title: "My Events", url: "/dashboard/events", icon: IconCalendar },
  { title: "Create Event", url: "/dashboard/events/new", icon: IconPlus },
];

// Admin navigation items
const adminNavItems = [
  { title: "Dashboard", url: "/dashboard", icon: IconDashboard },
  { title: "Review Queue", url: "/dashboard/review", icon: IconClipboardCheck },
  { title: "All Events", url: "/dashboard/admin/events", icon: IconCalendar },
  { title: "Calendar View", url: "/dashboard/calendar", icon: IconCalendar },
  { title: "Reports", url: "/dashboard/reports", icon: IconReport },
];

const navSecondary = [
  {
    title: "Profile",
    url: "/dashboard/profile",
    icon: IconUser,
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: IconSettings,
  },
  {
    title: "Get Help",
    url: "#",
    icon: IconHelp,
  },
];

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  userRole?: "host" | "admin";
}

export function AppSidebar({ userRole, ...props }: AppSidebarProps) {
  const navItems = userRole === "admin" ? adminNavItems : hostNavItems;

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <Link href="/">
                <ChatMaxingIconColoured className="!size-6" />
                <span className="text-base font-semibold">HTW Events</span>
                <Badge variant="outline" className="text-muted-foreground text-xs">
                  {userRole === "admin" ? "Admin" : "Host"}
                </Badge>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
