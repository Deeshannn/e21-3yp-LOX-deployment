export type StationLocation = {
  address: string;
  city: string;
  district: string;
  latitude: number;
  longitude: number;
};

export type StationRecord = {
  station_id: string;
  name: string;
  status: "active" | "maintenance" | "offline";
  locker_count: number;
  estimated_members: number;
  notes: string;
  location: StationLocation;
  station_db_uri?: string;
  last_heartbeat_at?: string;
};

export type LockerStatus = "available" | "occupied" | "reserved" | "faulty";

export type LockerPreviewCell = {
  id: string;
  status: LockerStatus;
};

export const buildLockerPreview = (lockerCount: number): LockerPreviewCell[] =>
  Array.from({ length: Math.max(0, lockerCount) }, (_, index) => {
    const seed = index % 9;

    return {
      id: String(index + 1).padStart(2, "0"),
      status: seed < 4 ? "available" : seed < 7 ? "occupied" : seed < 8 ? "reserved" : "faulty",
    };
  });

export const getStationLocationLabel = (station?: Pick<StationRecord, "location"> | null) => {
  if (!station) return "Location pending";

  const { city, district, address } = station.location;
  return [city || address || "Unknown", district || "Unknown"].join(" · ");
};

export const getStationDatabaseLabel = (station?: Pick<StationRecord, "station_db_uri" | "station_id"> | null) => {
  if (!station) return "Not assigned";

  if (station.station_db_uri) {
    const segments = station.station_db_uri.split("/");
    return segments[segments.length - 1] || station.station_id;
  }

  return station.station_id;
};
