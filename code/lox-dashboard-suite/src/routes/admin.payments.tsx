import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { StatCard } from "@/components/ui/stat-card";
import { usageData } from "@/lib/mock";
import { CreditCard, IndianRupee, Receipt, AlertCircle, Download } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/admin/payments")({
  head: () => ({ meta: [{ title: "Payments & Billing — LOX" }] }),
  component: PaymentsPage,
});

const invoices = [
  { id: "INV-4423", user: "Priya Nair", date: "May 21", amount: "₹420", status: "Paid" },
  { id: "INV-4422", user: "Rahul Krishnan", date: "May 21", amount: "₹180", status: "Paid" },
  { id: "INV-4421", user: "Ananya Suresh", date: "May 20", amount: "₹650", status: "Due" },
  { id: "INV-4420", user: "Vivek Menon", date: "May 20", amount: "₹220", status: "Paid" },
  { id: "INV-4419", user: "Meera Joseph", date: "May 19", amount: "₹980", status: "Due" },
];

function PaymentsPage() {
  return (
    <AppShell role="sub" title="Payments & Billing">
      <div className="grid gap-5 lg:grid-cols-4">
        <StatCard label="Revenue (month)" value="₹84,210" delta="+18%" icon={IndianRupee} tone="success" />
        <StatCard label="Outstanding" value="₹6,420" delta="+4%" icon={AlertCircle} tone="warning" />
        <StatCard label="Invoices" value="312" delta="+22" icon={Receipt} tone="info" />
        <StatCard label="Active subscriptions" value="148" delta="+9" icon={CreditCard} tone="primary" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h3 className="text-sm font-semibold text-foreground mb-3">Daily revenue</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={usageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                <Bar dataKey="revenue" fill="var(--primary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h3 className="text-sm font-semibold text-foreground mb-3">Outstanding trend</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={usageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                <Line dataKey="revenue" stroke="var(--accent)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Recent invoices</h3>
          <div className="flex gap-2">
            {["All", "Paid", "Due"].map((f, i) => (
              <button key={f} className={`rounded-full px-3 py-1.5 text-xs font-medium ${i === 0 ? "bg-gradient-primary text-primary-foreground shadow-glow" : "bg-secondary text-secondary-foreground hover:bg-muted"}`}>{f}</button>
            ))}
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
              <th className="py-3 px-2">Invoice</th>
              <th className="py-3 px-2">User</th>
              <th className="py-3 px-2">Date</th>
              <th className="py-3 px-2">Amount</th>
              <th className="py-3 px-2">Status</th>
              <th className="py-3 px-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((i) => (
              <tr key={i.id} className="border-b border-border last:border-0 hover:bg-secondary/60 transition">
                <td className="py-3 px-2 font-mono text-foreground">{i.id}</td>
                <td className="py-3 px-2 text-foreground">{i.user}</td>
                <td className="py-3 px-2 text-muted-foreground">{i.date}</td>
                <td className="py-3 px-2 font-medium text-foreground">{i.amount}</td>
                <td className="py-3 px-2">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${i.status === "Paid" ? "bg-success/15 text-success" : "bg-warning/20 text-warning"}`}>{i.status}</span>
                </td>
                <td className="py-3 px-2 text-right">
                  <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium hover:bg-secondary transition">
                    <Download className="h-3.5 w-3.5" /> PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
