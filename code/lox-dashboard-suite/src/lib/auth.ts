export type AdminRole = "sub_admin" | "super_admin"
export type SignupRole = "sub" | "super"

export type AuthSession = {
  token: string
  token_type: string
  expires_in: string
  user: {
    user_id: string
    name: string
    email: string
    phone?: string | null
    nic_number?: string | null
    age?: number | null
    role: AdminRole
    status: string
    station_id?: string | null
    station_name?: string | null
    locker_id?: string | null
    created_at?: string
  }
}

const LOCAL_KEY = "lox.auth.session"
const SESSION_KEY = "lox.auth.session.temp"
const PENDING_SIGNUP_ROLE_KEY = "lox.signup.role"

export const adminRoleLabel: Record<AdminRole, string> = {
  sub_admin: "Sub Admin",
  super_admin: "Super Admin"
}

export function getAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null

  const raw = window.localStorage.getItem(LOCAL_KEY) || window.sessionStorage.getItem(SESSION_KEY)

  if (!raw) return null

  try {
    return JSON.parse(raw) as AuthSession
  } catch {
    return null
  }
}

export function setAuthSession(session: AuthSession, remember = true) {
  if (typeof window === "undefined") return

  const raw = JSON.stringify(session)
  window.localStorage.removeItem(LOCAL_KEY)
  window.sessionStorage.removeItem(SESSION_KEY)

  if (remember) {
    window.localStorage.setItem(LOCAL_KEY, raw)
    return
  }

  window.sessionStorage.setItem(SESSION_KEY, raw)
}

export function clearAuthSession() {
  if (typeof window === "undefined") return

  window.localStorage.removeItem(LOCAL_KEY)
  window.sessionStorage.removeItem(SESSION_KEY)
}

export function setPendingSignupRole(role: SignupRole) {
  if (typeof window === "undefined") return

  window.sessionStorage.setItem(PENDING_SIGNUP_ROLE_KEY, role)
}

export function consumePendingSignupRole(): SignupRole {
  if (typeof window === "undefined") return "sub"

  const role = window.sessionStorage.getItem(PENDING_SIGNUP_ROLE_KEY)
  window.sessionStorage.removeItem(PENDING_SIGNUP_ROLE_KEY)

  return role === "super" ? "super" : "sub"
}