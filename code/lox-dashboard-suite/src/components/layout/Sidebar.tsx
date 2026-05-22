import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, Boxes, BarChart3, MessageSquare,
  CreditCard, Building2, Bell, Megaphone, TrendingUp, ShieldCheck,
  Package, PlusCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LoxMark } from "@/components/brand/LoxMark";

type Item = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };

const subAdminNav: Item[] = [
  { to: "/admin/station", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/members", label: "Members", icon: Users },
  { to: "/admin/lockers", label: "Locker History", icon: Boxes },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/chat", label: "Chat", icon: MessageSquare },
  { to: "/admin/payments", label: "Payments", icon: CreditCard },
];

const superAdminNav: Item[] = [
  { to: "/super", label: "Overview", icon: LayoutDashboard },
  { to: "/super/stations", label: "Stations", icon: Building2 },
  { to: "/super/chat", label: "Messages", icon: MessageSquare },
  { to: "/super/notifications", label: "Notifications", icon: Bell },
  { to: "/super/broadcast", label: "Broadcast", icon: Megaphone },
  { to: "/super/insights", label: "Insights", icon: TrendingUp },
  { to: "/super/admins", label: "Admins", icon: ShieldCheck },
];

export function AppSidebar({ role }: { role: "sub" | "super" }) {
  const items = role === "sub" ? subAdminNav : superAdminNav;
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-sidebar-border">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary shadow-glow">
          <LoxMark className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <div className="font-semibold tracking-tight text-foreground">LOX</div>
          <div className="text-[11px] text-muted-foreground -mt-0.5">
            {role === "sub" ? "Station Console" : "Company Console"}
          </div>
        </div>
      </div>

      {role === "super" ? (
        <div className="px-3 pt-3">
          <Link
            to="/super/stations"
            className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-95"
          >
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/15">
              <PlusCircle className="h-4 w-4" />
            </span>
            <span className="leading-tight">Create a Locker Station</span>
          </Link>
        </div>
      ) : null}

      <nav className="flex-1 p-3 space-y-1">
        {items.map((it) => {
          const active = path === it.to || (it.to !== "/admin" && it.to !== "/super" && path.startsWith(it.to));
          const isRoot = (it.to === "/admin" || it.to === "/super") && path === it.to;
          const isActive = active || isRoot;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-gradient-primary text-primary-foreground shadow-glow"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:translate-x-0.5"
              )}
            >
              <it.icon className="h-4 w-4" />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="m-3 rounded-2xl bg-gradient-soft p-4 border border-border shadow-soft">
        <div className="text-xs font-semibold text-foreground">System healthy</div>
        <div className="mt-1 text-[11px] text-muted-foreground">All IoT lockers online</div>
        <div className="mt-3 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse-dot" />
          <span className="text-[11px] text-muted-foreground">Live · 99.98% uptime</span>
        </div>
      </div>
    </aside>
  );
}
