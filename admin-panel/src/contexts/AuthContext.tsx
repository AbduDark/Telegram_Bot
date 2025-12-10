import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import api from '../services/api'

interface Admin {
  id: number
  username: string
  role: string
}

interface AuthContextType {
  admin: Admin | null
  isAuthenticated: boolean
  loading: boolean
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      fetchCurrentAdmin()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchCurrentAdmin = async () => {
    try {
      const response = await api.get('/admin/me')
      setAdmin(response.data)
    } catch {
      localStorage.removeItem('adminToken')
      localStorage.removeItem('refreshToken')
      delete api.defaults.headers.common['Authorization']
    } finally {
      setLoading(false)
    }
  }

  const login = async (username: string, password: string) => {
    try {
      const response = await api.post('/admin/login', { username, password })
      const { token, refreshToken, admin: adminData } = response.data
      
      localStorage.setItem('adminToken', token)
      localStorage.setItem('refreshToken', refreshToken)
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      
      setAdmin(adminData)
      return { success: true }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      return { 
        success: false, 
        error: err.response?.data?.error || 'فشل تسجيل الدخول' 
      }
    }
  }

  const logout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('refreshToken')
    delete api.defaults.headers.common['Authorization']
    setAdmin(null)
  }

  return (
    <AuthContext.Provider value={{
      admin,
      isAuthenticated: !!admin,
      loading,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}