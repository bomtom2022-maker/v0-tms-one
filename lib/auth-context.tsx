'use client'

// v3 — login por nome, sem useEffect, sem createClient browser
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { fetchProfiles, createUserInSupabase, updateProfileDb, deactivateUserDb } from '@/lib/supabase-data'
import type { User, UserRole, AuthSession } from './types'

// Admin oculto — nao aparece na lista, login puramente local
const ADMIN_USER: User & { password: string } = {
  id: 'admin-001',
  name: 'adm',
  email: 'adm',
  password: '8720',
  role: 'manutentor',
  createdAt: new Date(),
  isAdmin: true,
}

interface AuthContextType {
  session: AuthSession | null
  users: User[]
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  register: (name: string, email: string, password: string, role: UserRole) => Promise<{ success: boolean; error?: string }>
  updateUser: (id: string, name: string, email: string, role: UserRole, password?: string) => Promise<{ success: boolean; error?: string }>
  deleteUser: (id: string) => Promise<{ success: boolean; error?: string }>
  reloadUsers: () => Promise<void>
  isAuthenticated: boolean
  isManutentor: boolean
  isLider: boolean
  isAdmin: boolean
  canManageUsers: boolean
  currentUser: Omit<User, 'password'> | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([])
  const [session, setSession] = useState<AuthSession | null>(null)

  const reloadUsers = useCallback(async () => {
    try {
      const profiles = await fetchProfiles()
      setUsers(profiles.map(p => ({
        id: p.id,
        name: p.name,
        email: p.email,
        role: p.role as UserRole,
        createdAt: new Date(p.created_at),
        password: '',
      })))
    } catch {
      // silencioso — nao autenticado ainda
    }
  }, [])

  const login = useCallback(async (nameOrEmail: string, password: string) => {
    // Admin oculto — login local sem Supabase (usa o nome)
    if (nameOrEmail.toLowerCase() === ADMIN_USER.name.toLowerCase() && password === ADMIN_USER.password) {
      setSession({
        user: {
          id: ADMIN_USER.id,
          name: ADMIN_USER.name,
          email: ADMIN_USER.email,
          role: ADMIN_USER.role,
          createdAt: ADMIN_USER.createdAt,
          isAdmin: true,
        },
        isAuthenticated: true,
      })
      await reloadUsers()
      return { success: true }
    }

    // Login via API Route passando o nome do usuario
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameOrEmail, password }),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Erro ao fazer login. Tente novamente.' }
    }

    const profile = data.profile
    setSession({
      user: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role as UserRole,
        createdAt: new Date(profile.created_at),
        isAdmin: false,
      },
      isAuthenticated: true,
    })
    await reloadUsers()
    return { success: true }
  }, [reloadUsers])

  const logout = useCallback(async () => {
    setSession(null)
    setUsers([])
  }, [])

  const register = useCallback(async (name: string, email: string, password: string, role: UserRole) => {
    try {
      await createUserInSupabase(name, email, password, role)
      await reloadUsers()
      return { success: true }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao cadastrar usuario'
      if (
        msg.toLowerCase().includes('already registered') ||
        msg.toLowerCase().includes('already been registered') ||
        msg.toLowerCase().includes('duplicate') ||
        msg.toLowerCase().includes('ja cadastrado')
      ) {
        return { success: false, error: 'Este email ja esta cadastrado. Use outro email ou edite o usuario existente.' }
      }
      return { success: false, error: msg }
    }
  }, [reloadUsers])

  const updateUser = useCallback(async (id: string, name: string, email: string, role: UserRole) => {
    try {
      await updateProfileDb(id, { name, email, role })
      await reloadUsers()
      // Atualizar sessao se for o usuario logado
      if (session?.user.id === id) {
        setSession(prev => prev ? { ...prev, user: { ...prev.user, name, email, role } } : null)
      }
      return { success: true }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Erro ao atualizar usuario' }
    }
  }, [session, reloadUsers])

  const deleteUser = useCallback(async (id: string) => {
    if (session?.user.id === id) {
      return { success: false, error: 'Voce nao pode desativar seu proprio usuario' }
    }
    try {
      await deactivateUserDb(id)
      await reloadUsers()
      return { success: true }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Erro ao excluir usuario' }
    }
  }, [session, reloadUsers])

  const isAuthenticated = session?.isAuthenticated ?? false
  const isAdmin = session?.user.isAdmin === true
  // Apenas o admin (conta "adm") pode gerenciar usuarios
  const canManageUsers = isAdmin
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
      reloadUsers,
      isAuthenticated,
      isManutentor,
      isLider,
      isAdmin,
      canManageUsers,
      currentUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
