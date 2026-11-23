import axios from 'axios'

// The API address. By default the API is on the same site ("/api"): locally the Vite dev server
// forwards /api to the server on port 3001 (vite.config.js); online one server serves both.
// To use an API on another address, build with VITE_API_URL=https://api.example.org/api
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('mop_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

const goToLogin = () => {
  localStorage.removeItem('mop_token')
  localStorage.removeItem('mop_refresh')
  localStorage.removeItem('mop_user')
  window.location.href = '/login'
}

// One refresh at a time: when a page fires many requests and they all get 401,
// they share this single call instead of each asking for new tokens.
let refreshPromise = null

const refreshTokens = () => {
  if (!refreshPromise) {
    const refreshToken = localStorage.getItem('mop_refresh')
    refreshPromise = (refreshToken
      ? axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken }).then((res) => {
          localStorage.setItem('mop_token', res.data.data.token)
          localStorage.setItem('mop_refresh', res.data.data.refreshToken)
        })
      : Promise.reject(new Error('No refresh token'))
    ).catch((err) => {
      // Another tab may have renewed the tokens first (each refresh token works once).
      if (localStorage.getItem('mop_refresh') !== refreshToken) return
      throw err
    }).finally(() => { refreshPromise = null })
  }
  return refreshPromise
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    // A wrong password on the login page is also a 401; let the page show its message.
    const isAuthRequest = /\/auth\/(login|refresh)/.test(original?.url || '')
    if (error.response?.status !== 401 || isAuthRequest || !original || original._retried) {
      if (error.response?.status === 401 && original?._retried) goToLogin()
      return Promise.reject(error)
    }

    // The access token (valid 1 hour) has expired: get a new one and repeat the request.
    original._retried = true
    const usedToken = original.headers?.Authorization
    const storedToken = localStorage.getItem('mop_token')
    try {
      if (!storedToken || `Bearer ${storedToken}` === usedToken) await refreshTokens()
      original.headers.Authorization = `Bearer ${localStorage.getItem('mop_token')}`
      return api(original)
    } catch {
      goToLogin()
      return Promise.reject(error)
    }
  }
)

export default api
