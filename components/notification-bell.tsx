'use client'

import { useState } from 'react'
import { Bell, BellOff, Volume2, VolumeX, Vibrate, Check, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useNotification } from '@/lib/notification-context'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function NotificationBell() {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    clearAll,
    soundEnabled,
    vibrationEnabled,
    toggleSound,
    toggleVibration,
  } = useNotification()
  
  const [isOpen, setIsOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-500/10 border-l-green-500'
      case 'warning':
        return 'bg-yellow-500/10 border-l-yellow-500'
      case 'error':
        return 'bg-red-500/10 border-l-red-500'
      default:
        return 'bg-blue-500/10 border-l-blue-500'
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
        >
          {unreadCount > 0 ? (
            <Bell className="w-5 h-5" />
          ) : (
            <BellOff className="w-5 h-5 opacity-50" />
          )}
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-500 hover:bg-red-500"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold">Notificacoes</h4>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setShowSettings(!showSettings)}
              title="Configuracoes"
            >
              {showSettings ? <X className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            {notifications.length > 0 && (
              <>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={markAllAsRead}
                  title="Marcar todas como lidas"
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={clearAll}
                  title="Limpar todas"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
        
        {showSettings ? (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                <Label htmlFor="sound-toggle">Som</Label>
              </div>
              <Switch 
                id="sound-toggle"
                checked={soundEnabled}
                onCheckedChange={toggleSound}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Vibrate className="w-4 h-4" />
                <Label htmlFor="vibration-toggle">Vibracao</Label>
              </div>
              <Switch 
                id="vibration-toggle"
                checked={vibrationEnabled}
                onCheckedChange={toggleVibration}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Vibracao funciona apenas em dispositivos moveis com suporte.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <BellOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma notificacao</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id}
                    className={cn(
                      "p-4 border-l-4 cursor-pointer hover:bg-muted/50 transition-colors",
                      getTypeStyles(notification.type),
                      !notification.read && "bg-muted/30"
                    )}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm",
                          !notification.read && "font-semibold"
                        )}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(notification.timestamp, { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  )
}
