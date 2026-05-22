import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { StatCard } from "@/components/ui/stat-card";
import { stations, usageData } from "@/lib/mock";
import { Building2, Users, Boxes, IndianRupee, Search, MapPin, Activity } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/super/")({
  head: () => ({ meta: [{ title: "LOX HQ — Overview" }] }),
  component: SuperHome,
});

function SuperHome() {
  return (
    <AppShell role="super" title="Network overview">
      <div className="grid gap-5 lg:grid-cols-4">
        <StatCard label="Locker stations" value="240" delta="+12" icon={Building2} tone="primary" />
        <StatCard label="Total lockers" value="18,420" delta="+340" icon={Boxes} tone="info" />
        <StatCard label="Active users" value="42,118" delta="+8%" icon={Users} tone="success" />
        <StatCard label="Revenue (MTD)" value="₹1.42Cr" delta="+22%" icon={IndianRupee} tone="warning" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Network usage</h3>
            <span className="text-xs text-muted-foreground">Past 7 days</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={usageData}>
                <defs>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                <Area type="monotone" dataKey="usage" stroke="var(--primary)" strokeWidth={2.5} fill="url(#g2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h3 className="text-sm font-semibold text-foreground mb-3">System health</h3>
          <div className="space-y-4">
            {[
              { l: "API uptime", v: 99.98, c: "success" },
              { l: "IoT connectivity", v: 98.6, c: "info" },
              { l: "Payments gateway", v: 99.2, c: "success" },
              { l: "Tamper alerts (24h)", v: 12, c: "warning", raw: true },
            ].map((m) => (
              <div key={m.l}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">{m.l}</span>
                  <span className="font-semibold text-foreground">{m.raw ? m.v : `${m.v}%`}</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${m.raw ? 30 : m.v}%`, background: `var(--${m.c})` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between mb-5">
          <h3 className="text-sm font-semibold text-foreground">Locker stations</h3>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input placeholder="Search by name, district, ID…" className="w-72 rounded-xl border border-input bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40" />
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {stations.map((s) => {
            const pct = Math.round((s.occ / s.lockers) * 100);
            return (
              <Link key={s.id} to="/super/stations" className="group rounded-2xl border border-border bg-card overflow-hidden shadow-soft hover:shadow-glow transition hover:-translate-y-0.5">
                <div className="relative h-28 bg-gradient-primary overflow-hidden">
                  <div className="absolute inset-0 bg-mesh opacity-30 mix-blend-overlay" />
                  <div className="absolute inset-0 grid grid-cols-12 gap-1 p-3 opacity-70">
                    {Array.from({ length: 36 }).map((_, i) => (
                      <div key={i} className={`aspect-square rounded ${(i * 7) % 5 < 2 ? "bg-white/70" : "bg-white/20"}`} />
                    ))}
                  </div>
                  <span className="absolute top-3 right-3 rounded-full glass px-2 py-1 text-[11px] font-medium text-primary-foreground">{pct}% full</span>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-foreground">{s.name}</div>
                      <div className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" /> {s.district} · {s.id}
                      </div>
                    </div>
                    <div className="inline-flex items-center gap-1 text-success text-xs"><Activity className="h-3 w-3" /> live</div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <Cell k="Lockers" v={String(s.lockers)} />
                    <Cell k="In use" v={String(s.occ)} />
                    <Cell k="Owner" v={s.admin.split(" ")[0]} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

function Cell({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl bg-secondary py-2">
      <div className="text-sm font-semibold text-foreground">{v}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{k}</div>
    </div>
  );
}
