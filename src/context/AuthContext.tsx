import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { AdminUser } from "../lib/api"
import { adminMe, setOnUnauthorized } from "../lib/api"

const TOKEN_KEY = "admin_token"
const USER_KEY = "admin_user"

type AuthState = {
  user: AdminUser | null
  token: string | null
  loading: boolean
  checked: boolean
}

type AuthContextValue = AuthState & {
  login: (token: string, user: AdminUser) => void
  logout: () => void
  setUser: (user: AdminUser | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const readStoredUser = (): AdminUser | null => {
  const stored = localStorage.getItem(USER_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored) as AdminUser
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    return {
      user: token ? readStoredUser() : null,
      token,
      loading: Boolean(token),
      checked: !token,
    }
  })

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setState({
      user: null,
      token: null,
      loading: false,
      checked: true,
    })
  }, [])

  const login = useCallback((token: string, user: AdminUser) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    setState({
      user,
      token,
      loading: false,
      checked: true,
    })
  }, [])

  const setUser = useCallback((user: AdminUser | null) => {
    setState((prev) => ({ ...prev, user }))
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
  }, [])

  useEffect(() => {
    setOnUnauthorized(logout)
    return () => setOnUnauthorized(null)
  }, [logout])

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return

    let cancelled = false

    const validateSession = async () => {
      try {
        const { user } = await adminMe()
        if (cancelled) return
        localStorage.setItem(USER_KEY, JSON.stringify(user))
        setState({
          user,
          token,
          loading: false,
          checked: true,
        })
      } catch {
        if (cancelled) return
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        setState({
          user: null,
          token: null,
          loading: false,
          checked: true,
        })
      }
    }

    void validateSession()
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      logout,
      setUser,
    }),
    [state, login, logout, setUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
