"use client"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Bell } from "lucide-react"
import { useMemo } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"

function getPageTitle(pathname: string): string {
  // Handle exact matches first
  switch (pathname) {
    case "/dashboard":
      return "Dashboard"
    case "/dashboard/payment-gated":
      return "Payment gated"
    default:
      return "Page"
  }
}

export function SiteHeader() {
  const pathname = usePathname()
  const pageTitle = getPageTitle(pathname)
  const router = useRouter()

  // Only show notifications for hosts
  const currentUser = useQuery(api.users.current)
  const notifications = useQuery(api.notifications.getForCurrentUser)
  const markRead = useMutation(api.notifications.markRead)
  const markAllRead = useMutation(api.notifications.markAllRead)

  const unreadCount = useMemo(
    () => (notifications || []).filter((n) => !n.readAt).length,
    [notifications]
  )

  const handleItemClick = async (
    id: string,
    eventId?: string | null
  ) => {
    try {
      await markRead({ id: id as any })
      if (eventId) {
        router.push(`/dashboard/events/${eventId}`)
      }
    } catch (e) {
      // noop; keep UI simple
    }
  }

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center justify-between gap-1 px-4 lg:gap-2 lg:px-6">
        <div className="flex items-center gap-1">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <h1 className="text-base font-medium">{pageTitle}</h1>
        </div>

        {currentUser?.role === "host" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground shadow-sm">
                    {unreadCount}
                  </span>
                )}
                <span className="sr-only">Open notifications</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(notifications && notifications.length > 0) ? (
                <>
                  {notifications.slice(0, 10).map((n) => (
                    <DropdownMenuItem
                      key={n._id}
                      className={n.readAt ? "opacity-70" : "font-medium"}
                      onClick={() => handleItemClick(n._id, n.eventId as any)}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm">{n.message}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(n.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => markAllRead({})}>
                    Mark all as read
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/dashboard/notifications")}>View all</DropdownMenuItem>
                </>
              ) : (
                <div className="p-2 text-sm text-muted-foreground">No notifications</div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}
