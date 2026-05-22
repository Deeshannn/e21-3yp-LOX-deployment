import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { members } from "@/lib/mock";
import { Search, MoreHorizontal, Trash2, PauseCircle, Eye } from "lucide-react";

export const Route = createFileRoute("/admin/members")({
  head: () => ({ meta: [{ title: "Members — LOX Station" }] }),
  component: MembersPage,
});

function MembersPage() {
  return (
    <AppShell role="sub" title="Members management">
      <div className="rounded-2xl border border-border bg-card shadow-soft p-5">
        <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between mb-5">
          <div className="relative md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input placeholder="Search members…" className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40" />
          </div>
          <div className="flex flex-wrap gap-2">
            {["All", "Active", "Expired", "Paid", "Due"].map((f, i) => (
              <button key={f} className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${i === 0 ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-secondary text-secondary-foreground hover:bg-muted"}`}>{f}</button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="py-3 px-2">Member</th>
                <th className="py-3 px-2">Locker</th>
                <th className="py-3 px-2">Duration</th>
                <th className="py-3 px-2">Status</th>
                <th className="py-3 px-2">Payment</th>
                <th className="py-3 px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.name} className="border-b border-border last:border-0 hover:bg-secondary/60 transition">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary text-primary-foreground text-xs font-semibold">
                        {m.name.split(" ").map((s) => s[0]).join("")}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{m.name}</div>
                        <div className="text-xs text-muted-foreground">{m.email} · {m.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2 font-mono text-foreground">#{m.locker}</td>
                  <td className="py-3 px-2 text-muted-foreground">{m.duration}</td>
                  <td className="py-3 px-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${m.status === "Active" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${m.payment === "Paid" ? "bg-info/15 text-info" : "bg-warning/20 text-warning"}`}>
                      {m.payment}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center justify-end gap-1">
                      <Icon btn={Eye} />
                      <Icon btn={PauseCircle} />
                      <Icon btn={Trash2} danger />
                      <Icon btn={MoreHorizontal} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h3 className="text-sm font-semibold text-foreground mb-4">Sub-admins under this station</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {["Aarav Mehta", "Pooja Iyer", "Rohan Das"].map((n) => (
            <div key={n} className="flex items-center justify-between rounded-xl border border-border p-3">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary text-primary-foreground text-xs font-semibold">
                  {n.split(" ").map((s) => s[0]).join("")}
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{n}</div>
                  <div className="text-xs text-muted-foreground">Sub-admin</div>
                </div>
              </div>
              <button className="text-xs font-medium text-destructive hover:underline">Remove</button>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function Icon({ btn: Btn, danger }: { btn: React.ComponentType<{ className?: string }>; danger?: boolean }) {
  return (
    <button className={`grid h-8 w-8 place-items-center rounded-lg border border-border bg-card hover:bg-secondary transition ${danger ? "text-destructive" : "text-foreground"}`}>
      <Btn className="h-4 w-4" />
    </button>
  );
}
