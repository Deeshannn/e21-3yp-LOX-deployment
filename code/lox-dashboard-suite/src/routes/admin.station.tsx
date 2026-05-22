import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Building2, Database, Hash, Loader2, MapPin, ShieldCheck, Sparkles, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { LockerGrid, LockerLegend } from "@/components/lox/LockerGrid";
import { apiRequest } from "@/lib/api";
import { getAuthSession } from "@/lib/auth";
import { buildLockerPreview, getStationDatabaseLabel, getStationLocationLabel, type StationRecord } from "@/lib/station";

export const Route = createFileRoute("/admin/station")({
  head: () => ({ meta: [{ title: "Station Overview — LOX" }] }),
  component: StationDashboardPage,
});

function StationDashboardPage() {
  const session = useMemo(() => getAuthSession(), []);
  const [station, setStation] = useState<StationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

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
  const statusTone = station?.status === "active" ? "text-success" : station?.status === "maintenance" ? "text-warning" : "text-destructive";

  return (
    <AppShell role="sub" title={station?.name ? `${station.name} Station` : "Station Overview"}>
      {loading ? (
        <div className="grid min-h-[40vh] place-items-center rounded-3xl border border-border bg-card shadow-soft">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your assigned station…
          </div>
        </div>
      ) : feedback ? (
        <div className="rounded-3xl border border-destructive/20 bg-destructive/10 p-5 text-sm text-destructive shadow-soft">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-semibold">Station access error</div>
              <div className="mt-1">{feedback}</div>
            </div>
          </div>
        </div>
      ) : station ? (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-6">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                    <Sparkles className="h-3.5 w-3.5" /> Assigned station only
                  </div>
                  <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{station.name}</h1>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    You are signed in only to this station. The dashboard below is tied to your approved locker system and station database.
                  </p>
                </div>
                <div className={`rounded-full px-3 py-1 text-xs font-semibold ${station.status === "active" ? "bg-success/15 text-success" : station.status === "maintenance" ? "bg-warning/20 text-warning" : "bg-destructive/15 text-destructive"}`}>
                  {station.status}
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="Lockers" value={String(station.locker_count)} icon={Building2} />
                <Metric label="Estimated members" value={String(station.estimated_members)} icon={Users} />
                <Metric label="Station DB" value={getStationDatabaseLabel(station)} icon={Database} />
                <Metric label="Station ID" value={station.station_id} icon={Hash} />
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Locker grid</h2>
                  <p className="text-xs text-muted-foreground">This grid is generated from your station’s locker count.</p>
                </div>
                <LockerLegend />
              </div>
              <div className="mt-5 overflow-auto pr-1">
                <LockerGrid lockers={lockerPreview} />
              </div>
            </div>
          </section>

          <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
            <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
              <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Station details</div>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">{station.name}</h2>
              <p className={`mt-1 text-sm font-medium ${statusTone}`}>Access restricted to your approved station only.</p>

              <div className="mt-5 space-y-3">
                <Detail label="Location" value={getStationLocationLabel(station)} icon={MapPin} />
                <Detail label="Address" value={station.location.address} icon={MapPin} />
                <Detail label="District" value={station.location.district} icon={MapPin} />
                <Detail label="City" value={station.location.city} icon={MapPin} />
                <Detail label="Station note" value={station.notes || "No note provided yet"} icon={ShieldCheck} />
                <Detail label="Last heartbeat" value={station.last_heartbeat_at ? new Date(station.last_heartbeat_at).toLocaleString() : "Not available"} icon={Database} />
              </div>
            </section>

            <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" /> Your authorization
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                This account is bound to {session?.user.station_name || session?.user.station_id || station.station_id}. The login token and station data are validated against that station only.
              </p>
            </section>
          </aside>
        </div>
      ) : null}
    </AppShell>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        <span>{label}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-3 text-2xl font-semibold text-foreground break-all">{value}</div>
    </div>
  );
}

function Detail({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" /> {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-foreground wrap-break-word">{value}</div>
    </div>
  );
}
