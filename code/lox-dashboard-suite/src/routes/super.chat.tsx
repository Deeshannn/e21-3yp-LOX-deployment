import { createFileRoute } from "@tanstack/react-router"
import { AppShell } from "@/components/layout/AppShell"
import { ChatWorkspace } from "@/components/chat/ChatWorkspace"
import { Activity, MessageSquareText, Users } from "lucide-react"

export const Route = createFileRoute("/super/chat")({
  head: () => ({ meta: [{ title: "Messages — LOX HQ" }] }),
  component: SuperChatPage,
})

function SuperChatPage() {
  return (
    <AppShell role="super" title="Messages">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: MessageSquareText, title: "Live conversations", text: "Talk to any station from one inbox." },
            { icon: Users, title: "Station scoped", text: "Every thread is tied to a station database." },
            { icon: Activity, title: "Unread alerts", text: "New replies appear in the bell and notifications panel." },
          ].map((card) => (
            <div key={card.title} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                <card.icon className="h-5 w-5" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">{card.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{card.text}</p>
            </div>
          ))}
        </div>

        <ChatWorkspace role="super" />
      </div>
    </AppShell>
  )
}