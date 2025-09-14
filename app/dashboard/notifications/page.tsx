"use client"

import { api } from "@/convex/_generated/api"
import { useMutation, useQuery } from "convex/react"
import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function NotificationsPage() {
  const notifications = useQuery(api.notifications.getForCurrentUser)
  const markRead = useMutation(api.notifications.markRead)
  const markAllRead = useMutation(api.notifications.markAllRead)
  const router = useRouter()

  const unreadCount = useMemo(
    () => (notifications || []).filter((n) => !n.readAt).length,
    [notifications]
  )

  if (notifications === undefined) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="px-6 py-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Notifications</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Unread: {unreadCount}</span>
          <Button variant="outline" onClick={() => markAllRead({})} disabled={unreadCount === 0}>
            Mark all as read
          </Button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="text-sm text-muted-foreground">No notifications yet.</div>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n) => (
            <li
              key={n._id}
              className={`rounded-md border p-3 ${n.readAt ? "opacity-70" : ""}`}
            >
              <button
                onClick={async () => {
                  await markRead({ id: n._id as any })
                  if (n.eventId) router.push(`/dashboard/events/${n.eventId}`)
                }}
                className="text-left"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm leading-5">{n.message}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {!n.readAt && (
                    <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs">
                      New
                    </span>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
