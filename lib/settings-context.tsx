'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

// Configuracoes da empresa que serao salvas no banco de dados
export interface CompanySettings {
  // Logo principal (exibida na tela de login acima do TMS)
  logoUrl: string | null
  // Logo da empresa (exibida no header ao lado da logo principal)
  companyLogoUrl: string | null
  // Nome da empresa
  companyName: string
}

interface SettingsContextType {
  settings: CompanySettings
  updateLogo: (logoUrl: string | null) => void
  updateCompanyLogo: (companyLogoUrl: string | null) => void
  updateCompanyName: (companyName: string) => void
  updateSettings: (settings: Partial<CompanySettings>) => void
}

const defaultSettings: CompanySettings = {
  logoUrl: null,
  companyLogoUrl: null,
  companyName: 'Vetore Industrial',
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<CompanySettings>(defaultSettings)

  const updateLogo = useCallback((logoUrl: string | null) => {
    setSettings(prev => ({ ...prev, logoUrl }))
  }, [])

  const updateCompanyLogo = useCallback((companyLogoUrl: string | null) => {
    setSettings(prev => ({ ...prev, companyLogoUrl }))
  }, [])

  const updateCompanyName = useCallback((companyName: string) => {
    setSettings(prev => ({ ...prev, companyName }))
  }, [])

  const updateSettings = useCallback((newSettings: Partial<CompanySettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }, [])

  return (
    <SettingsContext.Provider value={{
      settings,
      updateLogo,
      updateCompanyLogo,
      updateCompanyName,
      updateSettings,
    }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}
