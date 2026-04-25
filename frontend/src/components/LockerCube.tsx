import { Locker } from "@/lib/api";
import { Lock, LockOpen, DoorClosed, DoorOpen } from "lucide-react";

type Props = {
  locker: Locker;
  isMine?: boolean;
  onClick?: () => void;
  selected?: boolean;
};

export function LockerCube({ locker, isMine, onClick, selected }: Props) {
  const stateClass = isMine
    ? "iso-state-mine"
    : locker.availability === "available"
    ? "iso-state-available"
    : locker.availability === "reserved"
    ? "iso-state-reserved"
    : "iso-state-unavailable";

  const label =
    isMine ? "Yours"
      : locker.availability === "available" ? "Available"
      : locker.availability === "reserved" ? "Reserved"
      : "Unavailable";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative text-left rounded-2xl p-4 transition-all duration-300
        ${selected ? "ring-2 ring-brand-cyan glow-blue" : "ring-1 ring-border hover:ring-brand-violet"}
        bg-card/40 backdrop-blur-md`}
    >
      <div className="iso-stage">
        <div className={`iso-cube ${stateClass}`}>
          <div className="face top flex items-center justify-center">
            <span className="font-display font-bold text-primary-foreground/90 text-xl tracking-tight drop-shadow">
              {locker.locker_id}
            </span>
          </div>
          <div className="face left" />
          <div className="face right" />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span
          className={`text-[11px] uppercase tracking-widest font-semibold
            ${isMine ? "text-emerald-300"
              : locker.availability === "available" ? "text-brand-cyan"
              : locker.availability === "reserved" ? "text-brand-purple"
              : "text-muted-foreground"}`}
        >
          {label}
        </span>
        <div className="flex items-center gap-2 text-muted-foreground">
          <span title={`Lock: ${locker.lock_state}`}>
            {locker.lock_state === "locked" ? <Lock className="w-3.5 h-3.5" /> : <LockOpen className="w-3.5 h-3.5 text-brand-cyan" />}
          </span>
          <span title={`Door: ${locker.door_state}`}>
            {locker.door_state === "closed" ? <DoorClosed className="w-3.5 h-3.5" /> : <DoorOpen className="w-3.5 h-3.5 text-brand-cyan" />}
          </span>
        </div>
      </div>
    </button>
  );
}
