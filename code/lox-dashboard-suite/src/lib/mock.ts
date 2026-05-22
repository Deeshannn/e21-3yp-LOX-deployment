import type { LockerStatus } from "@/components/lox/LockerGrid";

export const lockers: { id: string; status: LockerStatus }[] = Array.from({ length: 72 }).map((_, i) => {
  const r = (i * 7) % 11;
  const status: LockerStatus =
    r < 5 ? "available" : r < 8 ? "occupied" : r < 9 ? "reserved" : r === 9 ? "faulty" : "available";
  return { id: String(i + 1).padStart(2, "0"), status };
});

export const usageData = [
  { day: "Mon", usage: 120, revenue: 2400 },
  { day: "Tue", usage: 156, revenue: 2900 },
  { day: "Wed", usage: 140, revenue: 2700 },
  { day: "Thu", usage: 198, revenue: 3600 },
  { day: "Fri", usage: 240, revenue: 4200 },
  { day: "Sat", usage: 280, revenue: 4800 },
  { day: "Sun", usage: 210, revenue: 3900 },
];

export const peakHours = [
  { h: "6a", v: 12 }, { h: "8a", v: 38 }, { h: "10a", v: 62 },
  { h: "12p", v: 78 }, { h: "2p", v: 71 }, { h: "4p", v: 95 },
  { h: "6p", v: 110 }, { h: "8p", v: 84 }, { h: "10p", v: 41 },
];

export const lockerSplit = [
  { name: "Available", value: 42, color: "var(--success)" },
  { name: "Occupied", value: 22, color: "var(--destructive)" },
  { name: "Reserved", value: 5, color: "var(--warning)" },
  { name: "Faulty", value: 3, color: "var(--muted-foreground)" },
];

export const members = [
  { name: "Priya Nair", phone: "+91 98 4567 1023", email: "priya@lox.io", locker: "07", duration: "2h 14m", status: "Active", payment: "Paid" },
  { name: "Rahul Krishnan", phone: "+91 90 1234 5588", email: "rahul@lox.io", locker: "12", duration: "45m", status: "Active", payment: "Paid" },
  { name: "Ananya Suresh", phone: "+91 98 6677 4421", email: "ananya@lox.io", locker: "19", duration: "5h 02m", status: "Expired", payment: "Due" },
  { name: "Vivek Menon", phone: "+91 95 7788 1290", email: "vivek@lox.io", locker: "23", duration: "1h 33m", status: "Active", payment: "Paid" },
  { name: "Meera Joseph", phone: "+91 99 4455 7821", email: "meera@lox.io", locker: "31", duration: "8h 47m", status: "Expired", payment: "Due" },
  { name: "Arjun Pillai", phone: "+91 98 9988 1122", email: "arjun@lox.io", locker: "44", duration: "30m", status: "Active", payment: "Paid" },
];

export const stations = [
  { id: "LX-KCH-01", name: "Kochi Central", district: "Ernakulam", lockers: 72, occ: 38, admin: "Aarav Mehta" },
  { id: "LX-TVM-04", name: "Trivandrum Hub", district: "Trivandrum", lockers: 96, occ: 71, admin: "Sneha Pillai" },
  { id: "LX-CLT-02", name: "Calicut Beach Point", district: "Kozhikode", lockers: 48, occ: 22, admin: "Rohan Das" },
  { id: "LX-BLR-09", name: "Bangalore Tech Park", district: "Bangalore", lockers: 120, occ: 88, admin: "Kavya R." },
  { id: "LX-MUM-03", name: "Mumbai Marine Drive", district: "Mumbai", lockers: 84, occ: 54, admin: "Imran Shaikh" },
  { id: "LX-DEL-07", name: "Delhi Metro Hub", district: "New Delhi", lockers: 110, occ: 79, admin: "Neha Verma" },
];
