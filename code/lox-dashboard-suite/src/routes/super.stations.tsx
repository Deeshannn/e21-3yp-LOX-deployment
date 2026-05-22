import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  Hash,
  Layers3,
  Loader2,
  MapPin,
  PlusCircle,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { LockerGrid, LockerLegend } from "@/components/lox/LockerGrid";
import { apiRequest } from "@/lib/api";
import { getAuthSession, clearAuthSession } from "@/lib/auth";

export const Route = createFileRoute("/super/stations")({
  head: () => ({ meta: [{ title: "Create a Locker Station — LOX HQ" }] }),
  component: StationsPage,
});

type StationApiRecord = {
  station_id: string;
  name: string;
  status: "active" | "maintenance" | "offline";
  locker_count: number;
  estimated_members: number;
  notes: string;
  location?: {
    address: string;
    city: string;
    district: string;
    latitude: number;
    longitude: number;
  };
  main_town?: string;
  address?: string;
  district?: string;
  station_db_uri?: string;
  last_heartbeat_at?: string;
};

type StationViewRecord = StationApiRecord & {
  location: {
    address: string;
    city: string;
    district: string;
    latitude: number;
    longitude: number;
  };
};

type StationListResponse = {
  stations: StationApiRecord[];
};

type StationFormState = {
  station_id: string;
  name: string;
  locker_count: string;
  estimated_members: string;
  address: string;
  city: string;
  district: string;
  latitude: string;
  longitude: string;
  notes: string;
};

const emptyForm: StationFormState = {
  station_id: "",
  name: "",
  locker_count: "",
  estimated_members: "",
  address: "",
  city: "",
  district: "",
  latitude: "",
  longitude: "",
  notes: "",
};

const buildFormFromStation = (station: StationApiRecord): StationFormState => ({
  station_id: station.station_id,
  name: station.name,
  locker_count: String(station.locker_count),
  estimated_members: String(station.estimated_members),
  address: station.location?.address ?? station.address ?? "",
  city: station.location?.city ?? station.main_town ?? "",
  district: station.location?.district ?? station.district ?? "",
  latitude: String(station.location?.latitude ?? 0),
  longitude: String(station.location?.longitude ?? 0),
  notes: station.notes,
});

const stationLocationLabel = (station: StationApiRecord) =>
  station.location
    ? `${station.location.city} · ${station.location.district}`
    : `${station.main_town || station.address || "Unknown"} · ${station.district || "Unknown"}`;

const normalizeStation = (station: StationApiRecord): StationViewRecord => ({
  ...station,
  locker_count: station.locker_count ?? 0,
  estimated_members: station.estimated_members ?? 0,
  location: station.location || {
    address: station.address || "",
    city: station.main_town || "",
    district: station.district || "",
    latitude: 0,
    longitude: 0,
  },
});

const buildDraftStation = (form: StationFormState): StationApiRecord | null => {
  if (!form.station_id && !form.name && !form.locker_count && !form.estimated_members) {
    return null;
  }

  return {
    station_id: form.station_id || "LX-DRAFT-00",
    name: form.name || "New locker station",
    status: "active",
    locker_count: Math.max(1, Number(form.locker_count) || 1),
    estimated_members: Math.max(0, Number(form.estimated_members) || 0),
    notes: form.notes || "Draft station setup",
    location: {
      address: form.address || "Location to be confirmed",
      city: form.city || "City",
      district: form.district || "District",
      latitude: Number(form.latitude) || 0,
      longitude: Number(form.longitude) || 0,
    },
  };
};

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  full = false,
  disabled = false,
  children,
}: {
  label: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  type?: string;
  full?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <label className={full ? "sm:col-span-2" : ""}>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      {children ?? (
        <input
          type={type}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder={placeholder}
          className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60"
        />
      )}
    </label>
  );
}

