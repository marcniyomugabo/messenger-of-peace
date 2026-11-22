import { createContext, useContext, useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('mop_user')
    return saved ? JSON.parse(saved) : null
  })
  const [token, setToken] = useState(() => localStorage.getItem('mop_token'))
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (token) {
      api.get('/auth/me')
        .then((res) => {
          const userData = res.data.data
          setUser(userData)
          localStorage.setItem('mop_user', JSON.stringify(userData))
        })
        .catch(() => {
          logout()
        })
    }
  }, [])

  const login = async (email, password) => {
    setLoading(true)
    try {
      const res = await api.post('/auth/login', { email, password })
      const { token: newToken, refreshToken, user: userData } = res.data.data
      localStorage.setItem('mop_token', newToken)
      // Kept so api.js can get a new access token when the 1-hour one expires.
      localStorage.setItem('mop_refresh', refreshToken)
      localStorage.setItem('mop_user', JSON.stringify(userData))
      setToken(newToken)
      setUser(userData)
      // Login does not include permissions; load the full profile so pages can check them.
      api.get('/auth/me').then((me) => {
        setUser(me.data.data)
        localStorage.setItem('mop_user', JSON.stringify(me.data.data))
      }).catch(() => {})
      toast.success('Welcome back!')
      return true
    } catch (err) {
      if (err.code === 'ECONNREFUSED' || err.code === 'ERR_NETWORK' || !err.response) {
        toast.error('Cannot connect to server. Please ensure the backend is running on port 3001.')
      } else if (err.response?.status === 401) {
        toast.error(err.response.data?.message || 'Invalid email or password')
      } else if (err.response?.status === 400) {
        toast.error(err.response.data?.message || 'Invalid input')
      } else if (err.response?.status === 500) {
        toast.error('Server error. Please try again later.')
      } else {
        toast.error(err.response?.data?.message || 'Login failed. Please try again.')
      }
      return false
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      if (token) {
        // Ends this device's sign-in only; other devices stay signed in.
        await api.post('/auth/logout', { refreshToken: localStorage.getItem('mop_refresh') })
      }
    } catch (e) {
      // ignore logout error
    }
    localStorage.removeItem('mop_token')
    localStorage.removeItem('mop_refresh')
    localStorage.removeItem('mop_user')
    setToken(null)
    setUser(null)
  }

  const hasRole = (...roles) => {
    return roles.includes(user?.role)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
