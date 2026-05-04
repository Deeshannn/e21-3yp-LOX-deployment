import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin, Package, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";
import { ApiError, CenteredLoader } from "@/components/Status";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { MembershipStatus, Station, api } from "@/lib/api";
import { toast } from "sonner";

type StationRow = Station & { membership: MembershipStatus; busy?: boolean };

const Index = () => {
  const { user, userId } = useCurrentUser();
  const [stations, setStations] = useState<StationRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setError(null);
    setStations(null);
    api.listStations()
      .then(async (sts) => {
        if (!alive) return;
        if (!userId) {
          setStations(sts.map(s => ({ ...s, membership: "none" })));
          return;
        }
        const enriched = await Promise.all(
          sts.map(async (s) => {
            const { status } = await api.getMyMembershipStatus(userId, s.station_id);
            return { ...s, membership: status };
          })
        );
        if (alive) setStations(enriched);
      })
      .catch(e => alive && setError((e as Error).message));
    return () => { alive = false; };
  }, [userId]);

  const requestMembership = async (s: StationRow) => {
    if (!userId) { toast.error("Pick a user first (top-right)"); return; }
    setStations(prev => prev?.map(x => x.station_id === s.station_id ? { ...x, busy: true } : x) || null);
    try {
      await api.requestMembership(userId, s.station_id);
      setStations(prev => prev?.map(x => x.station_id === s.station_id ? { ...x, membership: "pending", busy: false } : x) || null);
      toast.success(`Request sent to ${s.name}`, { description: "Pending station admin approval." });
    } catch (e) {
      setStations(prev => prev?.map(x => x.station_id === s.station_id ? { ...x, busy: false } : x) || null);
      toast.error((e as Error).message);
    }
  };

  return (
    <AppShell>
      <Hero user={user?.name} />

      <section className="mt-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-bold">Available stations</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Request membership or jump straight in if you're already a member.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <span className="pulse-dot text-brand-cyan" /> live network
          </div>
        </div>

        {error && <ApiError message={error} />}
        {!error && !stations && <CenteredLoader label="Fetching stations…" />}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {stations?.map((s, i) => (
            <StationCard
              key={s.station_id}
              s={s}
              hasUser={!!userId}
              onRequest={() => requestMembership(s)}
              style={{ animationDelay: `${i * 70}ms` }}
            />
          ))}
        </div>
      </section>
    </AppShell>
  );
};

function Hero({ user }: { user?: string }) {
  return (
    <section className="relative overflow-hidden rounded-3xl glass-card p-8 md:p-12 animate-scale-in">
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gradient-brand opacity-30 blur-3xl animate-spin-slow" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-gradient-bolt opacity-20 blur-3xl" />

      <div className="relative max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card/60 border border-border text-xs uppercase tracking-widest text-brand-cyan mb-5">
          <Sparkles className="w-3.5 h-3.5" /> electric storage
        </div>
        <h1 className="font-display text-4xl md:text-6xl font-bold leading-[1.05]">
          Lock it. <span className="text-gradient-brand">Light it up.</span>
        </h1>
        <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-xl">
          A real-time smart locker network across stations. Pick a user{user ? <> — <span className="text-foreground font-medium">{user}</span> active</> : ""}, request membership, and reserve a locker in seconds.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <a href="#stations" className="inline-flex">
            <Button size="lg" className="bg-gradient-brand hover:opacity-95 text-primary-foreground border-0 glow-violet">
              Explore stations <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </a>
          <Link to="/admin">
            <Button size="lg" variant="outline" className="border-border bg-card/40 backdrop-blur">
              Admin dashboard
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function StationCard({
  s, hasUser, onRequest, style,
}: { s: StationRow; hasUser: boolean; onRequest: () => void; style?: React.CSSProperties }) {
  const empty = s.locker_count === 0;
  return (
    <article
      className="glass-card rounded-2xl p-5 flex flex-col gap-4 hover:-translate-y-1 transition-transform duration-300 animate-fade-in"
      style={style}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold leading-tight">{s.name}</h3>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" /> {s.main_town}
          </div>
        </div>
        <div className="shrink-0 w-11 h-11 rounded-xl bg-gradient-brand-soft border border-border flex items-center justify-center">
          <Zap className="w-5 h-5 text-brand-cyan" />
        </div>
      </header>

      <div className="flex items-center gap-3 text-sm">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/40 border border-border">
          <Package className="w-3.5 h-3.5 text-brand-cyan" />
          <span className="font-medium">{s.locker_count}</span>
          <span className="text-muted-foreground">lockers</span>
        </div>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">{s.station_id}</span>
      </div>

      <div className="mt-auto pt-1">
        {s.membership === "member" ? (
          <Link to={`/stations/${s.station_id}`}>
            <Button className="w-full bg-gradient-brand text-primary-foreground border-0 glow-blue">
              View station <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        ) : s.membership === "pending" ? (
          <Button disabled className="w-full bg-muted/50 text-muted-foreground border border-border">
            <span className="pulse-dot text-brand-purple mr-2" /> Pending approval
          </Button>
        ) : (
          <Button
            onClick={onRequest}
            disabled={!hasUser || s.busy || empty}
            variant="outline"
            className="w-full border-brand-violet/50 hover:bg-gradient-brand-soft hover:text-foreground"
          >
            {empty ? "No lockers yet" : s.busy ? "Sending…" : "Request membership"}
          </Button>
        )}
      </div>
    </article>
  );
}

export default Index;
