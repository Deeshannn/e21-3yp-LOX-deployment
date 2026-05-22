import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export function StatCard({
  label, value, delta, icon: Icon, tone = "primary",
}: {
  label: string;
  value: string;
  delta?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "primary" | "success" | "warning" | "destructive" | "info";
}) {
  const toneMap: Record<string, string> = {
    primary: "from-primary/15 to-accent/15 text-primary",
    success: "from-success/15 to-success/5 text-success",
    warning: "from-warning/20 to-warning/5 text-warning",
    destructive: "from-destructive/15 to-destructive/5 text-destructive",
    info: "from-info/15 to-info/5 text-info",
  };
  const positive = delta?.startsWith("+");
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-glow">
      <div className={cn("absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br opacity-60", toneMap[tone])} />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{value}</div>
          {delta && (
            <div className={cn("mt-2 inline-flex items-center gap-1 text-xs font-medium",
              positive ? "text-success" : "text-destructive")}>
              {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {delta} vs last week
            </div>
          )}
        </div>
        <div className={cn("grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br", toneMap[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
