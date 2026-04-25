// Centralized API client for the SmartLocker backend.
// Base URL is overridable via Vite env: VITE_API_BASE_URL
// Defaults to http://localhost:5000/api so dev works out of the box.

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
  availability: "available" | "reserved" | "unavailable";
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

  // ---- Users ----
  listUsers: () => request<{ users: RawUser[] } | RawUser[]>(`/users`)
    .then(r => (Array.isArray(r) ? r : r.users).map(normalizeUser)),

  // ---- Stations ----
  listStations: () => request<{ stations: Station[] } | Station[]>(`/stations`)
    .then(r => Array.isArray(r) ? r : r.stations),

  getMyMembershipStatus: (user_id: string, station_id: string) =>
    request<{ status: MembershipStatus }>(`/memberships/status/${station_id}?user_id=${user_id}`)
      .catch(() => ({ status: "none" as MembershipStatus })),

  // ---- Memberships ----
  requestMembership: (user_id: string, station_id: string) =>
    request<{ membership_id: string; status: string }>(`/memberships/request`, {
      method: "POST",
      body: JSON.stringify({ user_id, station_id }),
    }),

  pendingRequests: (station_id: string) =>
    request<{ requests: PendingRequest[] }>(`/memberships/pending/${station_id}`)
      .then(r => r.requests),

  // Backend uses PUT
  acceptMembership: (membership_id: string) =>
    request<{ ok: boolean }>(`/memberships/accept`, {
      method: "PUT",
      body: JSON.stringify({ membership_id }),
    }),

  // Backend uses POST
  ignoreMembership: (membership_id: string) =>
    request<{ ok: boolean }>(`/memberships/ignore`, {
      method: "POST",
      body: JSON.stringify({ membership_id }),
    }),

  // ---- Lockers ----
  stationLockers: (station_id: string, user_id: string) =>
    request<StationLockers>(`/lockers/${station_id}?user_id=${user_id}`),

  reserveLocker: (station_id: string, user_id: string, locker_id: string) =>
    request<{ ok: boolean }>(`/lockers/reserve`, {
      method: "POST",
      body: JSON.stringify({ station_id, user_id, locker_id }),
    }),

  // Backend uses PUT
  releaseLocker: (station_id: string, user_id: string, locker_id: string) =>
    request<{ ok: boolean }>(`/lockers/release`, {
      method: "PUT",
      body: JSON.stringify({ station_id, user_id, locker_id }),
    }),

  // ---- Queue ----
  joinQueue: (station_id: string, user_id: string) =>
    request<{ ok: boolean }>(`/queue/join`, {
      method: "POST",
      body: JSON.stringify({ station_id, user_id }),
    }),

  // Backend uses DELETE
  leaveQueue: (station_id: string, user_id: string) =>
    request<{ ok: boolean }>(`/queue/leave`, {
      method: "DELETE",
      body: JSON.stringify({ station_id, user_id }),
    }),

  queueStatus: (station_id: string, user_id: string) =>
    request<QueueStatus>(`/queue/status/${station_id}?user_id=${user_id}`),
};