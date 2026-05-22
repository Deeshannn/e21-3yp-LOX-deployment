import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"
import { AppShell } from "@/components/layout/AppShell"
import { Check, MessageSquare, UserPlus, X } from "lucide-react"
import { apiRequest } from "@/lib/api"
import { getAuthSession } from "@/lib/auth"
import { formatChatTime, formatConversationSnippet, type ChatNotificationPayload } from "@/lib/chat"

type RequestItem = {
  request_id: string
  role: "sub_admin" | "super_admin"
  full_name: string
  nic_number: string
  age: number
  email: string
  phone: string
  station_id: string | null
  station_name: string | null
  locker_id: string | null
  document_name: string | null
  request_status: "pending" | "approved" | "rejected"
  created_at: string
  reviewed_at: string | null
}

export const Route = createFileRoute("/super/notifications")({
  head: () => ({ meta: [{ title: "Notifications — LOX HQ" }] }),
  component: NotificationsPage,
})

function NotificationsPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<RequestItem[]>([])
  const [messages, setMessages] = useState<ChatNotificationPayload>({ unread_count: 0, items: [] })
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const session = useMemo(() => getAuthSession(), [])

  useEffect(() => {
    let active = true

    const loadNotifications = async () => {
      if (!session?.token) {
        await router.navigate({ to: "/login" })
        return
      }

      try {
        const [requestResponse, messageResponse] = await Promise.all([
          apiRequest<{ requests: RequestItem[] }>("/auth/notifications", {
            headers: { Authorization: `Bearer ${session.token}` },
          }),
          apiRequest<ChatNotificationPayload>("/chat/notifications", {
            headers: { Authorization: `Bearer ${session.token}` },
          }),
        ])

        if (!active) return
        setRequests(requestResponse.requests || [])
        setMessages(messageResponse)
      } catch {
        if (!active) return
        setRequests([])
        setMessages({ unread_count: 0, items: [] })
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadNotifications()

    return () => {
      active = false
    }
  }, [router, session?.token])

  const approveRequest = async (requestId: string) => {
    if (!session?.token) return

    setActionId(requestId)
    try {
      await apiRequest(`/auth/requests/${requestId}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
      })

      setRequests((current) =>
        current.map((request) =>
          request.request_id === requestId
            ? { ...request, request_status: "approved" as const, reviewed_at: new Date().toISOString() }
            : request
        )
      )
      window.dispatchEvent(new Event("lox:notifications-updated"))
    } finally {
      setActionId(null)
    }
  }

  const rejectRequest = async (requestId: string) => {
    if (!session?.token) return

    setActionId(requestId)
    try {
      await apiRequest(`/auth/requests/${requestId}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
      })

      setRequests((current) =>
        current.map((request) =>
          request.request_id === requestId
            ? { ...request, request_status: "rejected" as const, reviewed_at: new Date().toISOString() }
            : request
        )
      )
      window.dispatchEvent(new Event("lox:notifications-updated"))
    } finally {
      setActionId(null)
    }
  }

  const pendingRequests = requests.filter((request) => request.request_status === "pending")
  const completedRequests = requests.filter((request) => request.request_status !== "pending")

  return (
    <AppShell role="super" title="Notifications">
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Pending approvals</h3>
              <p className="text-xs text-muted-foreground">Requests waiting for a decision.</p>
            </div>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">{pendingRequests.length}</span>
          </div>

          {loading ? (
            <div className="text-sm text-muted-foreground">Loading request inbox…</div>
          ) : pendingRequests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-secondary/50 p-4 text-sm text-muted-foreground">
              No pending approvals right now.
            </div>
          ) : (
            <div className="space-y-2">
              {pendingRequests.map((request) => (
                <div key={request.request_id} className="flex items-start gap-3 rounded-xl p-3 hover:bg-secondary transition">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-info/15 text-info">
                    <UserPlus className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">
                      {request.role === "super_admin" ? "Super admin request" : `Sub-admin request — ${request.station_name || request.station_id || "station pending"}`}
                    </div>
                    <div className="text-xs text-muted-foreground wrap-break-word">
                      {request.full_name} · {request.email} · {request.phone}
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      NIC {request.nic_number} · Age {request.age}
                      {request.role === "sub_admin" && request.locker_id ? ` · Locker ${request.locker_id}` : ""}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      disabled={actionId === request.request_id}
                      onClick={() => approveRequest(request.request_id)}
                      className="grid h-8 w-8 place-items-center rounded-lg bg-success/15 text-success hover:bg-success/25 transition disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      disabled={actionId === request.request_id}
                      onClick={() => rejectRequest(request.request_id)}
                      className="grid h-8 w-8 place-items-center rounded-lg bg-destructive/15 text-destructive hover:bg-destructive/25 transition disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Unread messages</h3>
              <p className="text-xs text-muted-foreground">Messages from sub admins and replies from HQ.</p>
            </div>
            <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">{messages.unread_count}</span>
          </div>

          {messages.items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-secondary/50 p-4 text-sm text-muted-foreground">
              No unread messages right now.
            </div>
          ) : (
            <div className="space-y-2">
              {messages.items.map((message) => (
                <div key={message.id} className="flex items-start gap-3 rounded-xl p-3 hover:bg-secondary transition">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-info/15 text-info">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">
                      {message.sender_name} · {message.station_name}
                    </div>
                    <div className="text-xs text-muted-foreground wrap-break-word">{formatConversationSnippet(message)}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">{formatChatTime(message.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft xl:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Resolved requests</h3>
          {completedRequests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-secondary/50 p-4 text-sm text-muted-foreground">
              Approved and rejected requests will appear here.
            </div>
          ) : (
            <div className="space-y-2">
              {completedRequests.slice(0, 8).map((request) => (
                <div key={request.request_id} className="flex items-start gap-3 rounded-xl p-3 hover:bg-secondary transition">
                  <div className={`grid h-10 w-10 place-items-center rounded-xl ${request.request_status === "approved" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                    {request.request_status === "approved" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">{request.full_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {request.request_status === "approved" ? "Approved" : "Rejected"} · {request.role === "super_admin" ? "Super admin" : `Sub admin for ${request.station_name || request.station_id || "station"}`}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{request.reviewed_at ? new Date(request.reviewed_at).toLocaleString() : "Just now"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
