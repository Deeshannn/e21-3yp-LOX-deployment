import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User2 } from "lucide-react";

export function UserSwitcher() {
  const { users, userId, setUserId, loading, error } = useCurrentUser();

  return (
    <div className="flex items-center gap-2">
      <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
        <User2 className="w-3.5 h-3.5" /> Acting as
      </div>
      <Select
        value={userId || ""}
        onValueChange={(v) => setUserId(v || null)}
        disabled={loading || !!error || !users?.length}
      >
        <SelectTrigger className="w-[200px] bg-card/60 border-border/80">
          <SelectValue placeholder={loading ? "Loading users…" : error ? "API offline" : "Select user"} />
        </SelectTrigger>
        <SelectContent>
          {users?.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              <div className="flex flex-col">
                <span className="font-medium">{u.name}</span>
                <span className="text-xs text-muted-foreground">{u.email}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
