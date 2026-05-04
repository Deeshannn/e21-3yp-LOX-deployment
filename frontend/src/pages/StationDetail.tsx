import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Clock, DoorClosed, DoorOpen, Lock, LockOpen, MapPin, Package, RefreshCw, Users, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { LockerCube } from "@/components/LockerCube";
import { ApiError, CenteredLoader } from "@/components/Status";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Locker, QueueStatus, Station, StationLockers, api } from "@/lib/api";
import { toast } from "sonner";

type QueueNotification = {
  has_notification: boolean;
  offered_locker?: string;
  offer_expires_at?: string;
  minutes_remaining?: number;
  seconds_remaining?: number;
  in_queue?: boolean;
  your_position?: number;
  queue_size?: number;
  message: string;
};

const StationDetail = () => {
  const { stationId = "" } = useParams();
  const { user, userId } = useCurrentUser();

  const [station, setStation]           = useState<Station | null>(null);
  const [data, setData]                 = useState<StationLockers | null>(null);
  const [queue, setQueue]               = useState<QueueStatus | null>(null);
  const [notification, setNotification] = useState<QueueNotification | null>(null);
  const [selected, setSelected]         = useState<string | null>(null);
  const [error, setError]               = useState<string | null>(null);
  const [busy, setBusy]                 = useState<string | null>(null);

  const myLocker: Locker | null =
    data?.my_reservation ||
    data?.lockers.find(l => l.availability === "reserved" && (l as any).reserved_by === userId) ||
    null;

  const reload = useCallback(async () => {
    if (!userId) return;
    try {
      const [d, q, n] = await Promise.all([
        api.stationLockers(stationId, userId),
        api.queueStatus(stationId, userId).catch(() => ({ in_queue: false } as QueueStatus)),
        api.queueNotification(stationId, userId).catch(() => null),
      ]);
      setData(d);
      setQueue(q);
      setNotification(n);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [stationId, userId]);

  useEffect(() => {
    let alive = true;
    api.listStations()
      .then(s => alive && setStation(s.find(x => x.station_id === stationId) || null))
      .catch(() => {});
    return () => { alive = false; };
  }, [stationId]);

  useEffect(() => { reload(); }, [reload]);

  // Auto-select the offered locker when peek user gets a notification
  useEffect(() => {
    if (notification?.has_notification && notification.offered_locker) {
      setSelected(notification.offered_locker);
    }
  }, [notification?.has_notification, notification?.offered_locker]);

  // Poll notification every 10 seconds when user is in queue
  useEffect(() => {
    if (!userId || !queue?.in_queue) return;
    const id = setInterval(async () => {
      const n = await api.queueNotification(stationId, userId).catch(() => null);
      setNotification(n);
    }, 10000);
    return () => clearInterval(id);
  }, [userId, stationId, queue?.in_queue]);

  const reserve = async () => {
    if (!userId || !selected) return;
    setBusy("reserve");
    try {
      await api.reserveLocker(stationId, userId, selected);
      toast.success(`Reserved ${selected}`);
      setSelected(null);
      await reload();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  };

  const release = async (lockerId: string) => {
    if (!userId) return;
    setBusy("release");
    try {
      await api.releaseLocker(stationId, userId, lockerId);
      toast.success(`Released ${lockerId}`);
      await reload();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  };

  const unlockLocker = async (lockerId: string) => {
    if (!userId) return;
    setBusy("unlock");
    try {
      await api.unlockLocker(stationId, userId, lockerId);
      toast.success(`Locker ${lockerId} unlocked`);
      await reload();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  };

  const joinQueue = async () => {
    if (!userId) return;
    setBusy("queue");
    try {
      await api.joinQueue(stationId, userId);
      toast.success("Joined the smart queue");
      await reload();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  };

  const leaveQueue = async () => {
    if (!userId) return;
    setBusy("queue");
    try {
      await api.leaveQueue(stationId, userId);
      toast("Left the queue");
      await reload();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  };

  if (!userId) {
    return (
      <AppShell>
        <div className="glass-card rounded-2xl p-8 text-center">
          <h2 className="font-display text-xl mb-2">Pick a user first</h2>
          <p className="text-sm text-muted-foreground">Use the user switcher in the top-right to act as someone.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to stations
      </Link>

      {/* Reserved banner */}
      {myLocker && (
        <ReservedBanner
          locker={myLocker}
          onRelease={() => release(myLocker.locker_id)}
          onUnlock={() => unlockLocker(myLocker.locker_id)}
          busy={busy}
        />
      )}

      {/* Station header */}
      <header className="glass-card rounded-3xl p-6 md:p-8 mb-6 animate-scale-in">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-brand-cyan font-mono">{stationId}</div>
            <h1 className="font-display text-3xl md:text-4xl font-bold mt-1">
              {station?.name || "Station"}
            </h1>
            <div className="text-sm text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {station?.address || station?.main_town || "—"}</span>
              <span className="inline-flex items-center gap-1.5"><Users className="w-4 h-4" /> Acting as <span className="text-foreground">{user?.name}</span></span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatChip color="cyan"   label="Available"   value={data?.available_count ?? 0} />
            <StatChip color="violet" label="Reserved"    value={data?.reserved_count ?? 0} />
            <StatChip color="muted"  label="Offline"     value={data?.unavailable_count ?? 0} />
            <Button size="icon" variant="outline" onClick={reload} className="border-border bg-card/40">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {error && <ApiError message={error} />}
      {!error && !data && <CenteredLoader label="Fetching lockers…" />}

      {/* Locker grid */}
      {data && (
        <section className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {data.lockers.map((l) => (
            <LockerCube
              key={l.locker_id}
              locker={l}
              isMine={myLocker?.locker_id === l.locker_id}
              selected={selected === l.locker_id}
              onClick={() => {
                if (myLocker?.locker_id === l.locker_id) return;
                // Peek queue user can click their queue_hold locker
                const isPeekLocker =
                  notification?.has_notification &&
                  notification.offered_locker === l.locker_id &&
                  l.availability === "queue_hold";
                if (!isPeekLocker && l.availability !== "available") {
                  toast.error(
                    l.availability === "queue_hold"
                      ? `Locker ${l.locker_id} is held for the queue peek user`
                      : `Locker ${l.locker_id} is ${l.availability}`
                  );
                  return;
                }
                setSelected(prev => prev === l.locker_id ? null : l.locker_id);
              }}
            />
          ))}
        </section>
      )}

      {/* Action bar */}
      {selected && !myLocker && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 glass-card rounded-2xl px-4 py-3 flex items-center gap-3 animate-scale-in">
          <Package className="w-4 h-4 text-brand-cyan" />
          <span className="text-sm">Reserve <span className="font-mono font-semibold">{selected}</span>?</span>
          <Button onClick={reserve} disabled={busy === "reserve"} className="bg-gradient-brand text-primary-foreground border-0">
            {busy === "reserve" ? "Reserving…" : "Confirm"}
          </Button>
          <Button onClick={() => setSelected(null)} variant="ghost" size="icon"><X className="w-4 h-4" /></Button>
        </div>
      )}

      {/* Smart Queue */}
      <SmartQueue
        queue={queue}
        notification={notification}
        onJoin={joinQueue}
        onLeave={leaveQueue}
        busy={busy === "queue"}
        disabled={!!myLocker}
      />
    </AppShell>
  );
};

function StatChip({ color, label, value }: { color: "cyan" | "violet" | "muted"; label: string; value: number }) {
  const tone =
    color === "cyan" ? "text-brand-cyan border-brand-cyan/40"
    : color === "violet" ? "text-brand-purple border-brand-violet/40"
    : "text-muted-foreground border-border";
  return (
    <div className={`px-3 py-1.5 rounded-lg border bg-card/40 backdrop-blur ${tone}`}>
      <div className="text-[10px] uppercase tracking-widest opacity-80">{label}</div>
      <div className="font-display font-bold text-lg leading-none mt-0.5">{value}</div>
    </div>
  );
}

function ReservedBanner({
  locker, onRelease, onUnlock, busy,
}: {
  locker: Locker;
  onRelease: () => void;
  onUnlock: () => void;
  busy: string | null;
}) {
  const canUnlock = locker.state === "lock_close";

  return (
    <div className="relative overflow-hidden glass-card rounded-2xl p-5 mb-6 border-emerald-400/30 animate-fade-in">
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-brand-cyan/10 to-brand-violet/10" />
      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-bolt flex items-center justify-center glow-blue">
            <Package className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-emerald-300">Your locker</div>
            <div className="font-display text-xl font-bold">{locker.locker_id}</div>
            <div className="text-xs text-muted-foreground">Last update: {new Date(locker.last_reported_at).toLocaleString()}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status pills */}
          <StatusPill
            icon={locker.lock_state === "locked" ? <Lock className="w-3.5 h-3.5" /> : <LockOpen className="w-3.5 h-3.5" />}
            label={`Lock: ${locker.lock_state}`}
            active={locker.lock_state === "unlocked"}
          />
          <StatusPill
            icon={locker.door_state === "closed" ? <DoorClosed className="w-3.5 h-3.5" /> : <DoorOpen className="w-3.5 h-3.5" />}
            label={`Door: ${locker.door_state}`}
            active={locker.door_state === "open"}
          />

          {/* Unlock symbol button — lock happens automatically via hardware after door closes */}
          <button
            onClick={onUnlock}
            disabled={!canUnlock || busy === "unlock"}
            title={canUnlock ? "Unlock locker" : "Unlock only available when locker is locked"}
            className={`p-2.5 rounded-xl border transition-all ${
              canUnlock
                ? "border-brand-cyan/40 text-brand-cyan hover:bg-brand-cyan/10 cursor-pointer"
                : "border-border text-muted-foreground/30 cursor-not-allowed"
            }`}
          >
            {busy === "unlock"
              ? <RefreshCw className="w-5 h-5 animate-spin" />
              : <LockOpen className="w-5 h-5" />
            }
          </button>

          {/* Release button */}
          <Button
            onClick={onRelease}
            disabled={!!busy}
            variant="outline"
            className="border-destructive/50 text-destructive hover:bg-destructive/10"
          >
            {busy === "release" ? "Releasing…" : "Release"}
          </Button>
        </div>
      </div>

      {/* State hint */}
      <div className="relative mt-3 text-[11px] text-muted-foreground">
        {locker.state === "lock_close"   && "🔒 Locker is locked — press unlock to open it"}
        {locker.state === "unlock_close" && "🔓 Door is closed — open the door, it will auto-lock when you close it"}
        {locker.state === "unlock_open"  && "🚪 Door is open — close the door to auto-lock"}
        {locker.state === "fault"        && "⚠️ Hardware fault detected"}
      </div>
    </div>
  );
}

function StatusPill({ icon, label, active }: { icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border
      ${active ? "border-brand-cyan/50 text-brand-cyan bg-brand-cyan/5" : "border-border text-muted-foreground bg-card/40"}`}>
      {icon}{label}
    </span>
  );
}

function SmartQueue({
  queue, notification, onJoin, onLeave, busy, disabled,
}: {
  queue: QueueStatus | null;
  notification: QueueNotification | null;
  onJoin: () => void;
  onLeave: () => void;
  busy: boolean;
  disabled: boolean;
}) {
  const [countdown, setCountdown] = useState<{ m: number; s: number } | null>(null);

  // Live countdown — ticks every second when peek user has an active offer
  useEffect(() => {
    if (!notification?.has_notification || !notification.offer_expires_at) {
      setCountdown(null);
      return;
    }
    const tick = () => {
      const ms = new Date(notification.offer_expires_at!).getTime() - Date.now();
      if (ms <= 0) { setCountdown({ m: 0, s: 0 }); return; }
      setCountdown({ m: Math.floor(ms / 60000), s: Math.floor((ms % 60000) / 1000) });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [notification]);

  const isPeek = notification?.has_notification === true;

  return (
    <section className="mt-10 glass-card rounded-3xl p-6 md:p-8 relative overflow-hidden">
      <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-gradient-brand opacity-20 blur-3xl" />
      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-card/60 border border-border text-[10px] uppercase tracking-widest text-brand-cyan mb-2">
            <Users className="w-3 h-3" /> smart queue
          </div>
          <h2 className="font-display text-2xl font-bold">Get in line for the next free locker</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isPeek
              ? `Locker ${notification!.offered_locker} is available for you — reserve it before time runs out!`
              : queue?.in_queue
              ? "You're in the queue. We'll notify you the moment a locker frees up."
              : disabled
              ? "You already have a locker. Release it before joining the queue."
              : "All lockers full? Hop in the queue and we'll handle the rest."}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {queue?.in_queue ? (
            <>
              {isPeek && countdown ? (
                /* Peek user — show offered locker + live countdown */
                <div className="flex flex-col items-center gap-1 min-w-[120px]">
                  <div className="text-[10px] uppercase tracking-widest text-amber-400 font-mono">Locker offered</div>
                  <div className="font-display text-3xl font-bold text-amber-400">{notification!.offered_locker}</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className={`font-mono font-bold text-xl tabular-nums ${
                      countdown.m === 0 ? "text-red-400" : "text-amber-400"
                    }`}>
                      {String(countdown.m).padStart(2, "0")}:{String(countdown.s).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">remaining</div>
                </div>
              ) : (
                /* Waiting user — show queue position */
                <div className="text-center min-w-[80px]">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Position</div>
                  <div className="font-display text-4xl font-bold text-gradient-brand">
                    #{queue.position ?? "—"}
                  </div>
                  {queue.total_in_queue ? (
                    <div className="text-xs text-muted-foreground mt-1">of {queue.total_in_queue} waiting</div>
                  ) : null}
                </div>
              )}
              <Button onClick={onLeave} disabled={busy} variant="outline" className="border-border">
                {busy ? "Leaving…" : "Leave queue"}
              </Button>
            </>
          ) : (
            <Button onClick={onJoin} disabled={busy || disabled} className="bg-gradient-brand text-primary-foreground border-0 glow-violet">
              {busy ? "Joining…" : "Join smart queue"}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

export default StationDetail;