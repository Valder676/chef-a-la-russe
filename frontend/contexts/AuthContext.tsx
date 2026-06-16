'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { api, User } from '@/lib/api'

interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: {
    email: string
    password: string
    fio: string
    phone?: string
    city?: string
    organization?: string
    birthDate?: string
  }) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      if (token) {
        const userData = await api.getProfile()
        setUser(userData)
      }
    } catch (error) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
      }
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const { user: userData } = await api.login(email, password)
      setUser(userData)
    } catch (error: any) {
      throw new Error(error.message || 'Ошибка входа')
    }
  }

  const register = async (data: {
    email: string
    password: string
    fio: string
    phone?: string
    city?: string
    organization?: string
    birthDate?: string
  }) => {
    try {
      const { user: userData } = await api.register(data)
      setUser(userData)
    } catch (error: any) {
      throw new Error(error.message || 'Ошибка регистрации')
    }
  }

  const logout = () => {
    api.logout()
    setUser(null)
  }

  const refreshUser = async () => {
    try {
      const userData = await api.getProfile()
      setUser(userData)
    } catch (error) {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
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
