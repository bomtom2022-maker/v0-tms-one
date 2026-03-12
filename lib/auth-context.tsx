'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { User, UserRole, AuthSession } from './types'

// Admin oculto - não aparece na lista de usuários
const ADMIN_USER: User = {
  id: 'admin-001',
  name: 'Renan Bassinelo',
  email: 'renan bassinelo',
  password: '8720',
  role: 'manutentor',
  createdAt: new Date(),
  isAdmin: true,
}

// Chave para localStorage
const USERS_STORAGE_KEY = 'tms-one-users'

// Função para carregar usuários do localStorage
function loadUsersFromStorage(): User[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(USERS_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Converter strings de data de volta para objetos Date
      return parsed.map((u: User) => ({
        ...u,
        createdAt: new Date(u.createdAt)
      }))
    }
  } catch (e) {
    console.error('Erro ao carregar usuários:', e)
  }
  return []
}

// Função para salvar usuários no localStorage
function saveUsersToStorage(users: User[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users))
  } catch (e) {
    console.error('Erro ao salvar usuários:', e)
  }
}

interface SupabaseProfile {
  id: string
  name: string
  email: string
  role: UserRole
}

interface AuthContextType {
  session: AuthSession | null
  users: User[] // Lista de usuários visíveis (sem admin)
  login: (email: string, password: string, supabaseProfile?: SupabaseProfile) => { success: boolean; error?: string }
  logout: () => void
  register: (name: string, email: string, password: string, role: UserRole) => { success: boolean; error?: string }
  updateUser: (id: string, name: string, email: string, role: UserRole, password?: string) => { success: boolean; error?: string }
  deleteUser: (id: string) => { success: boolean; error?: string }
  isAuthenticated: boolean
  isManutentor: boolean
  isLider: boolean
  isAdmin: boolean
  currentUser: Omit<User, 'password'> | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([])
  const [session, setSession] = useState<AuthSession | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)

  // Carregar usuários do localStorage na inicialização
  useEffect(() => {
    const storedUsers = loadUsersFromStorage()
    setUsers(storedUsers)
    setIsHydrated(true)
  }, [])

  // Salvar usuários no localStorage quando mudar
  useEffect(() => {
    if (isHydrated) {
      saveUsersToStorage(users)
    }
  }, [users, isHydrated])

  const login = useCallback((email: string, password: string, supabaseProfile?: SupabaseProfile) => {
    // Se vier com profile do Supabase, usar diretamente
    if (supabaseProfile) {
      setSession({
        user: {
          id: supabaseProfile.id,
          name: supabaseProfile.name,
          email: supabaseProfile.email,
          role: supabaseProfile.role,
          createdAt: new Date(),
          isAdmin: false,
        },
        isAuthenticated: true,
      })
      return { success: true }
    }

    // Verificar se e o admin oculto
    if (email.toLowerCase() === ADMIN_USER.email.toLowerCase() && password === ADMIN_USER.password) {
      const { password: _, ...adminWithoutPassword } = ADMIN_USER
      setSession({
        user: adminWithoutPassword,
        isAuthenticated: true,
      })
      return { success: true }
    }
    
    // Verificar usuarios normais locais (fallback)
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase())
    
    if (!user) {
      return { success: false, error: 'Usuário não encontrado' }
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
    // Verificar se email já existe
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, error: 'Email já cadastrado' }
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
    // Verificar se email já existe em outro usuário
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase() && u.id !== id)) {
      return { success: false, error: 'Email já cadastrado em outro usuário' }
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

    // Atualizar sessão se for o usuário logado
    if (session?.user.id === id) {
      setSession(prev => prev ? {
        ...prev,
        user: { ...prev.user, name, email, role },
      } : null)
    }

    return { success: true }
  }, [users, session])

  const deleteUser = useCallback((id: string) => {
    // Não pode deletar a si mesmo
    if (session?.user.id === id) {
      return { success: false, error: 'Você não pode deletar seu próprio usuário' }
    }

    setUsers(prev => prev.filter(u => u.id !== id))
    return { success: true }
  }, [session])

  const isAuthenticated = session?.isAuthenticated ?? false
  const isAdmin = session?.user.isAdmin === true
  const isManutentor = session?.user.role === 'manutentor' || isAdmin
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
      isAdmin,
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
