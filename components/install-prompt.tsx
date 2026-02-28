'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Download, X, Smartphone, Share } from 'lucide-react'

// PWA Install Prompt Component

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Verificar se ja esta instalado (modo standalone)
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    
    setIsStandalone(isInStandaloneMode)
    
    if (isInStandaloneMode) return
    
    // Detectar dispositivo
    const userAgent = navigator.userAgent.toLowerCase()
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent)
    const isAndroidDevice = /android/.test(userAgent)
    const isMobileDevice = isIOSDevice || isAndroidDevice || /mobile/.test(userAgent)
    
    setIsIOS(isIOSDevice)
    setIsAndroid(isAndroidDevice)
    setIsMobile(isMobileDevice)
    
    // Verificar se ja foi dispensado recentemente
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      const dismissedTime = parseInt(dismissed)
      // Mostrar novamente apos 1 dia
      if (Date.now() - dismissedTime < 1 * 24 * 60 * 60 * 1000) {
        return
      }
    }
    
    // Para Android/Chrome - capturar o evento beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    
    // Sempre mostrar apos 2 segundos em dispositivos moveis (para dar instrucoes)
    if (isMobileDevice) {
      setTimeout(() => setShowPrompt(true), 2000)
    }
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      setShowPrompt(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }

  // Nao mostrar se ja instalado ou se nao deve mostrar
  if (isStandalone || !showPrompt) return null
  
  // Nao mostrar em desktop (apenas mobile)
  if (!isMobile) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 lg:left-auto lg:right-4 lg:max-w-sm">
      <Card className="bg-slate-800 border-slate-700 shadow-2xl">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center shrink-0">
              <Smartphone className="w-7 h-7 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-white text-base">Instalar TMS One</h3>
              
              {isIOS && (
                <div className="mt-2 space-y-2">
                  <p className="text-sm text-slate-300">
                    Para instalar no iPhone/iPad:
                  </p>
                  <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-700/50 rounded-lg px-3 py-2">
                    <Share className="w-4 h-4 text-blue-400" />
                    <span>Toque em <strong className="text-white">Compartilhar</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-700/50 rounded-lg px-3 py-2">
                    <Download className="w-4 h-4 text-blue-400" />
                    <span>Selecione <strong className="text-white">Adicionar a Tela Inicial</strong></span>
                  </div>
                </div>
              )}
              
              {isAndroid && !deferredPrompt && (
                <div className="mt-2 space-y-2">
                  <p className="text-sm text-slate-300">
                    Para instalar no Android:
                  </p>
                  <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-700/50 rounded-lg px-3 py-2">
                    <span>Toque no menu <strong className="text-white">&#8942;</strong> do navegador</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-700/50 rounded-lg px-3 py-2">
                    <Download className="w-4 h-4 text-blue-400" />
                    <span>Selecione <strong className="text-white">Instalar app</strong> ou <strong className="text-white">Adicionar a tela inicial</strong></span>
                  </div>
                </div>
              )}
              
              {isAndroid && deferredPrompt && (
                <p className="text-sm text-slate-300 mt-2">
                  Acesse o sistema rapidamente com todos os dados salvos
                </p>
              )}
              
              <div className="flex gap-2 mt-4">
                {deferredPrompt && (
                  <Button size="sm" onClick={handleInstall} className="h-9 text-sm bg-blue-600 hover:bg-blue-700">
                    <Download className="w-4 h-4 mr-2" />
                    Instalar Agora
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={handleDismiss} className="h-9 text-sm border-slate-600 text-slate-300 hover:bg-slate-700">
                  Depois
                </Button>
              </div>
            </div>
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={handleDismiss}
              className="h-6 w-6 shrink-0 text-slate-500 hover:text-white -mt-1"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
