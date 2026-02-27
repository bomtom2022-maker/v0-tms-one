'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Download, X, Smartphone } from 'lucide-react'

// PWA Install Prompt Component

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Verificar se ja esta instalado
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    
    setIsStandalone(isInStandaloneMode)
    
    if (isInStandaloneMode) return
    
    // Verificar se e iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(isIOSDevice)
    
    // Verificar se ja foi dispensado recentemente
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      const dismissedTime = parseInt(dismissed)
      // Mostrar novamente apos 7 dias
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
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
    
    // Para iOS - mostrar instrucoes manuais
    if (isIOSDevice) {
      setTimeout(() => setShowPrompt(true), 3000)
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

  if (isStandalone || !showPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <Card className="bg-slate-800 border-slate-700 shadow-xl">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center shrink-0">
              <Smartphone className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white text-sm">Instalar TMS One</h3>
              {isIOS ? (
                <p className="text-xs text-slate-400 mt-1">
                  Toque em <span className="inline-flex items-center px-1 bg-slate-700 rounded">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L12 14M12 14L8 10M12 14L16 10M4 18L20 18"/>
                    </svg>
                  </span> e depois em &quot;Adicionar a Tela Inicial&quot;
                </p>
              ) : (
                <p className="text-xs text-slate-400 mt-1">
                  Acesse o sistema rapidamente pelo celular com todos os dados
                </p>
              )}
              <div className="flex gap-2 mt-3">
                {!isIOS && (
                  <Button size="sm" onClick={handleInstall} className="h-8 text-xs">
                    <Download className="w-3 h-3 mr-1" />
                    Instalar
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={handleDismiss} className="h-8 text-xs text-slate-400">
                  {isIOS ? 'Fechar' : 'Agora nao'}
                </Button>
              </div>
            </div>
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={handleDismiss}
              className="h-6 w-6 shrink-0 text-slate-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
