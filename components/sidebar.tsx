'use client'

import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  Plus, 
  Wrench, 
  Package, 
  BarChart3,
  Menu,
  X,
  Settings
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

type View = 'dashboard' | 'new-ticket' | 'maintenance' | 'parts' | 'reports'

interface SidebarProps {
  currentView: View
  onViewChange: (view: View) => void
}

const menuItems = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'new-ticket' as const, label: 'Novo Chamado', icon: Plus },
  { id: 'maintenance' as const, label: 'Manutenção', icon: Wrench },
  { id: 'parts' as const, label: 'Peças', icon: Package },
  { id: 'reports' as const, label: 'Relatórios', icon: BarChart3 },
]

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleNavigation = (view: View) => {
    onViewChange(view)
    setMobileOpen(false)
  }

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
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-sidebar-foreground"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
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
        "fixed top-0 left-0 z-40 h-full w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300",
        "lg:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="hidden lg:flex items-center gap-3 p-6 border-b border-sidebar-border">
          <div className="w-10 h-10 bg-sidebar-primary rounded-xl flex items-center justify-center">
            <Settings className="w-6 h-6 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-sidebar-foreground">TMS One</h1>
            <p className="text-xs text-sidebar-foreground/60">Vetore Industrial</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 pt-20 lg:pt-4 space-y-1">
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

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-border">
          <p className="text-xs text-sidebar-foreground/50 text-center">
            Tool Manager System v1.0
          </p>
        </div>
      </aside>
    </>
  )
}
