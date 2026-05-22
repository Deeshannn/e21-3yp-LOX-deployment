import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Package, Upload, ArrowLeft, Building2, ShieldCheck, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { consumePendingSignupRole, setPendingSignupRole, type SignupRole } from "@/lib/auth";

type StationOption = {
  station_id: string;
  name: string;
  main_town?: string;
  district?: string;
};

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Become a Sub Admin — LOX" },
      { name: "description", content: "Apply to operate a LOX smart locker station." },
    ],
  }),
  component: SignupPage,
});

function Field({
  label,
  type = "text",
  placeholder,
  full = false,
  value,
  onChange,
  min,
  children,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  full?: boolean;
  value?: string | number;
  onChange?: (value: string) => void;
  min?: string | number;
  children?: React.ReactNode;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children ?? (
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          min={min}
          onChange={(event) => onChange?.(event.target.value)}
          className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
        />
      )}
    </div>
  );
}

function SignupPage() {
  const router = useRouter();
  const initialRole = useMemo<SignupRole>(() => consumePendingSignupRole(), []);
  const [role, setRole] = useState<SignupRole>(initialRole);
  const [stations, setStations] = useState<StationOption[]>([]);
  const [loadingStations, setLoadingStations] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    nicNumber: "",
    age: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    stationId: "",
    stationName: "",
    lockerId: "",
    documentName: "",
  });

  useEffect(() => {
    setPendingSignupRole(role);
  }, [role]);

  useEffect(() => {
    let active = true;

    const loadStations = async () => {
      setLoadingStations(true);

      try {
        const response = await apiRequest<{ stations: StationOption[] }>("/stations");
        if (!active) return;
        setStations(response.stations || []);
      } catch {
        if (!active) return;
        setStations([]);
      } finally {
        if (active) {
          setLoadingStations(false);
        }
      }
    };

    void loadStations();

    return () => {
      active = false;
    };
  }, []);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const selectedStation = stations.find((station) => station.station_id === form.stationId);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (form.password !== form.confirmPassword) {
      setErrorMessage("Password and confirm password do not match.");
      return;
    }

    setSubmitting(true);

    try {
      await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          role: role === "sub" ? "sub_admin" : "super_admin",
          full_name: form.fullName,
          nic_number: form.nicNumber,
          age: Number(form.age),
          email: form.email,
          phone: form.phone,
          password: form.password,
          password_confirm: form.confirmPassword,
          station_id: role === "sub" ? form.stationId : undefined,
          station_name: role === "sub" ? selectedStation?.name || form.stationName : undefined,
          locker_id: role === "sub" ? form.lockerId : undefined,
          document_name: role === "sub" ? form.documentName || "Business verification document" : undefined,
        }),
      });

      setSuccessMessage(
        role === "super"
          ? "Super admin request submitted. The current super admin will review it from notifications."
          : "Sub admin request submitted. The current super admin will review the locker assignment request."
      );
      setForm({
        fullName: "",
        nicNumber: "",
        age: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
        stationId: "",
        stationName: "",
        lockerId: "",
        documentName: "",
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Request submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const title = role === "super" ? "Request a Super Admin account" : "Apply to run a locker station";
  const description =
    role === "super"
      ? "Submit your identity details. A current LOX super admin must approve the request before you can sign in."
      : "Choose one active station from the LOX catalog. Your approved account will belong to that station only.";

  return (
    <div className="min-h-screen bg-mesh py-10 px-4">
      <div className="mx-auto max-w-3xl">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>

        <div className="mt-6 rounded-3xl border border-border bg-card shadow-soft overflow-hidden">
          <div className="relative p-8 bg-gradient-primary text-primary-foreground">
            <div className="absolute inset-0 bg-mesh opacity-30 mix-blend-overlay" />
            <div className="relative flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl glass">
                {role === "super" ? <ShieldCheck className="h-5 w-5" /> : <Package className="h-5 w-5" />}
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider opacity-80">LOX Network</div>
                <div className="text-xl font-semibold">{title}</div>
              </div>
            </div>
            <p className="relative mt-3 max-w-xl text-sm text-primary-foreground/85">{description}</p>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 p-8 sm:grid-cols-2">
            <Field label="Full name" placeholder="Aarav Mehta" value={form.fullName} onChange={(value) => updateField("fullName", value)} />
            <Field label="NIC Number" placeholder="200012345678" value={form.nicNumber} onChange={(value) => updateField("nicNumber", value)} />
            <Field label="Age" type="number" placeholder="29" min={18} value={form.age} onChange={(value) => updateField("age", value)} />
            <Field label="Email" type="email" placeholder="aarav@station.com" value={form.email} onChange={(value) => updateField("email", value)} />
            <Field label="Phone number" placeholder="+91 98 0000 0000" value={form.phone} onChange={(value) => updateField("phone", value)} />
            <Field label="Password" type="password" placeholder="••••••••" value={form.password} onChange={(value) => updateField("password", value)} />
            <Field label="Confirm password" type="password" placeholder="••••••••" value={form.confirmPassword} onChange={(value) => updateField("confirmPassword", value)} />

            {role === "sub" ? (
              <>
                <Field label="Locker station" full>
                  <div className="mt-1.5 grid gap-2 sm:grid-cols-[1fr_auto]">
                    <select
                      value={form.stationId}
                      onChange={(event) => {
                        const nextStation = stations.find((station) => station.station_id === event.target.value)
                        setForm((current) => ({
                          ...current,
                          stationId: event.target.value,
                          stationName: nextStation?.name || "",
                        }))
                      }}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
                    >
                      <option value="">Select a locker station</option>
                      {stations.map((station) => (
                        <option key={station.station_id} value={station.station_id}>
                          {station.name} · {station.station_id}
                        </option>
                      ))}
                    </select>
                    <div className="rounded-xl border border-border bg-secondary px-3 py-2.5 text-xs text-muted-foreground">
                      {loadingStations
                        ? "Loading stations…"
                        : selectedStation
                          ? `${selectedStation.name} selected for this sub-admin account`
                          : "Select the one station this sub-admin should belong to"}
                    </div>
                  </div>
                </Field>
                <Field label="Locker ID" placeholder="LK-024" value={form.lockerId} onChange={(value) => updateField("lockerId", value)} />
                <Field label="Verification document" placeholder="GST / business license name" full value={form.documentName} onChange={(value) => updateField("documentName", value)} />
              </>
            ) : (
              <Field label="Request note" full>
                <div className="mt-1.5 rounded-xl border border-dashed border-border bg-secondary px-4 py-5">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-card shadow-soft">
                      <Upload className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">Identity verification only</div>
                      <div className="text-xs text-muted-foreground">Super admin access is granted after the current super admin approves this request.</div>
                    </div>
                  </div>
                </div>
              </Field>
            )}

            <div className="sm:col-span-2 flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground max-w-sm">
                {role === "super"
                  ? "Super admin requests are reviewed manually. You can sign in only after approval."
                  : "By submitting, you agree to the LOX operator terms. We'll email you once your station is approved."}
              </p>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-95 transition disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {submitting ? "Submitting request" : role === "super" ? "Submit super admin request" : "Submit request"}
              </button>
            </div>

            {successMessage ? (
              <div className="sm:col-span-2 flex items-start gap-2 rounded-xl border border-success/20 bg-success/10 px-3 py-2 text-xs text-success">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            ) : null}

            {errorMessage ? (
              <div className="sm:col-span-2 flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            ) : null}
          </form>
        </div>
      </div>
    </div>
  );
}
