import { useEffect, useMemo, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { AppSidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { apiRequest } from "@/lib/api";
import { clearAuthSession, getAuthSession } from "@/lib/auth";

export function AppShell({
  role,
  title,
  children,
}: {
  role: "sub" | "super";
  title: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [notificationCount, setNotificationCount] = useState(0);
  const [authReady, setAuthReady] = useState(false);

  const session = useMemo(() => getAuthSession(), []);

  useEffect(() => {
    let alive = true;

    const refreshNotificationCount = async (currentSession = getAuthSession()) => {
      if (!currentSession) return 0;

      const chatResponse = await apiRequest<{ unread_count: number }>("/chat/notifications", {
        headers: {
          Authorization: `Bearer ${currentSession.token}`,
        },
      });

      if (role === "super") {
        const adminResponse = await apiRequest<{ unread_count: number }>("/auth/notifications", {
          headers: {
            Authorization: `Bearer ${currentSession.token}`,
          },
        });

        return chatResponse.unread_count + adminResponse.unread_count;
      }

      return chatResponse.unread_count;
    };

    const loadAuth = async () => {
      const currentSession = getAuthSession();

      if (!currentSession || currentSession.user.role !== (role === "sub" ? "sub_admin" : "super_admin")) {
        clearAuthSession();
        router.navigate({ to: "/login" });
        if (alive) {
          setAuthReady(true);
        }
        return;
      }

      if (role === "sub" && !currentSession.user.station_id) {
        clearAuthSession();
        router.navigate({ to: "/login" });
        if (alive) {
          setAuthReady(true);
        }
        return;
      }

      try {
        const data = await apiRequest<{ user: typeof currentSession.user }>("/auth/me", {
          headers: {
            Authorization: `Bearer ${currentSession.token}`,
          },
        })

        if (!alive) return;

        const latest = { ...currentSession, user: data.user }
        window.localStorage.setItem("lox.auth.session", JSON.stringify(latest))

        const count = await refreshNotificationCount(latest);

        if (!alive) return;
        setNotificationCount(count)
      } catch {
        clearAuthSession()
        router.navigate({ to: "/login" })
      } finally {
        if (alive) {
          setAuthReady(true)
        }
      }
    }

    void loadAuth()

    const refreshNotifications = () => {
      void refreshNotificationCount()
        .then((count) => {
          if (alive) {
            setNotificationCount(count)
          }
        })
        .catch(() => undefined)
    }

    window.addEventListener("lox:notifications-updated", refreshNotifications)
    window.addEventListener("lox:messages-updated", refreshNotifications)

    return () => {
      alive = false
      window.removeEventListener("lox:notifications-updated", refreshNotifications)
      window.removeEventListener("lox:messages-updated", refreshNotifications)
    }
  }, [role, router])

  if (!authReady) {
    return <div className="grid min-h-screen place-items-center bg-mesh text-sm text-muted-foreground">Loading secure session…</div>
  }

  return (
    <div className="flex min-h-screen bg-mesh">
      <AppSidebar role={role} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar
          title={title}
          role={role}
          notificationCount={notificationCount}
          userName={session?.user.name}
          userDetail={
            role === "sub"
              ? session?.user.station_name || session?.user.station_id || "Station console"
              : session?.user.email || "Super admin"
          }
        />
        <main className="flex-1 p-4 md:p-8 animate-float-in">{children}</main>
      </div>
    </div>
  );
}
