'use client'

import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { NotificationBell } from '@/components/notification-bell'
import { 
  LayoutDashboard, 
  Plus, 
  Wrench, 
  Package, 
  BarChart3,
  Menu,
  X,
  Settings,
  Cog,
  CalendarClock,
  Users,
  LogOut,
  Shield,
  User
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useState } from 'react'

type View = 'dashboard' | 'new-ticket' | 'problems' | 'machines' | 'maintenance' | 'parts' | 'reports' | 'scheduled' | 'users'

interface SidebarProps {
  currentView: View
  onViewChange: (view: View) => void
}

const allMenuItems = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard, roles: ['manutentor', 'lider'] },
  { id: 'new-ticket' as const, label: 'Novo Chamado', icon: Plus, roles: ['manutentor', 'lider'] },
  { id: 'scheduled' as const, label: 'Manutencoes Futuras', icon: CalendarClock, roles: ['manutentor'] },
  { id: 'machines' as const, label: 'Maquinas', icon: Cog, roles: ['manutentor'] },
  { id: 'problems' as const, label: 'Problemas', icon: Wrench, roles: ['manutentor'] },
  { id: 'parts' as const, label: 'Pecas', icon: Package, roles: ['manutentor'] },
  { id: 'users' as const, label: 'Usuarios', icon: Users, roles: ['manutentor'] },
  { id: 'reports' as const, label: 'Relatorios', icon: BarChart3, roles: ['manutentor'] },
]

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { currentUser, logout, isManutentor } = useAuth()

  const menuItems = allMenuItems.filter(item => 
    item.roles.includes(currentUser?.role || 'lider')
  )

  const handleNavigation = (view: View) => {
    onViewChange(view)
    setMobileOpen(false)
  }

  const handleLogout = () => {
    logout()
    setMobileOpen(false)
  }

  const roleConfig = isManutentor 
    ? { label: 'Manutentor', icon: Shield, color: 'bg-blue-500', textColor: 'text-blue-600' }
    : { label: 'Lider', icon: User, color: 'bg-amber-500', textColor: 'text-amber-600' }

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-sidebar-foreground">TMS One</h1>
              <p className="text-xs text-sidebar-foreground/60">Vetore</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setMobileOpen(!mobileOpen)}
              className="text-sidebar-foreground"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-40 h-full w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300 flex flex-col",
        "lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="hidden lg:flex items-center justify-between p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sidebar-primary rounded-xl flex items-center justify-center">
              <Settings className="w-6 h-6 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-sidebar-foreground">TMS One</h1>
              <p className="text-xs text-sidebar-foreground/60">Vetore Industrial</p>
            </div>
          </div>
          <NotificationBell />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 pt-20 lg:pt-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = currentView === item.id
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left",
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-sidebar-accent/50 transition-colors">
                <div className={cn("w-9 h-9 rounded-full flex items-center justify-center", roleConfig.color)}>
                  <roleConfig.icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {currentUser?.name}
                  </p>
                  <p className="text-xs text-sidebar-foreground/60">
                    {roleConfig.label}
                  </p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{currentUser?.name}</span>
                  <span className="text-xs font-normal text-muted-foreground">{currentUser?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Badge className={cn("mr-2", roleConfig.color, "text-white")}>
                  {roleConfig.label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {isManutentor ? 'Acesso total' : 'Acesso limitado'}
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border">
          <p className="text-xs text-sidebar-foreground/50 text-center">
            Tool Manager System v1.0
          </p>
        </div>
      </aside>
    </>
  )
}
