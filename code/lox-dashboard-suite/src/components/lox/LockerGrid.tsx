import { cn } from "@/lib/utils";

export type LockerStatus = "available" | "occupied" | "faulty" | "reserved";

const styles: Record<LockerStatus, string> = {
  available: "bg-success/15 text-success border-success/30 hover:bg-success/25",
  occupied: "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/25",
  faulty: "bg-muted text-muted-foreground border-border",
  reserved: "bg-warning/20 text-warning border-warning/30",
};

export function LockerGrid({ lockers }: { lockers: { id: string; status: LockerStatus }[] }) {
  return (
    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
      {lockers.map((l) => (
        <div
          key={l.id}
          title={`Locker ${l.id} · ${l.status}`}
          className={cn(
            "aspect-square rounded-xl border text-[11px] font-semibold grid place-items-center cursor-pointer transition-all shadow-soft",
            styles[l.status]
          )}
        >
          {l.id}
        </div>
      ))}
    </div>
  );
}

export function LockerLegend() {
  const items: { label: string; cls: string }[] = [
    { label: "Available", cls: "bg-success" },
    { label: "Occupied", cls: "bg-destructive" },
    { label: "Reserved", cls: "bg-warning" },
    { label: "Faulty", cls: "bg-muted-foreground" },
  ];
  return (
    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
      {items.map((i) => (
        <div key={i.label} className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", i.cls)} />
          {i.label}
        </div>
      ))}
    </div>
  );
}
