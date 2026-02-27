'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { User, UserRole, AuthSession } from './types'

// Usuarios iniciais para demonstracao
const INITIAL_USERS: User[] = [
  {
    id: 'user-001',
    name: 'Carlos Silva',
    email: 'carlos@vetore.com',
    password: '123456',
    role: 'manutentor',
    createdAt: new Date(),
  },
  {
    id: 'user-002',
    name: 'Maria Santos',
    email: 'maria@vetore.com',
    password: '123456',
    role: 'lider',
    createdAt: new Date(),
  },
  {
    id: 'user-003',
    name: 'Joao Pereira',
    email: 'joao@vetore.com',
    password: '123456',
    role: 'manutentor',
    createdAt: new Date(),
  },
  {
    id: 'user-004',
    name: 'Ana Costa',
    email: 'ana@vetore.com',
    password: '123456',
    role: 'lider',
    createdAt: new Date(),
  },
]

interface AuthContextType {
  session: AuthSession | null
  users: User[]
  login: (email: string, password: string) => { success: boolean; error?: string }
  logout: () => void
  register: (name: string, email: string, password: string, role: UserRole) => { success: boolean; error?: string }
  updateUser: (id: string, name: string, email: string, role: UserRole, password?: string) => { success: boolean; error?: string }
  deleteUser: (id: string) => { success: boolean; error?: string }
  isAuthenticated: boolean
  isManutentor: boolean
  isLider: boolean
  currentUser: Omit<User, 'password'> | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(INITIAL_USERS)
  const [session, setSession] = useState<AuthSession | null>(null)

  const login = useCallback((email: string, password: string) => {
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase())
    
    if (!user) {
      return { success: false, error: 'Usuario nao encontrado' }
    }
    
    if (user.password !== password) {
      return { success: false, error: 'Senha incorreta' }
    }

    const { password: _, ...userWithoutPassword } = user
    setSession({
      user: userWithoutPassword,
      isAuthenticated: true,
    })
    
    return { success: true }
  }, [users])

  const logout = useCallback(() => {
    setSession(null)
  }, [])

  const register = useCallback((name: string, email: string, password: string, role: UserRole) => {
    // Verificar se email ja existe
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, error: 'Email ja cadastrado' }
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      name,
      email,
      password,
      role,
      createdAt: new Date(),
    }

    setUsers(prev => [...prev, newUser])
    return { success: true }
  }, [users])

  const updateUser = useCallback((id: string, name: string, email: string, role: UserRole, password?: string) => {
    // Verificar se email ja existe em outro usuario
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase() && u.id !== id)) {
      return { success: false, error: 'Email ja cadastrado em outro usuario' }
    }

    setUsers(prev => prev.map(u => {
      if (u.id !== id) return u
      return {
        ...u,
        name,
        email,
        role,
        ...(password ? { password } : {}),
      }
    }))

    // Atualizar sessao se for o usuario logado
    if (session?.user.id === id) {
      setSession(prev => prev ? {
        ...prev,
        user: { ...prev.user, name, email, role },
      } : null)
    }

    return { success: true }
  }, [users, session])

  const deleteUser = useCallback((id: string) => {
    // Nao pode deletar a si mesmo
    if (session?.user.id === id) {
      return { success: false, error: 'Voce nao pode deletar seu proprio usuario' }
    }

    setUsers(prev => prev.filter(u => u.id !== id))
    return { success: true }
  }, [session])

  const isAuthenticated = session?.isAuthenticated ?? false
  const isManutentor = session?.user.role === 'manutentor'
  const isLider = session?.user.role === 'lider'
  const currentUser = session?.user ?? null

  return (
    <AuthContext.Provider value={{
      session,
      users,
      login,
      logout,
      register,
      updateUser,
      deleteUser,
      isAuthenticated,
      isManutentor,
      isLider,
      currentUser,
    }}>
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