function StationsPage() {
  const router = useRouter();
  const session = useMemo(() => getAuthSession(), []);
  const [stations, setStations] = useState<StationApiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [editingStationId, setEditingStationId] = useState<string | null>(null);
  const [form, setForm] = useState<StationFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "info" | "error"; text: string } | null>(null);

  useEffect(() => {
    let active = true;

    const loadStations = async () => {
      if (!session?.token) {
        clearAuthSession();
        await router.navigate({ to: "/login" });
        return;
      }

      setLoading(true);
      try {
        const response = await apiRequest<StationListResponse>("/stations", {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        });

        if (!active) return;
        setStations((response.stations || []).map(normalizeStation));
      } catch (err) {
        if (!active) return;
        setStations([]);
        setFeedback({ kind: "error", text: err instanceof Error ? err.message : "Failed to load stations" });
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadStations();

    return () => {
      active = false;
    };
  }, [router, session?.token]);

  useEffect(() => {
    if (!stations.length) {
      return;
    }

    if (!editingStationId) {
      return;
    }

    const nextSelected = stations.find((station) => station.station_id === editingStationId);
    if (!nextSelected) {
      setEditingStationId(stations[0].station_id);
      setForm(buildFormFromStation(stations[0]));
    }
  }, [stations, editingStationId]);

  const safeStations = useMemo(() => stations.map(normalizeStation), [stations]);

  const filteredStations = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return safeStations;

    return safeStations.filter((station) => {
      const haystack = [
        station.station_id,
        station.name,
        station.location.address,
        station.location.city,
        station.location.district,
        station.notes,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [safeStations, query]);

  const selectedStation = useMemo(
    () => (editingStationId ? safeStations.find((station) => station.station_id === editingStationId) ?? null : null),
    [safeStations, editingStationId]
  );
  const draftStation = useMemo(() => buildDraftStation(form), [form]);
  const previewStation = selectedStation ?? draftStation;
  const lockerPreview = useMemo(
    () => (previewStation ? Array.from({ length: previewStation.locker_count }, (_, index) => ({ id: String(index + 1).padStart(2, "0"), status: (index % 9 < 4 ? "available" : index % 9 < 7 ? "occupied" : index % 9 < 8 ? "reserved" : "faulty") as const })) : []),
    [previewStation]
  );

  const totalStations = safeStations.length;
  const totalLockers = safeStations.reduce((sum, station) => sum + station.locker_count, 0);
  const totalMembers = safeStations.reduce((sum, station) => sum + station.estimated_members, 0);

  const pickStation = (station: StationApiRecord) => {
    setEditingStationId(station.station_id);
    setForm(buildFormFromStation(station));
    setFeedback({ kind: "info", text: `Loaded ${station.name} for editing.` });
  };

  const resetForm = () => {
    setEditingStationId(null);
    setForm(emptyForm);
    setFeedback({ kind: "info", text: "Draft mode is ready. Create a new station or search an existing one to update it." });
  };

  const saveStation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (!session?.token) {
      setFeedback({ kind: "error", text: "Your super admin session is missing. Please sign in again." });
      return;
    }

    const stationId = form.station_id.trim().toUpperCase();
    const name = form.name.trim();
    const address = form.address.trim();
    const city = form.city.trim();
    const district = form.district.trim();
    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    const lockerCount = Number(form.locker_count);
    const estimatedMembers = Number(form.estimated_members);

    if (!stationId || !name || !address || !city || !district) {
      setFeedback({ kind: "error", text: "Station ID, name, and location fields are required." });
      return;
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setFeedback({ kind: "error", text: "Latitude and longitude must be valid numbers." });
      return;
    }

    if (!Number.isFinite(lockerCount) || lockerCount <= 0) {
      setFeedback({ kind: "error", text: "Locker count must be a positive number." });
      return;
    }

    if (!Number.isFinite(estimatedMembers) || estimatedMembers < 0) {
      setFeedback({ kind: "error", text: "Approximate member count must be zero or greater." });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        station_id: stationId,
        name,
        locker_count: lockerCount,
        estimated_members: estimatedMembers,
        notes: form.notes.trim(),
        location: {
          address,
          city,
          district,
          latitude,
          longitude,
        },
      };

      const response = editingStationId
        ? await apiRequest<{ station: StationApiRecord }>(`/stations/${editingStationId}`, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${session.token}`,
            },
            body: JSON.stringify(payload),
          })
        : await apiRequest<{ station: StationApiRecord }>("/stations", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.token}`,
            },
            body: JSON.stringify(payload),
          });

      const nextStations = await apiRequest<StationListResponse>("/stations", {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });

        setStations((nextStations.stations || []).map(normalizeStation));
      setEditingStationId(response.station.station_id);
      setForm(buildFormFromStation(response.station));
      setFeedback({ kind: "success", text: `${response.station.name} is now available in the sub-admin station list.` });
    } catch (err) {
      setFeedback({ kind: "error", text: err instanceof Error ? err.message : "Unable to save station" });
    } finally {
      setSaving(false);
    }
  };

  const deleteStation = async () => {
    if (!editingStationId) {
      return;
    }

    if (!session?.token) {
      setFeedback({ kind: "error", text: "Your super admin session is missing. Please sign in again." });
      return;
    }

    const confirmed = window.confirm(`Delete station ${editingStationId}? This hides it from active station lists and sub-admin signup.`);
    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setFeedback(null);

    try {
      await apiRequest<{ message: string; station_id: string }>(`/stations/${editingStationId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });

      const nextStations = await apiRequest<StationListResponse>("/stations", {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });

      setStations((nextStations.stations || []).map(normalizeStation));
      resetForm();
      setFeedback({ kind: "success", text: `${editingStationId} deleted successfully.` });
    } catch (err) {
      setFeedback({ kind: "error", text: err instanceof Error ? err.message : "Unable to delete station" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppShell role="super" title="Create a Locker Station">
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-soft">
            <div className="absolute inset-0 bg-linear-to-br from-primary/10 via-transparent to-info/10" />
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                  <Sparkles className="h-3.5 w-3.5" /> Station builder
                </div>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  Create, update, and publish every locker station from one place.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Stations created here are saved in the master database, provisioned with their own station database, and immediately available in the sub-admin signup flow.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <MiniStat label="Stations" value={String(totalStations)} icon={Building2} />
                <MiniStat label="Lockers" value={String(totalLockers)} icon={Layers3} />
                <MiniStat label="Members" value={String(totalMembers)} icon={Users} />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">Station details</h3>
                <p className="text-xs text-muted-foreground">Use this form to create a new station or update an existing one.</p>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
              >
                <RotateCcw className="h-4 w-4" /> New station
              </button>
            </div>

            <form onSubmit={saveStation} className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Locker station name" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} placeholder="Kochi Central" />
              <Field
                label="Locker station ID"
                value={form.station_id}
                onChange={(value) => setForm((current) => ({ ...current, station_id: value }))}
                placeholder="LX-KCH-01"
                disabled={Boolean(editingStationId)}
              />
              <Field label="How many lockers" type="number" value={form.locker_count} onChange={(value) => setForm((current) => ({ ...current, locker_count: value }))} placeholder="72" />
              <Field label="Approximate members" type="number" value={form.estimated_members} onChange={(value) => setForm((current) => ({ ...current, estimated_members: value }))} placeholder="180" />
              <Field label="Latitude" type="number" value={form.latitude} onChange={(value) => setForm((current) => ({ ...current, latitude: value }))} placeholder="9.9312" />
              <Field label="Longitude" type="number" value={form.longitude} onChange={(value) => setForm((current) => ({ ...current, longitude: value }))} placeholder="76.2673" />
              <Field label="City" value={form.city} onChange={(value) => setForm((current) => ({ ...current, city: value }))} placeholder="Ernakulam" />
              <Field label="District" value={form.district} onChange={(value) => setForm((current) => ({ ...current, district: value }))} placeholder="Kochi" />
              <Field label="Location" full value={form.address} onChange={(value) => setForm((current) => ({ ...current, address: value }))} placeholder="Building, landmark, road or campus name" />
              <Field label="Station note" full>
                <textarea
                  rows={4}
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Anything the sub-admin should know about this station"
                  className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-ring/40"
                />
              </Field>

              <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/50 p-4">
                <div className="text-xs text-muted-foreground">
                  {editingStationId
                    ? "Editing an existing station. Save to update the backend database and the sub-admin station list."
                    : "Create a new station and make it available for sub-admin signup immediately."}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {editingStationId ? (
                    <button
                      type="button"
                      onClick={deleteStation}
                      disabled={saving || deleting}
                      className="inline-flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive transition hover:bg-destructive/15 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      {deleting ? "Deleting station" : "Delete station"}
                    </button>
                  ) : null}

                  <button
                    type="submit"
                    disabled={saving || deleting}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {saving ? "Saving station" : editingStationId ? "Update station" : "Create station"}
                  </button>
                </div>
              </div>

              {feedback ? (
                <div
                  className={`sm:col-span-2 rounded-2xl border px-4 py-3 text-sm ${
                    feedback.kind === "success"
                      ? "border-success/20 bg-success/10 text-success"
                      : feedback.kind === "error"
                        ? "border-destructive/20 bg-destructive/10 text-destructive"
                        : "border-info/20 bg-info/10 text-info"
                  }`}
                >
                  <span className="inline-flex items-start gap-2">
                    {feedback.kind === "error" ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : null}
                    <span>{feedback.text}</span>
                  </span>
                </div>
              ) : null}
            </form>
          </section>

          <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">Station directory</h3>
                <p className="text-xs text-muted-foreground">Search a station to update it, or pick a record to inspect the generated locker grid.</p>
              </div>
              <div className="relative w-full sm:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search station name, ID, district or location"
                  className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-ring/40"
                />
              </div>
            </div>

            {loading ? (
              <div className="mt-6 text-sm text-muted-foreground">Loading stations…</div>
            ) : (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {filteredStations.map((station) => {
                  const active = station.station_id === editingStationId;

                  return (
                    <button
                      key={station.station_id}
                      type="button"
                      onClick={() => pickStation(station)}
                      className={`rounded-2xl border p-4 text-left transition ${
                        active
                          ? "border-primary/30 bg-primary/5 shadow-glow"
                          : "border-border bg-background hover:border-primary/20 hover:bg-secondary/60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground truncate">{station.name}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1">
                              <Hash className="h-3 w-3" /> {station.station_id}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1">
                              <MapPin className="h-3 w-3" /> {station.location.city} · {station.location.district}
                            </span>
                          </div>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${active ? "bg-primary text-primary-foreground" : "bg-success/15 text-success"}`}>
                          {active ? "Editing" : "Active"}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <CardStat label="Lockers" value={String(station.locker_count)} />
                        <CardStat label="Members" value={String(station.estimated_members)} />
                        <CardStat label="State" value={station.status === "active" ? "Live" : station.status} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-3xl border border-border bg-card p-6 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Station preview</div>
                <h3 className="mt-2 truncate text-2xl font-semibold text-foreground">{previewStation?.name ?? "Draft station"}</h3>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1">
                    <ShieldCheck className="h-3.5 w-3.5" /> {previewStation?.station_id ?? "Draft ID"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {previewStation ? stationLocationLabel(previewStation) : "Location pending"}
                  </span>
                </div>
              </div>
              <span className="rounded-full bg-success/15 px-3 py-1 text-[11px] font-semibold text-success">Backend ready</span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <PreviewStat label="Lockers" value={String(previewStation?.locker_count ?? 0)} />
              <PreviewStat label="Members" value={String(previewStation?.estimated_members ?? 0)} />
              <PreviewStat label="City" value={previewStation?.location.city ?? "-"} />
              <PreviewStat label="District" value={previewStation?.location?.district ?? previewStation?.district ?? "-"} />
            </div>

            <div className="mt-5 rounded-2xl border border-border bg-secondary/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">Locker grid preview</div>
                  <div className="text-xs text-muted-foreground">The grid automatically matches the locker count you enter.</div>
                </div>
                <LockerLegend />
              </div>
              <div className="mt-4 max-h-136 overflow-auto pr-1">
                <LockerGrid lockers={lockerPreview} />
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-linear-to-br from-primary/10 via-transparent to-info/10 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <PlusCircle className="h-4 w-4 text-primary" /> Sub-admin signup ready
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Once you save a station, it becomes available in the sub-admin station selector through the backend `/stations` API.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}

function MiniStat({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-2xl border border-border bg-background/80 p-3 shadow-sm backdrop-blur">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" /> {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
    </div>
  );
}

function CardStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary p-3 text-center">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}