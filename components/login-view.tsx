'use client'

import { useState, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useSettings } from '@/lib/settings-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Wrench, AlertCircle, Eye, EyeOff, Upload, ImageIcon } from 'lucide-react'
import Image from 'next/image'

export function LoginView() {
  const { login } = useAuth()
  const { settings, updateLogo } = useSettings()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // Simular delay de rede
    await new Promise(resolve => setTimeout(resolve, 500))

    const result = login(email, password)
    
    if (!result.success) {
      setError(result.error || 'Erro ao fazer login')
    }
    
    setIsLoading(false)
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        setError('Por favor, selecione uma imagem valida')
        return
      }
      
      // Validar tamanho (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError('A imagem deve ter no maximo 2MB')
        return
      }

      // Converter para base64 (temporario - sera URL do banco depois)
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64 = event.target?.result as string
        updateLogo(base64)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          {/* Area da Logo - Clicavel para upload */}
          <div 
            className="mx-auto relative group cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {settings.logoUrl ? (
              <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-dashed border-transparent group-hover:border-primary/50 transition-colors">
                <Image
                  src={settings.logoUrl}
                  alt="Logo da empresa"
                  fill
                  className="object-contain"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Upload className="w-6 h-6 text-white" />
                </div>
              </div>
            ) : (
              <div className="w-24 h-24 bg-muted rounded-xl border-2 border-dashed border-muted-foreground/30 group-hover:border-primary/50 flex flex-col items-center justify-center transition-colors">
                <ImageIcon className="w-8 h-8 text-muted-foreground/50 group-hover:text-primary/70" />
                <span className="text-xs text-muted-foreground/50 mt-1 group-hover:text-primary/70">Adicionar logo</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </div>
          
          <div className="flex items-center justify-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Wrench className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="text-left">
              <CardTitle className="text-2xl font-bold">TMS One</CardTitle>
              <CardDescription className="text-sm">
                Sistema de Gestao de Manutencao
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={isLoading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-muted-foreground text-center mb-3">
              Usuarios de demonstracao:
            </p>
            <div className="grid gap-2 text-xs">
              <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                <div>
                  <span className="font-medium">Manutentor:</span>
                  <span className="text-muted-foreground ml-2">carlos@vetore.com</span>
                </div>
                <span className="text-muted-foreground">123456</span>
              </div>
              <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                <div>
                  <span className="font-medium">Lider:</span>
                  <span className="text-muted-foreground ml-2">maria@vetore.com</span>
                </div>
                <span className="text-muted-foreground">123456</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-center text-muted-foreground mt-6">
            Desenvolvido por Vetore
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
