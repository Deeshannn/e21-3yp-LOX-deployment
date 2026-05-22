import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CreditCard, History, LockKeyhole, Loader2, MapPin } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { LockerGrid, LockerLegend } from "@/components/lox/LockerGrid";
import { apiRequest } from "@/lib/api";
import { getAuthSession } from "@/lib/auth";
import { buildLockerPreview, getStationDatabaseLabel, getStationLocationLabel, type StationRecord } from "@/lib/station";

export const Route = createFileRoute("/admin/lockers")({
  head: () => ({ meta: [{ title: "Locker history — LOX" }] }),
  component: LockersPage,
});

const timeline = [
  { t: "Opened by Priya Nair", time: "Today · 10:42", icon: LockKeyhole, tone: "success" },
  { t: "Payment received ₹120", time: "Today · 10:40", icon: CreditCard, tone: "info" },
  { t: "Reserved by Rahul K.", time: "Yesterday · 18:12", icon: History, tone: "warning" },
  { t: "Tamper alert resolved", time: "2 days ago", icon: AlertCircle, tone: "destructive" },
  { t: "Closed by Meera J.", time: "3 days ago · 09:14", icon: LockKeyhole, tone: "success" },
];

const toneCls: Record<string, string> = {
  success: "bg-success/15 text-success",
  info: "bg-info/15 text-info",
  warning: "bg-warning/20 text-warning",
  destructive: "bg-destructive/15 text-destructive",
};

function LockersPage() {
  const session = useMemo(() => getAuthSession(), []);
  const [station, setStation] = useState<StationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selected, setSelected] = useState("01");

  useEffect(() => {
    let alive = true;

    const loadStation = async () => {
      if (!session?.token) {
        if (!alive) return;
        setFeedback("Your session is missing. Please sign in again.");
        setLoading(false);
        return;
      }

      try {
        const response = await apiRequest<{ station: StationRecord }>("/stations/me", {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        });

        if (!alive) return;
        setStation(response.station);
      } catch (err) {
        if (!alive) return;
        setStation(null);
        setFeedback(err instanceof Error ? err.message : "Unable to load your assigned station");
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };

    void loadStation();

    return () => {
      alive = false;
    };
  }, [session?.token]);

  const lockerPreview = useMemo(() => buildLockerPreview(station?.locker_count ?? 0), [station?.locker_count]);

  useEffect(() => {
    if (lockerPreview.length > 0) {
      setSelected(lockerPreview[0].id);
    }
  }, [lockerPreview]);

  const selectedLocker = lockerPreview.find((locker) => locker.id === selected) || lockerPreview[0];

  return (
    <AppShell role="sub" title={station?.name ? `${station.name} Locker History` : "Locker history"}>
      {loading ? (
        <div className="grid min-h-[40vh] place-items-center rounded-3xl border border-border bg-card shadow-soft">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your assigned locker system…
          </div>
        </div>
      ) : feedback ? (
        <div className="rounded-3xl border border-destructive/20 bg-destructive/10 p-5 text-sm text-destructive shadow-soft">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-semibold">Locker history access error</div>
              <div className="mt-1">{feedback}</div>
            </div>
          </div>
        </div>
      ) : station ? (
        <div className="grid gap-6 xl:grid-cols-3">
          <section className="xl:col-span-2 rounded-3xl border border-border bg-card p-6 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">Choose locker</h2>
                <p className="text-xs text-muted-foreground">This grid matches your assigned station’s locker count.</p>
              </div>
              <LockerLegend />
            </div>

            <div className="mt-5 overflow-auto pr-1">
              <LockerGrid lockers={lockerPreview} />
            </div>
          </section>

          <aside className="rounded-3xl border border-border bg-card p-6 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs text-muted-foreground">Locker</div>
                <div className="text-3xl font-semibold text-foreground">#{selectedLocker?.id ?? "--"}</div>
              </div>
              <span className="rounded-full bg-success/15 text-success px-3 py-1 text-xs font-medium">Active</span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Mini label="Locker count" value={String(station.locker_count)} />
              <Mini label="Station name" value={station.name} />
              <Mini label="Station ID" value={station.station_id} />
              <Mini label="Database" value={getStationDatabaseLabel(station)} />
            </div>

            <section className="mt-6 rounded-2xl bg-secondary/50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MapPin className="h-4 w-4 text-primary" /> Station details
              </div>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <p>{getStationLocationLabel(station)}</p>
                <p>{station.location.address}</p>
                <p>{station.notes || "No station note provided yet"}</p>
              </div>
            </section>

            <h3 className="mt-6 text-sm font-semibold text-foreground">Activity timeline</h3>
            <div className="mt-3 space-y-3">
              {timeline.map((e, i) => (
                <div key={i} className="flex gap-3">
                  <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${toneCls[e.tone]}`}>
                    <e.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 border-b border-border pb-3">
                    <div className="text-sm text-foreground">{e.t}</div>
                    <div className="text-xs text-muted-foreground">{e.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      ) : null}
    </AppShell>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold text-foreground mt-0.5">{value}</div>
    </div>
  );
}
