import { createFileRoute, useRouter } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { ShieldCheck, Plus, Trash2, Settings2 } from "lucide-react";
import { setPendingSignupRole } from "@/lib/auth";

export const Route = createFileRoute("/super/admins")({
  head: () => ({ meta: [{ title: "Super admins — LOX HQ" }] }),
  component: AdminsPage,
});

const admins = [
  { name: "Riya Kapoor", email: "riya@lox.io", role: "Owner", perms: ["Stations", "Billing", "Security", "Broadcast"], last: "Just now" },
  { name: "Karthik V.", email: "karthik@lox.io", role: "Operations", perms: ["Stations", "Security"], last: "12 min ago" },
  { name: "Anjali Rao", email: "anjali@lox.io", role: "Finance", perms: ["Billing", "Reports"], last: "2h ago" },
  { name: "Devraj S.", email: "devraj@lox.io", role: "Support", perms: ["Messages", "Stations"], last: "Yesterday" },
];

const logs = [
  { who: "Riya Kapoor", t: "Approved Bangalore Tech Park onboarding", time: "2m ago" },
  { who: "Karthik V.", t: "Suspended station LX-CLT-02", time: "1h ago" },
  { who: "Anjali Rao", t: "Exported May revenue report", time: "3h ago" },
  { who: "Devraj S.", t: "Replied to 5 support threads", time: "Yesterday" },
];

function AdminsPage() {
  const router = useRouter();

  return (
    <AppShell role="super" title="Super admin management">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-foreground">Admin team</h3>
            <button
              type="button"
              onClick={async () => {
                setPendingSignupRole("super")
                await router.navigate({ to: "/signup" })
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-glow hover:opacity-95 transition"
            >
              <Plus className="h-4 w-4" /> Add super admin
            </button>
          </div>
          <div className="space-y-3">
            {admins.map((a) => (
              <div key={a.email} className="rounded-2xl border border-border p-4 hover:bg-secondary/60 transition">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-primary-foreground text-xs font-semibold">
                      {a.name.split(" ").map((s) => s[0]).join("")}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">{a.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{a.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-info/15 text-info px-2.5 py-1 text-[11px] font-medium">
                      <ShieldCheck className="h-3 w-3" /> {a.role}
                    </span>
                    <button className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-card hover:bg-secondary"><Settings2 className="h-4 w-4" /></button>
                    <button className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-card text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {a.perms.map((p) => (
                    <span key={p} className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">{p}</span>
                  ))}
                  <span className="ml-auto text-[11px] text-muted-foreground self-center">Active {a.last}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h3 className="text-sm font-semibold text-foreground mb-4">Recent activity</h3>
          <div className="space-y-3">
            {logs.map((l, i) => (
              <div key={i} className="flex gap-3 border-b border-border pb-3 last:border-0">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary text-primary-foreground text-[11px] font-semibold shrink-0">
                  {l.who.split(" ").map((s) => s[0]).join("")}
                </div>
                <div>
                  <div className="text-sm text-foreground"><span className="font-semibold">{l.who}</span> — {l.t}</div>
                  <div className="text-xs text-muted-foreground">{l.time}</div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
