import type { LockerStatus } from "@/components/lox/LockerGrid";
import { stations as seedStations } from "@/lib/mock";

export type StationLocation = {
  address: string;
  city: string;
  district: string;
  landmark?: string;
};

export type StationRecord = {
  station_id: string;
  name: string;
  locker_count: number;
  estimated_members: number;
  location: StationLocation;
  notes: string;
  status: "active" | "draft";
  created_at: string;
  updated_at: string;
};

export type StationOption = {
  station_id: string;
  name: string;
  main_town: string;
  district: string;
  locker_count: number;
  estimated_members: number;
};

export type StationLocker = {
  id: string;
  status: LockerStatus;
};

export type StationInput = {
  station_id: string;
  previous_station_id?: string;
  name: string;
  locker_count: number;
  estimated_members: number;
  location: StationLocation;
  notes?: string;
  status?: StationRecord["status"];
};

const STORAGE_KEY = "lox.station.catalog.v1";

const nowIso = () => new Date().toISOString();

const normalizeText = (value: string) => value.trim().replace(/\s+/g, " ");

const normalizeStationId = (value: string) => normalizeText(value).toUpperCase();

const cloneStation = (station: StationRecord): StationRecord => ({
  ...station,
  location: { ...station.location },
});

const seededCatalog: StationRecord[] = seedStations.map((station, index) => ({
  station_id: station.id,
  name: station.name,
  locker_count: station.lockers,
  estimated_members: Math.max(60, Math.round(station.lockers * 2.5)),
  location: {
    address: `${station.name}, ${station.district}`,
    city: station.district,
    district: station.district,
  },
  notes: index % 2 === 0 ? "Ready for sub-admin onboarding" : "Assigned from the LOX station catalog",
  status: "active",
  created_at: nowIso(),
  updated_at: nowIso(),
}));

function normalizeStationRecord(station: StationRecord): StationRecord {
  return {
    station_id: normalizeStationId(station.station_id),
    name: normalizeText(station.name),
    locker_count: Math.max(1, Math.round(Number(station.locker_count) || 0)),
    estimated_members: Math.max(0, Math.round(Number(station.estimated_members) || 0)),
    location: {
      address: normalizeText(station.location.address),
      city: normalizeText(station.location.city),
      district: normalizeText(station.location.district),
      landmark: station.location.landmark ? normalizeText(station.location.landmark) : undefined,
    },
    notes: normalizeText(station.notes || "Managed from the LOX super admin console"),
    status: station.status,
    created_at: station.created_at,
    updated_at: station.updated_at,
  };
}

function loadCatalogFromStorage(): StationRecord[] {
  if (typeof window === "undefined") {
    return seededCatalog.map(cloneStation);
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seededCatalog));
    return seededCatalog.map(cloneStation);
  }

  try {
    const parsed = JSON.parse(raw) as StationRecord[];
    const normalized = Array.isArray(parsed)
      ? parsed.map((station) => normalizeStationRecord(station))
      : seededCatalog.map(cloneStation);

    if (normalized.length === 0) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seededCatalog));
      return seededCatalog.map(cloneStation);
    }

    return normalized;
  } catch {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seededCatalog));
    return seededCatalog.map(cloneStation);
  }
}

function persistCatalog(catalog: StationRecord[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(catalog));
  window.dispatchEvent(new Event("lox:station-catalog-updated"));
}

export function getStationCatalog(): StationRecord[] {
  return loadCatalogFromStorage();
}

export function getStationOption(station: StationRecord): StationOption {
  return {
    station_id: station.station_id,
    name: station.name,
    main_town: station.location.city,
    district: station.location.district,
    locker_count: station.locker_count,
    estimated_members: station.estimated_members,
  };
}

export function getStationOptions(): StationOption[] {
  return getStationCatalog().map(getStationOption);
}

export function findStationById(stationId: string): StationRecord | undefined {
  const normalizedStationId = normalizeStationId(stationId);
  return getStationCatalog().find((station) => station.station_id === normalizedStationId);
}

export function searchStations(stations: StationRecord[], query: string): StationRecord[] {
  const normalizedQuery = normalizeText(query).toLowerCase();

  if (!normalizedQuery) {
    return stations;
  }

  return stations.filter((station) => {
    const haystack = [
      station.station_id,
      station.name,
      station.location.city,
      station.location.district,
      station.location.address,
      station.notes,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

export function buildLockerPreview(lockerCount: number, stationId: string, estimatedMembers = 0): StationLocker[] {
  const totalLockers = Math.max(1, Math.round(lockerCount));
  const occupiedCount = Math.min(totalLockers, Math.max(0, Math.round(totalLockers * 0.56)));
  const reservedCount = Math.min(totalLockers - occupiedCount, Math.max(0, Math.round(totalLockers * 0.1)));
  const faultyCount = Math.min(
    totalLockers - occupiedCount - reservedCount,
    Math.max(0, Math.round(totalLockers * 0.04))
  );

  const seed = stationId
    .split("")
    .reduce((value, character) => value + character.charCodeAt(0), estimatedMembers);

  return Array.from({ length: totalLockers }, (_, index) => {
    const noise = (seed + index * 17) % 97;
    let status: LockerStatus = "available";

    if (index < occupiedCount) {
      status = "occupied";
    } else if (index < occupiedCount + reservedCount) {
      status = "reserved";
    } else if (index < occupiedCount + reservedCount + faultyCount || noise % 31 === 0) {
      status = "faulty";
    }

    return {
      id: String(index + 1).padStart(2, "0"),
      status,
    };
  });
}

export function upsertStation(input: StationInput): StationRecord {
  const catalog = getStationCatalog();
  const stationId = normalizeStationId(input.station_id);
  const previousStationId = input.previous_station_id ? normalizeStationId(input.previous_station_id) : stationId;
  const timestamp = nowIso();
  const record: StationRecord = normalizeStationRecord({
    station_id: stationId,
    name: input.name,
    locker_count: input.locker_count,
    estimated_members: input.estimated_members,
    location: input.location,
    notes: input.notes || "Managed from the LOX super admin console",
    status: input.status || "active",
    created_at: timestamp,
    updated_at: timestamp,
  });

  const withoutPrevious = previousStationId === stationId
    ? [...catalog]
    : catalog.filter((station) => station.station_id !== previousStationId);

  const existingIndex = withoutPrevious.findIndex((station) => station.station_id === stationId);

  if (existingIndex >= 0) {
    record.created_at = withoutPrevious[existingIndex].created_at;
    withoutPrevious[existingIndex] = record;
  } else {
    withoutPrevious.unshift(record);
  }

  persistCatalog(withoutPrevious);
  return record;
}

export function formatStationLocation(station: StationRecord): string {
  return `${station.location.city} · ${station.location.district}`;
}