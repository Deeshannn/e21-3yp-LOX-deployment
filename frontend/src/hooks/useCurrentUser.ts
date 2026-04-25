import { useEffect, useState } from "react";
import { User, api } from "@/lib/api";

const KEY = "smartlocker.userId";

export function useCurrentUser() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [userId, setUserIdState] = useState<string | null>(() => localStorage.getItem(KEY));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.listUsers()
      .then(u => { if (alive) { setUsers(u); setError(null); } })
      .catch(e => { if (alive) setError((e as Error).message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const setUserId = (id: string | null) => {
    setUserIdState(id);
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  };

  const user = users?.find(u => u.id === userId) || null;
  return { users, user, userId, setUserId, loading, error };
}
