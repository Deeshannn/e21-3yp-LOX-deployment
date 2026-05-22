import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"
import { AppShell } from "@/components/layout/AppShell"
import { ShieldCheck, Plus, Trash2, Search } from "lucide-react"
import { apiRequest } from "@/lib/api"
import { getAuthSession, setPendingSignupRole } from "@/lib/auth"

export const Route = createFileRoute("/super/admins")({
  head: () => ({ meta: [{ title: "Super admins — LOX HQ" }] }),
  component: AdminsPage,
})

type ManagedAdmin = {
  user_id: string
  name: string
  email: string
  role: "sub_admin" | "super_admin"
  status: string
  station_id: string | null
  station_name: string | null
  created_at: string
  approved_at: string | null
}

type ManagedAdminResponse = {
  admins: ManagedAdmin[]
  summary: {
    super_admins: number
    sub_admins: number
  }
}

type RoleFilter = "all" | "super_admin" | "sub_admin"

const isNotFoundError = (error: unknown) => error instanceof Error && /404|not found/i.test(error.message)

const fetchManagedAdmins = async (pathWithQuery: string, token: string) => {
  try {
    return await apiRequest<ManagedAdminResponse>(`/auth${pathWithQuery}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  } catch (error) {
    if (!isNotFoundError(error)) throw error

    return apiRequest<ManagedAdminResponse>(`/users${pathWithQuery}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  }
}

const removeManagedSubAdmin = async (userId: string, token: string) => {
  try {
    await apiRequest(`/auth/admins/${userId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return
  } catch (error) {
    if (!isNotFoundError(error)) throw error
  }

  await apiRequest(`/users/admins/${userId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

function AdminsPage() {
  const router = useRouter()
  const session = useMemo(() => getAuthSession(), [])

  const [admins, setAdmins] = useState<ManagedAdmin[]>([])
  const [summary, setSummary] = useState({ super_admins: 0, sub_admins: 0 })
  const [filterRole, setFilterRole] = useState<RoleFilter>("all")
  const [searchText, setSearchText] = useState("")
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [removeBusyId, setRemoveBusyId] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const loadAdmins = async () => {
      if (!session?.token) {
        await router.navigate({ to: "/login" })
        return
      }

      setLoading(true)
      setErrorText(null)

      try {
        const params = new URLSearchParams()
        if (filterRole !== "all") params.set("role", filterRole)
        const trimmedSearch = searchText.trim()
        if (trimmedSearch) params.set("search", trimmedSearch)

        const path = params.toString() ? `/admins?${params.toString()}` : "/admins"
        const payload = await fetchManagedAdmins(path, session.token)

        if (!active) return
        setAdmins(payload.admins || [])
        setSummary(payload.summary || { super_admins: 0, sub_admins: 0 })
      } catch (err) {
        if (!active) return
        setAdmins([])
        setSummary({ super_admins: 0, sub_admins: 0 })
        setErrorText(err instanceof Error ? err.message : "Unable to load admin accounts")
      } finally {
        if (active) setLoading(false)
      }
    }

    const timer = window.setTimeout(() => {
      void loadAdmins()
    }, 250)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [filterRole, router, searchText, session?.token])

  const removeSubAdmin = async (admin: ManagedAdmin) => {
    if (!session?.token || admin.role !== "sub_admin") return

    const confirmed = window.confirm(`Remove sub admin ${admin.name}? This action cannot be undone.`)
    if (!confirmed) return

    setRemoveBusyId(admin.user_id)
    setErrorText(null)

    try {
      await removeManagedSubAdmin(admin.user_id, session.token)

      setAdmins((current) => current.filter((item) => item.user_id !== admin.user_id))
      setSummary((current) => ({ ...current, sub_admins: Math.max(0, current.sub_admins - 1) }))
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : "Failed to remove sub admin")
    } finally {
      setRemoveBusyId(null)
    }
  }

  const totalCount = summary.super_admins + summary.sub_admins

  return (
    <AppShell role="super" title="Super admin management">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-foreground">Admin team</h3>
            <button
              type="button"
              onClick={async () => {
                setPendingSignupRole("super")
                await router.navigate({ to: "/signup" })
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-glow hover:opacity-95 transition"
            >
              <Plus className="h-4 w-4" /> Add super admin
            </button>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search by admin name, email, or station"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </label>

            <div className="inline-flex rounded-xl border border-border bg-background p-1">
              {([
                { key: "all", label: "All" },
                { key: "super_admin", label: "Super admins" },
                { key: "sub_admin", label: "Sub admins" },
              ] as const).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilterRole(item.key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${filterRole === item.key ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {errorText ? (
            <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {errorText}
            </div>
          ) : null}

          <div className="space-y-3">
            {loading ? (
              <div className="rounded-xl border border-dashed border-border bg-secondary/50 p-4 text-sm text-muted-foreground">
                Loading admin accounts...
              </div>
            ) : admins.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-secondary/50 p-4 text-sm text-muted-foreground">
                No admins found for the current filters.
              </div>
            ) : admins.map((a) => (
              <div key={a.user_id} className="rounded-2xl border border-border p-4 hover:bg-secondary/60 transition">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-primary-foreground text-xs font-semibold">
                      {a.name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">{a.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{a.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-info/15 text-info px-2.5 py-1 text-[11px] font-medium">
                      <ShieldCheck className="h-3 w-3" /> {a.role === "super_admin" ? "Super admin" : "Sub admin"}
                    </span>
                    {a.role === "sub_admin" ? (
                      <button
                        type="button"
                        disabled={removeBusyId === a.user_id}
                        onClick={() => removeSubAdmin(a)}
                        className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-card text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
                        title="Remove sub admin"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                  <span className="rounded-full bg-secondary px-2.5 py-1 font-medium text-secondary-foreground">Status: {a.status}</span>
                  {a.role === "sub_admin" ? (
                    <span className="rounded-full bg-secondary px-2.5 py-1 font-medium text-secondary-foreground">
                      Station: {a.station_name || a.station_id || "Unassigned"}
                    </span>
                  ) : null}
                  <span className="ml-auto self-center">Created {new Date(a.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h3 className="text-sm font-semibold text-foreground mb-4">Admin summary</h3>
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-secondary/40 p-3">
              <div className="text-xs text-muted-foreground">Total admins</div>
              <div className="text-2xl font-semibold text-foreground">{totalCount}</div>
            </div>
            <div className="rounded-xl border border-border bg-secondary/40 p-3">
              <div className="text-xs text-muted-foreground">Super admins</div>
              <div className="text-2xl font-semibold text-foreground">{summary.super_admins}</div>
            </div>
            <div className="rounded-xl border border-border bg-secondary/40 p-3">
              <div className="text-xs text-muted-foreground">Sub admins</div>
              <div className="text-2xl font-semibold text-foreground">{summary.sub_admins}</div>
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  )
}
