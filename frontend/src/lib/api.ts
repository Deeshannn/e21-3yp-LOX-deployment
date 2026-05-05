const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "")
  || "http://localhost:5000/api";

export type Station = {
  station_id: string;
  name: string;
  main_town: string;
  locker_count: number;
  address?: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role?: "user" | "admin";
  created_at?: string;
};

type RawUser = { user_id?: string; id?: string; name: string; email: string; role?: "user" | "admin"; created_at?: string };
function normalizeUser(u: RawUser): User {
  return { id: u.user_id || u.id || "", name: u.name, email: u.email, role: u.role, created_at: u.created_at };
}

export type MembershipStatus = "none" | "pending" | "member";

export type Locker = {
  locker_id: string;
  lock_state: "locked" | "unlocked";
  door_state: "open" | "closed";
  state: string;
  availability: "available" | "reserved" | "unavailable" | "queue_hold" | "overdue";
  last_reported_at: string;
  reserved_by?: string | null;
};

export type StationLockers = {
  station_id?: string;
  total_lockers: number;
  available_count: number;
  reserved_count: number;
  unavailable_count: number;
  lockers: Locker[];
  my_reservation?: Locker | null;
};

export type PendingRequest = {
  membership_id: string;
  user: { id: string; name: string; email: string };
  station_id: string;
  joined_at: string;
};

export type QueueStatus = {
  in_queue: boolean;
  position?: number;
  total_in_queue?: number;
  joined_at?: string;
};

export type QueueEntry = {
  position: number;
  user_id: string;
  user: { id: string; name: string; email: string };
  status: "waiting" | "notified";
  joined_at: string;
  minutes_in_queue: number;
  offered_locker: string | null;
  offer_expires_at: string | null;
  seconds_remaining: number | null;
};

export type AdminQueueDetails = {
  station_id: string;
  total: number;
  waiting: number;
  notified: number;
  max_size: number;
  queue_full: boolean;
  entries: QueueEntry[];
};

export type OverdueLocker = {
  locker_id: string;
  state: string;
  user: { id: string; name: string; email: string };
  reserved_at: string;
  overdue_at: string;
  overdue_minutes: number;
  release_requested: boolean;
  release_requested_at: string | null;
};

export type StationSettings = {
  station_id: string;
  free_minutes: number;
  free_time: string;
  updated_at: string;
};

export type TimeRemaining = {
  locker_id: string;
  time_limit: boolean;
  is_overdue: boolean;
  minutes_remaining: number;
  seconds_remaining: number;
  expires_at?: string;
  free_minutes: number;
  message: string;
};

export type OverdueStatus = {
  has_overdue: boolean;
  locker_id?: string;
  availability?: string;
  overdue_at?: string;
  overdue_minutes?: number;
  release_requested?: boolean;
  release_requested_at?: string;
  message: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${BASE}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(init?.headers || {}),
      },
    });
  } catch (e) {
    throw new Error(
      `Network error reaching ${url}. Is your backend running and CORS-enabled? (${(e as Error).message})`
    );
  }
  const text = await res.text();
  const data = text ? safeJSON(text) : null;
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || res.statusText || "Request failed";
    throw new Error(`${res.status} ${msg}`);
  }
  return data as T;
}

function safeJSON(s: string) {
  try { return JSON.parse(s); } catch { return s; }
}

