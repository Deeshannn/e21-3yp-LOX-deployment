import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Megaphone, Send, Wrench, Bell } from "lucide-react";

export const Route = createFileRoute("/super/broadcast")({
  head: () => ({ meta: [{ title: "Broadcast — LOX HQ" }] }),
  component: BroadcastPage,
});

const history = [
  { t: "Pricing update — Q3 commission rates", s: "Sent to 240 stations · 2 days ago", icon: Megaphone, tone: "info" },
  { t: "Scheduled maintenance — Sun 02:00 IST", s: "Sent to 240 stations · 1 week ago", icon: Wrench, tone: "warning" },
  { t: "Festive offer kit — May edition", s: "Sent to 180 stations · 2 weeks ago", icon: Bell, tone: "success" },
];

const toneCls: Record<string, string> = {
  success: "bg-success/15 text-success",
  info: "bg-info/15 text-info",
  warning: "bg-warning/20 text-warning",
};

function BroadcastPage() {
  return (
    <AppShell role="super" title="Global broadcast">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center gap-3 mb-5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Compose announcement</h2>
              <p className="text-xs text-muted-foreground">Reach every locker station in the network instantly.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Audience</label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {["All stations", "Specific district", "Sub-admins only", "Maintenance crew"].map((a, i) => (
                  <button key={a} className={`rounded-full px-3 py-1.5 text-xs font-medium ${i === 0 ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-secondary text-secondary-foreground hover:bg-muted"}`}>{a}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Subject</label>
              <input placeholder="e.g. Scheduled maintenance window" className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Message</label>
              <textarea rows={7} placeholder="Write your message…" className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40" />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {["Announcement", "Maintenance", "Security"].map((t, i) => (
                  <button key={t} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${i === 0 ? "bg-info/15 text-info" : "bg-secondary text-secondary-foreground hover:bg-muted"}`}>
                    <Bell className="h-3 w-3" /> {t}
                  </button>
                ))}
              </div>
              <button className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-95 transition">
                <Send className="h-4 w-4" /> Broadcast now
              </button>
            </div>
          </div>
        </section>

        <aside className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h3 className="text-sm font-semibold text-foreground mb-4">Recent broadcasts</h3>
          <div className="space-y-3">
            {history.map((h, i) => (
              <div key={i} className="flex items-start gap-3 border-b border-border pb-3 last:border-0">
                <div className={`grid h-9 w-9 place-items-center rounded-xl ${toneCls[h.tone]}`}>
                  <h.icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{h.t}</div>
                  <div className="text-xs text-muted-foreground">{h.s}</div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
