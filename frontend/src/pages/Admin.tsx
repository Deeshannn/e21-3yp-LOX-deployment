import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { ApiError, CenteredLoader } from "@/components/Status";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PendingRequest, Station, api } from "@/lib/api";
import { Check, Mail, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";

const Admin = () => {
  const [stations, setStations] = useState<Station[] | null>(null);
  const [stationId, setStationId] = useState<string>("");
  const [requests, setRequests] = useState<PendingRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    api.listStations()
      .then(s => { setStations(s); if (s[0]) setStationId(s[0].station_id); })
      .catch(e => setError((e as Error).message));
  }, []);

  const loadRequests = useCallback(async () => {
    if (!stationId) return;
    setRequests(null);
    try {
      const r = await api.pendingRequests(stationId);
      setRequests(r);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [stationId]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

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

  return (
    <AppShell>
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card/60 border border-border text-xs uppercase tracking-widest text-brand-cyan mb-3">
            <ShieldCheck className="w-3.5 h-3.5" /> station admin
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">Membership requests</h1>
          <p className="text-sm text-muted-foreground mt-1">Approve or dismiss pending applications.</p>
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
      {!error && !requests && <CenteredLoader label="Fetching pending requests…" />}

      {requests && requests.length === 0 && (
        <div className="glass-card rounded-2xl p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-brand-soft border border-border mx-auto flex items-center justify-center mb-4">
            <Check className="w-7 h-7 text-brand-cyan" />
          </div>
          <h3 className="font-display text-xl font-semibold">All clear</h3>
          <p className="text-sm text-muted-foreground mt-1">No pending membership requests for this station.</p>
        </div>
      )}

      <div className="grid gap-4">
        {requests?.map((r, i) => (
          <article
            key={r.membership_id}
            className="glass-card rounded-2xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-brand flex items-center justify-center text-primary-foreground font-display font-bold">
                {r.user.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
              </div>
              <div>
                <div className="font-display font-semibold text-lg leading-tight">{r.user.name}</div>
                <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                  <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" /> {r.user.email}</span>
                  <span>· requested {new Date(r.joined_at).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => ignore(r)}
                disabled={busyId === r.membership_id}
                variant="outline"
                className="border-border"
              >
                <X className="w-4 h-4 mr-1" /> Ignore
              </Button>
              <Button
                onClick={() => accept(r)}
                disabled={busyId === r.membership_id}
                className="bg-gradient-brand text-primary-foreground border-0 glow-violet"
              >
                <Check className="w-4 h-4 mr-1" /> Accept
              </Button>
            </div>
          </article>
        ))}
      </div>
    </AppShell>
  );
};

export default Admin;
