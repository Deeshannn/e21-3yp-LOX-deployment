import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Lock, ShieldCheck, Building2, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { setAuthSession, setPendingSignupRole, type AdminRole, type SignupRole } from "@/lib/auth";
import { LoxMark } from "@/components/brand/LoxMark";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — LOX Smart Lockers" },
      { name: "description", content: "Sign in to the LOX smart locker management platform." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<SignupRole>("sub");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signInLabel = role === "sub" ? "Sub Admin" : "Super Admin";
  const signupLabel = role === "sub" ? "Create new Sub Admin account" : "Create new Super Admin account";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = await apiRequest<{
        token: string;
        token_type: string;
        expires_in: string;
        user: {
          user_id: string;
          name: string;
          email: string;
          role: AdminRole;
          station_id?: string | null;
          station_name?: string | null;
          locker_id?: string | null;
          status: string;
        };
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          role: role === "sub" ? "sub_admin" : "super_admin",
        }),
      });

      setAuthSession(payload, rememberMe);

      await router.navigate({
        to: payload.user.role === "super_admin" ? "/super" : "/admin/station",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignupNavigation = async () => {
    setPendingSignupRole(role);
    await router.navigate({ to: "/signup" });
  };

  return (
    <div className="min-h-screen bg-mesh grid lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-primary opacity-90" />
        <div className="absolute inset-0 bg-mesh opacity-30 mix-blend-overlay" />

        <div className="relative flex items-center gap-3 text-primary-foreground">
          <div className="grid h-11 w-11 place-items-center rounded-2xl glass">
            <LoxMark className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xl font-semibold tracking-tight">LOX</div>
            <div className="text-xs opacity-80">Smart locker management</div>
          </div>
        </div>

        <div className="relative space-y-6 text-primary-foreground">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight max-w-md">
            The connected locker network, finally easy to run.
          </h2>
          <p className="max-w-md text-primary-foreground/85">
            Real-time IoT visibility, member control, billing and analytics — for station owners and the LOX HQ team.
          </p>

          <div className="grid grid-cols-8 gap-1.5 max-w-md">
            {Array.from({ length: 32 }).map((_, i) => {
              const t = (i * 13) % 11;
              const cls =
                t < 6 ? "bg-white/80" : t < 9 ? "bg-white/25" : "bg-warning/80";
              return <div key={i} className={`aspect-square rounded-md ${cls}`} />;
            })}
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-4 text-primary-foreground">
          {[
            { k: "Stations", v: "240+" },
            { k: "Lockers online", v: "18,420" },
            { k: "Uptime", v: "99.98%" },
          ].map((s) => (
            <div key={s.k} className="rounded-2xl glass p-4">
              <div className="text-2xl font-semibold">{s.v}</div>
              <div className="text-xs opacity-80">{s.k}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 lg:hidden mb-8">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary shadow-glow">
              <LoxMark className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="font-semibold tracking-tight">LOX</div>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to continue managing your smart locker network.
          </p>

          {/* Role toggle */}
          <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-1.5 shadow-soft">
            {([
              { k: "sub", label: "Sub Admin", icon: Building2 },
              { k: "super", label: "Super Admin", icon: ShieldCheck },
            ] as const).map((opt) => {
              const active = role === opt.k;
              return (
                <button
                  key={opt.k}
                  type="button"
                  onClick={() => setRole(opt.k)}
                  className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-gradient-primary text-primary-foreground shadow-glow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <opt.icon className="h-4 w-4" />
                  {opt.label}
                </button>
              );
            })}
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-soft"
          >
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Password</label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="inline-flex items-center gap-2 text-muted-foreground">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                Remember me
              </label>
              <button type="button" className="text-primary hover:underline text-sm">
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-95 transition disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {loading ? `Signing in as ${signInLabel}` : `Sign in as ${signInLabel}`}
            </button>

            {error ? (
              <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center"><span className="bg-card px-3 text-xs text-muted-foreground">or</span></div>
            </div>

            <button
              type="button"
              onClick={handleSignupNavigation}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-4 py-3 text-sm font-semibold text-secondary-foreground hover:bg-muted transition"
            >
              {signupLabel}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
