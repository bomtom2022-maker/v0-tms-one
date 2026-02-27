'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { useAuth } from './auth-context'

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'error'
  timestamp: Date
  read: boolean
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  notify: (title: string, message: string, type?: Notification['type']) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearAll: () => void
  soundEnabled: boolean
  vibrationEnabled: boolean
  toggleSound: () => void
  toggleVibration: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

// Som de notificacao usando Web Audio API
function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    
    // Criar oscilador para som de notificacao
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    // Configurar som - dois beeps curtos
    oscillator.frequency.value = 800
    oscillator.type = 'sine'
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.15)
    
    // Segundo beep
    setTimeout(() => {
      const osc2 = audioContext.createOscillator()
      const gain2 = audioContext.createGain()
      
      osc2.connect(gain2)
      gain2.connect(audioContext.destination)
      
      osc2.frequency.value = 1000
      osc2.type = 'sine'
      
      gain2.gain.setValueAtTime(0.3, audioContext.currentTime)
      gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15)
      
      osc2.start(audioContext.currentTime)
      osc2.stop(audioContext.currentTime + 0.15)
    }, 180)
  } catch (e) {
    console.log('Audio not supported', e)
  }
}

// Vibracao do dispositivo
function vibrateDevice() {
  try {
    if ('vibrate' in navigator) {
      // Padrao de vibracao: vibra 200ms, pausa 100ms, vibra 200ms
      navigator.vibrate([200, 100, 200])
    }
  } catch (e) {
    console.log('Vibration not supported', e)
  }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [vibrationEnabled, setVibrationEnabled] = useState(true)
  const { currentUser } = useAuth()

  // Carregar preferencias do localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSound = localStorage.getItem('tms_sound_enabled')
      const savedVibration = localStorage.getItem('tms_vibration_enabled')
      if (savedSound !== null) setSoundEnabled(savedSound === 'true')
      if (savedVibration !== null) setVibrationEnabled(savedVibration === 'true')
    }
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  const notify = useCallback((title: string, message: string, type: Notification['type'] = 'info') => {
    const newNotification: Notification = {
      id: `notif-${Date.now()}`,
      title,
      message,
      type,
      timestamp: new Date(),
      read: false,
    }
    
    setNotifications(prev => [newNotification, ...prev].slice(0, 50)) // Manter max 50 notificacoes
    
    // Tocar som se habilitado
    if (soundEnabled) {
      playNotificationSound()
    }
    
    // Vibrar se habilitado
    if (vibrationEnabled) {
      vibrateDevice()
    }
  }, [soundEnabled, vibrationEnabled])

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ))
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      const newValue = !prev
      localStorage.setItem('tms_sound_enabled', String(newValue))
      return newValue
    })
  }, [])

  const toggleVibration = useCallback(() => {
    setVibrationEnabled(prev => {
      const newValue = !prev
      localStorage.setItem('tms_vibration_enabled', String(newValue))
      return newValue
    })
  }, [])

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      notify,
      markAsRead,
      markAllAsRead,
      clearAll,
      soundEnabled,
      vibrationEnabled,
      toggleSound,
      toggleVibration,
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}