export const api = {
  base: BASE,

  // ── Users ──────────────────────────────────────────────
  listUsers: () =>
    request<{ users: RawUser[] } | RawUser[]>(`/users`)
      .then(r => (Array.isArray(r) ? r : r.users).map(normalizeUser)),

  // ── Stations ───────────────────────────────────────────
  listStations: () =>
    request<{ stations: Station[] } | Station[]>(`/stations`)
      .then(r => Array.isArray(r) ? r : r.stations),

  // ── Memberships ────────────────────────────────────────
  getMyMembershipStatus: (user_id: string, station_id: string) =>
    request<{ status: MembershipStatus }>(`/memberships/status/${station_id}?user_id=${user_id}`)
      .catch(() => ({ status: "none" as MembershipStatus })),

  requestMembership: (user_id: string, station_id: string) =>
    request<{ membership_id: string; status: string }>(`/memberships/request`, {
      method: "POST",
      body: JSON.stringify({ user_id, station_id }),
    }),

  pendingRequests: (station_id: string) =>
    request<{ requests: PendingRequest[] }>(`/memberships/pending/${station_id}`)
      .then(r => r.requests),

  acceptMembership: (membership_id: string) =>
    request<{ ok: boolean }>(`/memberships/accept`, {
      method: "PUT",
      body: JSON.stringify({ membership_id }),
    }),

  ignoreMembership: (membership_id: string) =>
    request<{ ok: boolean }>(`/memberships/ignore`, {
      method: "POST",
      body: JSON.stringify({ membership_id }),
    }),

  // ── Lockers ────────────────────────────────────────────
  stationLockers: (station_id: string, user_id: string) =>
    request<StationLockers>(`/lockers/${station_id}?user_id=${user_id}`),

  reserveLocker: (station_id: string, user_id: string, locker_id: string) =>
    request<{ ok: boolean }>(`/lockers/reserve`, {
      method: "POST",
      body: JSON.stringify({ station_id, user_id, locker_id }),
    }),

  releaseLocker: (station_id: string, user_id: string, locker_id: string) =>
    request<{ ok: boolean }>(`/lockers/release`, {
      method: "PUT",
      body: JSON.stringify({ station_id, user_id, locker_id }),
    }),

  unlockLocker: (station_id: string, user_id: string, locker_id: string) =>
    request<{ ok: boolean }>(`/lockers/unlock`, {
      method: "POST",
      body: JSON.stringify({ station_id, user_id, locker_id }),
    }),

  timeRemaining: (station_id: string, user_id: string) =>
    request<TimeRemaining>(`/lockers/time-remaining/${station_id}?user_id=${user_id}`)
      .catch(() => null),

  overdueStatus: (station_id: string, user_id: string) =>
    request<OverdueStatus>(`/lockers/overdue-status/${station_id}?user_id=${user_id}`)
      .catch(() => null),

  requestRelease: (station_id: string, user_id: string) =>
    request<{ ok: boolean }>(`/lockers/request-release`, {
      method: "POST",
      body: JSON.stringify({ station_id, user_id }),
    }),

  // Admin — overdue lockers
  adminOverdues: (station_id: string) =>
    request<{ total_overdue: number; pending_requests: number; overdues: OverdueLocker[] }>(
      `/lockers/admin/overdues/${station_id}`
    ),

  adminRelease: (station_id: string, locker_id: string) =>
    request<{ ok: boolean }>(`/lockers/admin-release`, {
      method: "POST",
      body: JSON.stringify({ station_id, locker_id }),
    }),

  // ── Queue ──────────────────────────────────────────────
  joinQueue: (station_id: string, user_id: string) =>
    request<{ ok: boolean }>(`/queue/join`, {
      method: "POST",
      body: JSON.stringify({ station_id, user_id }),
    }),

  leaveQueue: (station_id: string, user_id: string) =>
    request<{ ok: boolean }>(`/queue/leave`, {
      method: "DELETE",
      body: JSON.stringify({ station_id, user_id }),
    }),

  queueStatus: (station_id: string, user_id: string) =>
    request<QueueStatus>(`/queue/status/${station_id}?user_id=${user_id}`),

  queueNotification: (station_id: string, user_id: string) =>
    request<{
      has_notification: boolean;
      offered_locker?: string;
      offer_expires_at?: string;
      minutes_remaining?: number;
      seconds_remaining?: number;
      in_queue?: boolean;
      your_position?: number;
      queue_size?: number;
      message: string;
    }>(`/queue/notification/${station_id}?user_id=${user_id}`),

  // Admin — queue details
  adminQueueDetails: (station_id: string) =>
    request<AdminQueueDetails>(`/queue/admin/${station_id}`),

  // Manually trigger overdue check for a station
  checkOverdue: (station_id: string) =>
    request<{ overdue_found: number }>(`/station-settings/${station_id}/check-overdue`, {
      method: "POST",
    }),

  // ── Station Settings ───────────────────────────────────
  getStationSettings: (station_id: string) =>
    request<StationSettings>(`/station-settings/${station_id}`),

  updateStationSettings: (station_id: string, free_minutes: number) =>
    request<StationSettings>(`/station-settings/${station_id}`, {
      method: "PUT",
      body: JSON.stringify({ free_minutes }),
    }),
};