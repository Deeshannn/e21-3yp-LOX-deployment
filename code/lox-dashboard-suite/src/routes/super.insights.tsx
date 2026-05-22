import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { StatCard } from "@/components/ui/stat-card";
import { usageData } from "@/lib/mock";
import { TrendingUp, Users, Building2, IndianRupee } from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export const Route = createFileRoute("/super/insights")({
  head: () => ({ meta: [{ title: "Insights — LOX HQ" }] }),
  component: InsightsPage,
});

const districts = [
  { d: "Ernakulam", v: 92 },
  { d: "Trivandrum", v: 86 },
  { d: "Bangalore", v: 78 },
  { d: "Mumbai", v: 72 },
  { d: "Delhi", v: 68 },
  { d: "Kozhikode", v: 54 },
];

function InsightsPage() {
  return (
    <AppShell role="super" title="Insights & growth">
      <div className="grid gap-5 lg:grid-cols-4">
        <StatCard label="Station growth" value="+12%" delta="+3" icon={Building2} tone="primary" />
        <StatCard label="User growth" value="+18%" delta="+4%" icon={Users} tone="success" />
        <StatCard label="Revenue growth" value="+22%" delta="+6%" icon={IndianRupee} tone="warning" />
        <StatCard label="Network occupancy" value="68%" delta="+2%" icon={TrendingUp} tone="info" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Network growth" subtitle="Stations onboarded">
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={usageData}>
                <defs>
                  <linearGradient id="ng" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                <Area type="monotone" dataKey="usage" stroke="var(--primary)" strokeWidth={2.5} fill="url(#ng)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Revenue trend" subtitle="Weekly">
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={usageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                <Line dataKey="revenue" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Most active districts" subtitle="Avg occupancy">
          <div className="space-y-3">
            {districts.map((d) => (
              <div key={d.d}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium text-foreground">{d.d}</span>
                  <span className="text-muted-foreground">{d.v}%</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-primary" style={{ width: `${d.v}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Peak usage" subtitle="Hour of day">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={[
                { h: "6a", v: 18 }, { h: "9a", v: 52 }, { h: "12p", v: 88 },
                { h: "3p", v: 102 }, { h: "6p", v: 138 }, { h: "9p", v: 96 }, { h: "12a", v: 32 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="h" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                <Bar dataKey="v" fill="var(--primary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}
