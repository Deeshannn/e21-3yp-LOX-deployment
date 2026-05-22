import { useEffect, useMemo, useState } from "react"
import { Clock3, Loader2, MessageSquare, Paperclip, Search, Send } from "lucide-react"
import { apiRequest } from "@/lib/api"
import { getAuthSession } from "@/lib/auth"
import { formatChatTime, formatConversationSnippet, type ChatConversationSummary, type ChatMessage } from "@/lib/chat"

type ChatWorkspaceProps = {
  role: "sub" | "super"
}

export function ChatWorkspace({ role }: ChatWorkspaceProps) {
  const session = useMemo(() => getAuthSession(), [])
  const [conversations, setConversations] = useState<ChatConversationSummary[]>([])
  const [activeStationId, setActiveStationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [draft, setDraft] = useState("")

  useEffect(() => {
    let active = true

    const loadConversations = async () => {
      if (!session?.token) return

      setLoading(true)
      try {
        const response = await apiRequest<{ conversations: ChatConversationSummary[] }>("/chat/conversations", {
          headers: { Authorization: `Bearer ${session.token}` },
        })

        if (!active) return
        const nextConversations = response.conversations || []
        setConversations(nextConversations)

        if (!activeStationId && nextConversations.length > 0) {
          setActiveStationId(nextConversations[0].station_id)
        }
      } catch {
        if (!active) return
        setConversations([])
        setMessages([])
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadConversations()

    return () => {
      active = false
    }
  }, [activeStationId, session?.token])

  useEffect(() => {
    let active = true

    const loadMessages = async () => {
      if (!session?.token || !activeStationId) return

      setLoadingMessages(true)
      try {
        const response = await apiRequest<{ messages: ChatMessage[] }>(`/chat/messages/${activeStationId}`, {
          headers: { Authorization: `Bearer ${session.token}` },
        })

        if (!active) return
        setMessages(response.messages || [])
        window.dispatchEvent(new Event("lox:messages-updated"))
        window.dispatchEvent(new Event("lox:notifications-updated"))
      } catch {
        if (!active) return
        setMessages([])
      } finally {
        if (active) setLoadingMessages(false)
      }
    }

    void loadMessages()

    return () => {
      active = false
    }
  }, [activeStationId, session?.token])

  const activeConversation = conversations.find((conversation) => conversation.station_id === activeStationId) || null
  const myUserId = session?.user.user_id || ""

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!session?.token || !activeStationId || !draft.trim()) return

    setSending(true)
    try {
      await apiRequest("/chat/messages", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ station_id: activeStationId, content: draft.trim() }),
      })

      setDraft("")
      const response = await apiRequest<{ messages: ChatMessage[] }>(`/chat/messages/${activeStationId}`, {
        headers: { Authorization: `Bearer ${session.token}` },
      })
      setMessages(response.messages || [])
      window.dispatchEvent(new Event("lox:messages-updated"))
      window.dispatchEvent(new Event("lox:notifications-updated"))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <aside className="rounded-2xl border border-border bg-card shadow-soft flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Conversations</h2>
            <p className="text-xs text-muted-foreground">
              {role === "super" ? "Talk to every station from one inbox." : "Chat directly with the super admin."}
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Search conversations"
              className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto divide-y divide-border">
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading conversations…</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No conversations yet.</div>
          ) : (
            conversations.map((conversation) => {
              const active = conversation.station_id === activeStationId
              return (
                <button
                  key={conversation.station_id}
                  type="button"
                  onClick={() => setActiveStationId(conversation.station_id)}
                  className={`w-full text-left flex items-start gap-3 p-4 transition ${active ? "bg-secondary" : "hover:bg-secondary/60"}`}
                >
                  <div className="relative mt-0.5">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-primary-foreground text-xs font-semibold">
                      {conversation.station_name
                        .split(" ")
                        .map((word) => word[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium text-foreground truncate">{conversation.station_name}</div>
                      <div className="text-[10px] text-muted-foreground shrink-0">{conversation.last_message_at ? formatChatTime(conversation.last_message_at) : "New"}</div>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {conversation.last_message ? formatConversationSnippet(conversation.last_message) : "Start the conversation"}
                    </div>
                  </div>
                  {conversation.unread_count > 0 ? (
                    <span className="grid h-5 min-w-5 px-1.5 place-items-center rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
                      {conversation.unread_count}
                    </span>
                  ) : null}
                </button>
              )
            })
          )}
        </div>
      </aside>

      <section className="rounded-2xl border border-border bg-card shadow-soft flex flex-col overflow-hidden min-h-[720px]">
        <header className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-primary text-primary-foreground text-xs font-semibold shadow-glow">
                <MessageSquare className="h-4 w-4" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">
                {activeConversation?.station_name || "Select a conversation"}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {activeConversation ? `Station ${activeConversation.station_id} · ${activeConversation.locker_count} lockers` : "Choose a station to view its thread"}
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-[11px] text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" />
            Messages sync live with the backend
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-mesh p-4 md:p-6 space-y-4">
          {!activeConversation ? (
            <div className="grid h-full min-h-[520px] place-items-center rounded-2xl border border-dashed border-border bg-card/70 p-8 text-center text-sm text-muted-foreground">
              Pick a conversation to start chatting.
            </div>
          ) : loadingMessages ? (
            <div className="grid h-full min-h-[520px] place-items-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading messages…
            </div>
          ) : messages.length === 0 ? (
            <div className="grid h-full min-h-[520px] place-items-center rounded-2xl border border-dashed border-border bg-card/70 p-8 text-center text-sm text-muted-foreground">
              No messages yet. Send the first one below.
            </div>
          ) : (
            messages.map((message) => {
              const isMine = message.sender_user_id === myUserId
              return (
                <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-soft ${isMine ? "bg-gradient-primary text-primary-foreground" : "bg-card text-foreground border border-border"}`}>
                    <div className="flex items-center justify-between gap-3 text-[11px] opacity-80 mb-1">
                      <span>{isMine ? "You" : message.sender_name}</span>
                      <span>{formatChatTime(message.created_at)}</span>
                    </div>
                    <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <footer className="border-t border-border p-3 md:p-4">
          <form onSubmit={sendMessage} className="flex items-center gap-2">
            <button type="button" className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-card hover:bg-secondary transition" disabled>
              <Paperclip className="h-4 w-4 text-foreground" />
            </button>
            <textarea
              rows={1}
              placeholder={activeConversation ? "Write a message…" : "Select a conversation first"}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={!activeConversation || sending}
              className="min-h-11 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!activeConversation || !draft.trim() || sending}
              className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-95 transition disabled:cursor-not-allowed disabled:opacity-70"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </footer>
      </section>
    </div>
  )
}