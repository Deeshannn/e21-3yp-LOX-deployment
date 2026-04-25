import { Link, NavLink, useLocation } from "react-router-dom";
import { Zap, ShieldCheck } from "lucide-react";
import { UserSwitcher } from "./UserSwitcher";

export function AppShell({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  return (
    <div className="relative min-h-screen flex flex-col">
      <div className="thunder-bg" aria-hidden />
      <div className="thunder-bolts" aria-hidden>
        <span /><span /><span /><span /><span />
      </div>

      <header className="sticky top-0 z-40 border-b border-border/60 backdrop-blur-xl bg-background/40">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center glow-violet">
              <Zap className="w-5 h-5 text-primary-foreground" strokeWidth={2.5} />
              <div className="absolute inset-0 rounded-xl bg-gradient-brand opacity-0 group-hover:opacity-60 blur-lg transition-opacity" />
            </div>
            <div className="leading-tight">
              <div className="font-display font-bold text-lg tracking-tight">SmartLocker</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">electric network</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm">
            <NavItem to="/" active={loc.pathname === "/"}>Stations</NavItem>
            <NavItem to="/admin" active={loc.pathname.startsWith("/admin")}>
              <ShieldCheck className="w-4 h-4 mr-1.5" /> Admin
            </NavItem>
          </nav>

          <UserSwitcher />
        </div>
      </header>

      <main className="flex-1 container py-8 md:py-12 animate-fade-in">{children}</main>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        SmartLocker · Powered by lightning ⚡
      </footer>
    </div>
  );
}

function NavItem({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={`relative px-4 py-2 rounded-lg flex items-center transition-colors ${
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {active && <span className="absolute inset-0 rounded-lg bg-gradient-brand-soft border border-border" />}
      <span className="relative">{children}</span>
    </NavLink>
  );
}
