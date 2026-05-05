import { Locker } from "@/lib/api";
import { Lock, LockOpen } from "lucide-react";

type Props = {
  locker: Locker;
  isMine?: boolean;
  onClick?: () => void;
  selected?: boolean;
};

export function LockerCube({ locker, isMine, onClick, selected }: Props) {
  const isOverdue = locker.availability === "overdue";

  // Overdue always wins — even if it's the user's own locker
  const stateClass =
    isOverdue                              ? "box-state-overdue"
    : isMine                               ? "box-state-mine"
    : locker.availability === "available"  ? "box-state-available"
    : locker.availability === "reserved"   ? "box-state-reserved"
    : locker.availability === "queue_hold" ? "box-state-unavailable"
    :                                        "box-state-unavailable";

  const label =
    isOverdue                              ? "Overdue"
    : isMine                               ? "Yours"
    : locker.availability === "available"  ? "Available"
    : locker.availability === "reserved"   ? "Reserved"
    : locker.availability === "queue_hold" ? "Held"
    :                                        "Unavailable";

  const doorOpen = locker.door_state === "open";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative text-left rounded-xl p-2.5 transition-all duration-300
        ${selected
          ? "ring-2 ring-brand-cyan glow-blue"
          : "ring-1 ring-border hover:ring-brand-violet"}
        bg-card/40 backdrop-blur-md`}
    >
      <div className="locker-stage">
        <div className={`locker-box ${stateClass} ${doorOpen ? "door-open" : "door-closed"}`}>
          {/* Box shell */}
          <div className="lb-face lb-back" />
          <div className="lb-face lb-left" />
          <div className="lb-face lb-right" />
          <div className="lb-face lb-top" />
          <div className="lb-face lb-bottom" />
          {/* Interior */}
          <div className="lb-interior">
            <span className="lb-id">{locker.locker_id}</span>
          </div>
          {/* Hinged door */}
          <div className="lb-door">
            <div className="lb-door-front">
              <span className="lb-door-id">{locker.locker_id}</span>
              <span className="lb-handle" />
            </div>
            <div className="lb-door-back" />
          </div>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between">
        <span
          className={`text-[10px] uppercase tracking-widest font-semibold
            ${isOverdue                            ? "text-red-400"
            : isMine                               ? "text-emerald-300"
            : locker.availability === "available"  ? "text-brand-cyan"
            : locker.availability === "reserved"   ? "text-brand-purple"
            : "text-muted-foreground"}`}
        >
          {label}
        </span>
        <span title={`Lock: ${locker.lock_state}`} className="text-muted-foreground">
          {locker.lock_state === "locked"
            ? <Lock className="w-3 h-3" />
            : <LockOpen className="w-3 h-3 text-brand-cyan" />}
        </span>
      </div>
    </button>
  );
}