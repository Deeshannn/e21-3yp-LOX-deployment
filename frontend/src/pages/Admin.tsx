import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { ApiError, CenteredLoader } from "@/components/Status";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AdminQueueDetails, Locker, OverdueLocker, PendingRequest,
  Station, StationSettings, api
} from "@/lib/api";
import {
  AlertTriangle, Check, Clock, Grid3x3, Mail, Package,
  RefreshCw, Settings, ShieldCheck, Users, X
} from "lucide-react";
import { toast } from "sonner";

type Tab = "memberships" | "queue" | "overdues" | "settings";

const Admin = () => {
  const [stations,  setStations]  = useState<Station[] | null>(null);
  const [stationId, setStationId] = useState<string>("");
  const [tab,       setTab]       = useState<Tab>("memberships");
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    api.listStations()
      .then(s => { setStations(s); if (s[0]) setStationId(s[0].station_id); })
      .catch(e => setError((e as Error).message));
  }, []);

  return (
    <AppShell>
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card/60 border border-border text-xs uppercase tracking-widest text-brand-cyan mb-3">
            <ShieldCheck className="w-3.5 h-3.5" /> station admin
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your station — members, queue, overdues and settings.</p>
        </div>
        <div className="w-full md:w-72">
          <Select value={stationId} onValueChange={setStationId} disabled={!stations}>
            <SelectTrigger className="bg-card/60 border-border">
              <SelectValue placeholder="Pick a station" />
            </SelectTrigger>
            <SelectContent>
              {stations?.map(s => (
                <SelectItem key={s.station_id} value={s.station_id}>
                  {s.name} <span className="text-muted-foreground ml-1">· {s.station_id}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      {error && <ApiError message={error} />}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-card/60 border border-border rounded-xl w-fit mb-6">
        {(["memberships", "queue", "overdues", "settings"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              tab === t
                ? "bg-card border border-border text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "memberships" && <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Memberships</span>}
            {t === "queue"       && <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Queue</span>}
            {t === "overdues"    && <span className="flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Overdues</span>}
            {t === "settings"    && <span className="flex items-center gap-1.5"><Settings className="w-3.5 h-3.5" /> Settings</span>}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {stationId && tab === "memberships" && <MembershipsTab stationId={stationId} />}
      {stationId && tab === "queue"       && <QueueTab       stationId={stationId} />}
      {stationId && tab === "overdues"    && <OverduesTab    stationId={stationId} />}
      {stationId && tab === "settings"    && <SettingsTab    stationId={stationId} />}
    </AppShell>
  );
};


// ─────────────────────────────────────────────────────────
// MEMBERSHIPS TAB
// ─────────────────────────────────────────────────────────
function MembershipsTab({ stationId }: { stationId: string }) {
  const [requests, setRequests] = useState<PendingRequest[] | null>(null);
  const [busyId,   setBusyId]   = useState<string | null>(null);
  const [error,    setError]    = useState<string | null>(null);

  const load = useCallback(async () => {
    setRequests(null);
    try {
      setRequests(await api.pendingRequests(stationId));
      setError(null);
    } catch (e) { setError((e as Error).message); }
  }, [stationId]);

  useEffect(() => { load(); }, [load]);

  const accept = async (r: PendingRequest) => {
    setBusyId(r.membership_id);
    try {
      await api.acceptMembership(r.membership_id);
      toast.success(`Accepted ${r.user.name}`);
      setRequests(prev => prev?.filter(x => x.membership_id !== r.membership_id) || null);
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusyId(null); }
  };

  const ignore = async (r: PendingRequest) => {
    setBusyId(r.membership_id);
    try {
      await api.ignoreMembership(r.membership_id);
      toast(`Ignored ${r.user.name}`);
      setRequests(prev => prev?.filter(x => x.membership_id !== r.membership_id) || null);
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusyId(null); }
  };

  if (error) return <ApiError message={error} />;
  if (!requests) return <CenteredLoader label="Fetching membership requests…" />;

  if (requests.length === 0) return (
    <div className="glass-card rounded-2xl p-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gradient-brand-soft border border-border mx-auto flex items-center justify-center mb-4">
        <Check className="w-7 h-7 text-brand-cyan" />
      </div>
      <h3 className="font-display text-xl font-semibold">All clear</h3>
      <p className="text-sm text-muted-foreground mt-1">No pending membership requests.</p>
    </div>
  );

  return (
    <div className="grid gap-4">
      {requests.map((r, i) => (
        <article
          key={r.membership_id}
          className="glass-card rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-brand flex items-center justify-center text-primary-foreground font-display font-bold text-lg">
              {r.user.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
            </div>
            <div>
              <div className="font-display font-semibold text-lg leading-tight">{r.user.name}</div>
              <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 mt-0.5">
                <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" /> {r.user.email}</span>
                <span>· {new Date(r.joined_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => ignore(r)} disabled={busyId === r.membership_id} variant="outline" className="border-border">
              <X className="w-4 h-4 mr-1" /> Ignore
            </Button>
            <Button onClick={() => accept(r)} disabled={busyId === r.membership_id} className="bg-gradient-brand text-primary-foreground border-0 glow-violet">
              <Check className="w-4 h-4 mr-1" /> Accept
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}


// ─────────────────────────────────────────────────────────
// QUEUE TAB
// ─────────────────────────────────────────────────────────
function QueueTab({ stationId }: { stationId: string }) {
  const [details, setDetails] = useState<AdminQueueDetails | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setDetails(null);
    try {
      setDetails(await api.adminQueueDetails(stationId));
      setError(null);
    } catch (e) { setError((e as Error).message); }
  }, [stationId]);

  useEffect(() => { load(); }, [load]);

  if (error)   return <ApiError message={error} />;
  if (!details) return <CenteredLoader label="Fetching queue details…" />;

  return (
    <div className="space-y-6">
      {/* Summary chips */}
      <div className="flex flex-wrap gap-3">
        <Chip label="Total in queue" value={details.total}    color="cyan"   />
        <Chip label="Waiting"        value={details.waiting}  color="muted"  />
        <Chip label="Notified"       value={details.notified} color="amber"  />
        <Chip label="Max size"       value={details.max_size} color="muted"  />
        <div className="flex items-center gap-2 ml-auto">
          <Button size="sm" variant="outline" onClick={load} className="border-border">
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {details.total === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-display text-xl font-semibold">Queue is empty</h3>
          <p className="text-sm text-muted-foreground mt-1">No users are currently waiting.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {details.entries.map((entry, i) => (
            <div
              key={entry.user_id.toString()}
              className={`glass-card rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4 animate-fade-in ${
                entry.status === "notified" ? "border-amber-400/30" : ""
              }`}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {/* Position badge */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-lg shrink-0 ${
                entry.status === "notified"
                  ? "bg-amber-400/10 text-amber-400 border border-amber-400/30"
                  : "bg-card border border-border text-muted-foreground"
              }`}>
                #{entry.position}
              </div>

              {/* User info */}
              <div className="flex-1 min-w-0">
                <div className="font-display font-semibold">{entry.user.name}</div>
                <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 mt-0.5">
                  <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{entry.user.email}</span>
                  <span>· {entry.minutes_in_queue}m in queue</span>
                  <span>· joined {new Date(entry.joined_at).toLocaleTimeString()}</span>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2 shrink-0">
                {entry.status === "notified" ? (
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-widest text-amber-400 mb-0.5">Notified</div>
                    <div className="font-mono font-bold text-amber-400">
                      {entry.offered_locker}
                    </div>
                    {entry.seconds_remaining !== null && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {Math.floor(entry.seconds_remaining / 60)}m {entry.seconds_remaining % 60}s left
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-xs px-2.5 py-1 rounded-md bg-muted/30 border border-border text-muted-foreground">
                    Waiting
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────────────
// OVERDUES TAB
// ─────────────────────────────────────────────────────────
function OverduesTab({ stationId }: { stationId: string }) {
  const [overdues, setOverdues]   = useState<OverdueLocker[] | null>(null);
  const [summary,  setSummary]    = useState<{ total: number; pending: number } | null>(null);
  const [busyId,   setBusyId]     = useState<string | null>(null);
  const [error,    setError]      = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.adminOverdues(stationId);
      setOverdues(r.overdues);
      setSummary({ total: r.total_overdue, pending: r.pending_requests });
      setError(null);
    } catch (e) { setError((e as Error).message); }
  }, [stationId]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh overdues every 30s
  useEffect(() => {
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  // Trigger manual overdue check on mount
  useEffect(() => {
    api.checkOverdue(stationId).catch(() => {});
  }, [stationId]);

  const release = async (lockerId: string) => {
    setBusyId(lockerId);
    try {
      await api.adminRelease(stationId, lockerId);
      toast.success(`Locker ${lockerId} released`);
      load();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusyId(null); }
  };

  if (error)    return <ApiError message={error} />;
  if (!overdues) return <CenteredLoader label="Fetching overdue lockers…" />;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex flex-wrap gap-3">
        <Chip label="Total overdue"     value={summary?.total   ?? 0} color="red"   />
        <Chip label="Release requested" value={summary?.pending ?? 0} color="amber" />
        <div className="ml-auto">
          <Button size="sm" variant="outline" onClick={load} className="border-border">
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {overdues.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Check className="w-10 h-10 text-brand-cyan mx-auto mb-3" />
          <h3 className="font-display text-xl font-semibold">No overdue lockers</h3>
          <p className="text-sm text-muted-foreground mt-1">All lockers are within their time limits.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {overdues.map((o, i) => (
            <article
              key={o.locker_id}
              className={`glass-card rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in ${
                o.release_requested ? "border-amber-400/30" : "border-red-400/20"
              }`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center gap-4">
                {/* Locker icon */}
                <div className="w-12 h-12 rounded-xl bg-red-400/10 border border-red-400/30 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5 text-red-400" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-lg">{o.locker_id}</span>
                    {o.release_requested && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 uppercase tracking-widest">
                        Release requested
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-medium mt-0.5">{o.user.name}</div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 mt-0.5">
                    <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{o.user.email}</span>
                    <span>· overdue {o.overdue_minutes}m ago</span>
                    <span>· reserved {new Date(o.reserved_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => release(o.locker_id)}
                disabled={busyId === o.locker_id}
                className={o.release_requested
                  ? "bg-gradient-brand text-primary-foreground border-0 glow-violet"
                  : "border-border"}
                variant={o.release_requested ? "default" : "outline"}
              >
                {busyId === o.locker_id ? "Releasing…" : "Release locker"}
              </Button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────────────
// SETTINGS TAB
// ─────────────────────────────────────────────────────────
function SettingsTab({ stationId }: { stationId: string }) {
  const [settings, setSettings] = useState<StationSettings | null>(null);
  const [lockers,  setLockers]  = useState<Locker[] | null>(null);
  const [input,    setInput]    = useState<string>("");
  const [busy,     setBusy]     = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const s = await api.getStationSettings(stationId);
      setSettings(s);
      setInput(String(s.free_minutes));
      setError(null);
    } catch (e) { setError((e as Error).message); }
  }, [stationId]);

  // Load lockers using a dummy admin user — admin sees all lockers
  // We use the raw endpoint directly since admin has no user_id context here
  const loadLockers = useCallback(async () => {
    try {
      const r = await api.adminLockers(stationId);
      setLockers(r);
    } catch { setLockers([]); }
  }, [stationId]);

  useEffect(() => { load(); loadLockers(); }, [load, loadLockers]);

  const save = async () => {
    const mins = parseInt(input, 10);
    if (isNaN(mins) || mins < 0) {
      toast.error("Enter a valid number of minutes (0 = no limit)");
      return;
    }
    setBusy(true);
    try {
      const updated = await api.updateStationSettings(stationId, mins);
      setSettings(updated);
      toast.success(mins === 0 ? "Time limit removed" : `Time limit set to ${mins} minutes`);
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  if (error)    return <ApiError message={error} />;
  if (!settings) return <CenteredLoader label="Loading settings…" />;

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6 items-start">

        {/* Time limit setting card */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-brand-cyan" />
            </div>
            <div>
              <div className="font-display font-semibold">Locker time limit</div>
              <div className="text-xs text-muted-foreground">How long a user can keep a locker before it becomes overdue</div>
            </div>
          </div>

          <div className="mb-5 p-4 rounded-xl bg-muted/20 border border-border">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Current setting</div>
            <div className="font-display text-2xl font-bold text-brand-cyan">{settings.free_time}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Last updated: {new Date(settings.updated_at).toLocaleString()}
            </div>
          </div>

          <div className="flex-1">
            <div className="text-xs text-muted-foreground mb-1.5">New value (minutes)</div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="e.g. 30"
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-brand-cyan"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">min</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-1.5">
              Set to <span className="text-foreground font-mono">0</span> to remove the time limit entirely
            </div>
          </div>

          <Button onClick={save} disabled={busy} className="mt-4 w-full bg-gradient-brand text-primary-foreground border-0">
            {busy ? "Saving…" : "Save setting"}
          </Button>
        </div>

        {/* Locker grid card */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-violet/10 border border-brand-violet/20 flex items-center justify-center">
                <Grid3x3 className="w-5 h-5 text-brand-violet" />
              </div>
              <div>
                <div className="font-display font-semibold">Locker status</div>
                <div className="text-xs text-muted-foreground">{lockers?.length ?? 0} lockers at this station</div>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={loadLockers} className="border-border">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>

          {!lockers ? (
            <CenteredLoader label="Loading lockers…" />
          ) : lockers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No lockers found</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {lockers.map(l => {
                const color =
                  l.availability === "available"  ? "border-brand-cyan/40  bg-brand-cyan/5  text-brand-cyan"
                  : l.availability === "reserved"   ? "border-brand-violet/40 bg-brand-violet/5 text-brand-purple"
                  : l.availability === "overdue"    ? "border-red-500/40     bg-red-500/5     text-red-400"
                  : l.availability === "queue_hold" ? "border-amber-400/40   bg-amber-400/5   text-amber-400"
                  :                                   "border-border         bg-muted/20      text-muted-foreground";

                const stateLabel =
                  l.availability === "available"  ? "Free"
                  : l.availability === "reserved"   ? "In use"
                  : l.availability === "overdue"    ? "Overdue"
                  : l.availability === "queue_hold" ? "Held"
                  : l.state === "offline"           ? "Offline"
                  : l.state === "fault"             ? "Fault"
                  :                                   "Busy";

                return (
                  <div
                    key={l.locker_id}
                    className={`rounded-xl border p-3 flex flex-col gap-1 ${color}`}
                  >
                    <span className="font-mono font-bold text-sm leading-none">{l.locker_id}</span>
                    <span className="text-[10px] uppercase tracking-widest opacity-80">{stateLabel}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
            {[
              { color: "text-brand-cyan",   label: "Free" },
              { color: "text-brand-purple", label: "In use" },
              { color: "text-amber-400",    label: "Held" },
              { color: "text-red-400",      label: "Overdue" },
              { color: "text-muted-foreground", label: "Offline/Busy" },
            ].map(({ color, label }) => (
              <span key={label} className={`text-[10px] flex items-center gap-1 ${color}`}>
                <span className="w-2 h-2 rounded-sm bg-current opacity-60" /> {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────
// SHARED CHIP COMPONENT
// ─────────────────────────────────────────────────────────
function Chip({ label, value, color }: { label: string; value: number; color: "cyan" | "amber" | "red" | "muted" }) {
  const tone =
    color === "cyan"  ? "text-brand-cyan  border-brand-cyan/30  bg-brand-cyan/5"  :
    color === "amber" ? "text-amber-400   border-amber-400/30   bg-amber-400/5"   :
    color === "red"   ? "text-red-400     border-red-400/30     bg-red-400/5"     :
                        "text-muted-foreground border-border bg-card/40";
  return (
    <div className={`px-3 py-2 rounded-xl border ${tone}`}>
      <div className="text-[10px] uppercase tracking-widest opacity-70">{label}</div>
      <div className="font-display font-bold text-xl leading-none mt-0.5">{value}</div>
    </div>
  );
}

export default Admin;