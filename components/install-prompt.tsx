'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Download, Smartphone, Share, MoreVertical, CheckCircle2 } from 'lucide-react'

// PWA Install Prompt Component

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// Guardar o evento globalmente para poder usar depois
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null

// Funcao exportada para instalar o app
export async function triggerInstall(): Promise<boolean> {
  if (!globalDeferredPrompt) {
    return false
  }
  
  try {
    await globalDeferredPrompt.prompt()
    const { outcome } = await globalDeferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      localStorage.setItem('pwa-installed', 'true')
      globalDeferredPrompt = null
      return true
    }
  } catch (error) {
    console.log('[v0] Erro ao instalar PWA:', error)
  }
  
  return false
}

// Verificar se pode instalar
export function canInstall(): boolean {
  return !!globalDeferredPrompt
}

// Verificar se ja esta instalado
export function isInstalled(): boolean {
  if (typeof window === 'undefined') return false
  
  const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  
  return isInStandaloneMode || localStorage.getItem('pwa-installed') === 'true'
}

// Evento para abrir modal de instrucoes
let openInstallModalCallback: (() => void) | null = null

export function setOpenInstallModal(callback: () => void) {
  openInstallModalCallback = callback
}

export function openInstallModal() {
  if (openInstallModalCallback) {
    openInstallModalCallback()
  }
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [installed, setInstalled] = useState(false)

  // Registrar callback para abrir modal externamente
  useEffect(() => {
    setOpenInstallModal(() => setShowModal(true))
    return () => {
      setOpenInstallModal(() => {})
    }
  }, [])

  useEffect(() => {
    // Verificar se ja esta instalado (modo standalone)
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    
    setIsStandalone(isInStandaloneMode)
    
    if (isInStandaloneMode) {
      setInstalled(true)
      return
    }
    
    // Detectar dispositivo
    const userAgent = navigator.userAgent.toLowerCase()
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent)
    const isAndroidDevice = /android/.test(userAgent)
    const isMobileDevice = isIOSDevice || isAndroidDevice || /mobile/.test(userAgent)
    
    setIsIOS(isIOSDevice)
    setIsAndroid(isAndroidDevice)
    setIsMobile(isMobileDevice)
    
    // Verificar se ja foi instalado ou dispensado
    const wasInstalled = localStorage.getItem('pwa-installed')
    if (wasInstalled) {
      setInstalled(true)
      return
    }
    
    const dismissedStr = localStorage.getItem('pwa-install-dismissed')
    let wasDismissedRecently = false
    if (dismissedStr) {
      const dismissedTime = parseInt(dismissedStr)
      // Mostrar novamente apos 1 dia
      if (Date.now() - dismissedTime < 1 * 24 * 60 * 60 * 1000) {
        wasDismissedRecently = true
      }
    }
    
    // Para Android/Chrome - capturar o evento beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      globalDeferredPrompt = e as BeforeInstallPromptEvent
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Disparar evento customizado para atualizar outros componentes
      window.dispatchEvent(new CustomEvent('pwa-install-available'))
    }
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    
    // Verificar se ja tem o prompt salvo
    if (globalDeferredPrompt) {
      setDeferredPrompt(globalDeferredPrompt)
    }
    
    // Mostrar modal automaticamente apos 2 segundos em dispositivos moveis (se nao dispensou recentemente)
    if (isMobileDevice && !wasDismissedRecently) {
      setTimeout(() => setShowModal(true), 2000)
    }
    
    // Detectar quando o app foi instalado
    window.addEventListener('appinstalled', () => {
      setInstalled(true)
      setShowModal(false)
      localStorage.setItem('pwa-installed', 'true')
    })
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  const handleInstall = useCallback(async () => {
    const promptToUse = deferredPrompt || globalDeferredPrompt
    
    if (!promptToUse) {
      // Se nao tem o prompt, mostrar instrucoes
      return
    }
    
    setInstalling(true)
    
    try {
      await promptToUse.prompt()
      const { outcome } = await promptToUse.userChoice
      
      if (outcome === 'accepted') {
        setInstalled(true)
        setShowModal(false)
        localStorage.setItem('pwa-installed', 'true')
      }
    } catch (error) {
      console.log('[v0] Erro ao instalar PWA:', error)
    } finally {
      setInstalling(false)
      setDeferredPrompt(null)
      globalDeferredPrompt = null
    }
  }, [deferredPrompt])

  const handleDismiss = () => {
    setShowModal(false)
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }

  // Nao mostrar se ja instalado
  if (isStandalone || installed) return null

  const canInstallDirectly = !!(deferredPrompt || globalDeferredPrompt)

  return (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white">
        <DialogHeader className="text-center">
          <div className="mx-auto w-20 h-20 bg-blue-500/20 rounded-3xl flex items-center justify-center mb-4">
            <Smartphone className="w-10 h-10 text-blue-400" />
          </div>
          <DialogTitle className="text-2xl font-bold text-white">
            Instalar TMS One
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-base">
            Tenha acesso rapido ao sistema direto do seu celular
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Beneficios */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              <span>Acesso rapido pela tela inicial</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              <span>Funciona em tela cheia</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              <span>Notificacoes com som e vibracao</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              <span>Login e dados salvos</span>
            </div>
          </div>

          {/* Botao de instalacao direta (Android com suporte) */}
          {canInstallDirectly && (
            <Button 
              onClick={handleInstall} 
              disabled={installing}
              className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700 mt-4"
            >
              {installing ? (
                <>Instalando...</>
              ) : (
                <>
                  <Download className="w-6 h-6 mr-3" />
                  Baixar e Instalar
                </>
              )}
            </Button>
          )}

          {/* Instrucoes para iOS */}
          {isIOS && (
            <div className="bg-slate-800 rounded-xl p-4 space-y-3 mt-4">
              <p className="text-sm font-medium text-white">
                Como instalar no iPhone/iPad:
              </p>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center shrink-0">
                  <Share className="w-5 h-5 text-blue-400" />
                </div>
                <span>1. Toque no botao <strong className="text-white">Compartilhar</strong></span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5 text-blue-400" />
                </div>
                <span>2. Selecione <strong className="text-white">Adicionar a Tela Inicial</strong></span>
              </div>
            </div>
          )}

          {/* Instrucoes para Android sem suporte direto */}
          {isAndroid && !canInstallDirectly && (
            <div className="bg-slate-800 rounded-xl p-4 space-y-3 mt-4">
              <p className="text-sm font-medium text-white">
                Como instalar no Android:
              </p>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center shrink-0">
                  <MoreVertical className="w-5 h-5 text-blue-400" />
                </div>
                <span>1. Toque no menu <strong className="text-white">&#8942;</strong> do navegador</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5 text-blue-400" />
                </div>
                <span>2. Selecione <strong className="text-white">Instalar app</strong></span>
              </div>
            </div>
          )}

          {/* Instrucoes para Desktop/outros navegadores */}
          {!isMobile && !canInstallDirectly && (
            <div className="bg-slate-800 rounded-xl p-4 space-y-3 mt-4">
              <p className="text-sm font-medium text-white">
                Como instalar no computador:
              </p>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5 text-blue-400" />
                </div>
                <span>Clique no icone de instalar na barra de endereco do navegador</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-2">
          <Button 
            variant="outline" 
            onClick={handleDismiss}
            className="flex-1 h-12 border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            Agora nao
          </Button>
          {!canInstallDirectly && (
            <Button 
              onClick={handleDismiss}
              className="flex-1 h-12 bg-blue-600 hover:bg-blue-700"
            >
              Entendi
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
