import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { AuthState, TwitchUser } from '../types'
import { parseTokenFromHash, fetchCurrentUser, validateToken } from '../utils/twitchApi'

interface AuthContextType extends AuthState {
  login: () => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

const TOKEN_KEY = 'ss_twitch_token'

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    accessToken: null,
    user: null,
    isLoading: true,
    error: null,
  })

  const login = useCallback(() => {
    const params = new URLSearchParams({
      client_id: '597lloly8zvjnjxg3rq32u5eveyt9d',
      redirect_uri: 'http://localhost:3000',
      response_type: 'token',
      scope: 'user:read:email user:read:follows channel:read:subscriptions moderator:read:followers',
    })
    window.location.href = `https://id.twitch.tv/oauth2/authorize?${params}`
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setState({ accessToken: null, user: null, isLoading: false, error: null })
  }, [])

  const loadUser = useCallback(async (token: string) => {
    setState(s => ({ ...s, isLoading: true, error: null }))
    try {
      const valid = await validateToken(token)
      if (!valid) {
        localStorage.removeItem(TOKEN_KEY)
        setState({ accessToken: null, user: null, isLoading: false, error: null })
        return
      }
      const user = await fetchCurrentUser(token)
      localStorage.setItem(TOKEN_KEY, token)
      setState({ accessToken: token, user, isLoading: false, error: null })
    } catch (e) {
      setState(s => ({ ...s, isLoading: false, error: 'Failed to load user' }))
    }
  }, [])

  useEffect(() => {
    const hashToken = parseTokenFromHash()
    if (hashToken) {
      window.history.replaceState({}, document.title, window.location.pathname)
      loadUser(hashToken)
      return
    }
    const stored = localStorage.getItem(TOKEN_KEY)
    if (stored) {
      loadUser(stored)
    } else {
      setState(s => ({ ...s, isLoading: false }))
    }
  }, [loadUser])

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
