'use client'

import { useRef, useState } from 'react'
import { useSettings } from '@/lib/settings-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, Trash2, ImageIcon, Building2, CheckCircle2 } from 'lucide-react'
import Image from 'next/image'

export function SettingsView() {
  const { settings, updateLogo, updateCompanyLogo, updateCompanyName } = useSettings()
  const logoInputRef = useRef<HTMLInputElement>(null)
  const companyLogoInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [companyNameInput, setCompanyNameInput] = useState(settings.companyName)

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    updateFn: (url: string | null) => void
  ) => {
    const file = e.target.files?.[0]
    setError('')
    setSuccess('')
    
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Por favor, selecione uma imagem valida')
        return
      }
      
      if (file.size > 2 * 1024 * 1024) {
        setError('A imagem deve ter no maximo 2MB')
        return
      }

      const reader = new FileReader()
      reader.onload = (event) => {
        const base64 = event.target?.result as string
        updateFn(base64)
        setSuccess('Logo atualizada com sucesso!')
        setTimeout(() => setSuccess(''), 3000)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveCompanyName = () => {
    updateCompanyName(companyNameInput)
    setSuccess('Nome da empresa atualizado!')
    setTimeout(() => setSuccess(''), 3000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Configuracoes</h1>
        <p className="text-muted-foreground">
          Personalize o sistema com a identidade visual da empresa
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="border-green-500 bg-green-50 text-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Nome da Empresa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Nome da Empresa
          </CardTitle>
          <CardDescription>
            Nome exibido no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              value={companyNameInput}
              onChange={(e) => setCompanyNameInput(e.target.value)}
              placeholder="Nome da empresa"
              className="max-w-sm"
            />
            <Button onClick={handleSaveCompanyName}>
              Salvar
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Logo Principal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Logo Principal
            </CardTitle>
            <CardDescription>
              Exibida na tela de login e no topo do menu lateral
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {settings.logoUrl ? (
                <div className="relative w-24 h-24 rounded-xl border overflow-hidden bg-muted">
                  <Image
                    src={settings.logoUrl}
                    alt="Logo principal"
                    fill
                    className="object-contain"
                  />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/50">
                  <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
                </div>
              )}
              
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={() => logoInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {settings.logoUrl ? 'Trocar' : 'Carregar'}
                </Button>
                
                {settings.logoUrl && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => updateLogo(null)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remover
                  </Button>
                )}
              </div>
            </div>
            
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, updateLogo)}
              className="hidden"
            />
            
            <p className="text-xs text-muted-foreground">
              Recomendado: imagem quadrada, max 2MB
            </p>
          </CardContent>
        </Card>

        {/* Logo da Empresa (Retangular) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Logo da Empresa
            </CardTitle>
            <CardDescription>
              Logo secundaria em formato retangular para o cabecalho
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {settings.companyLogoUrl ? (
                <div className="relative w-32 h-16 rounded-lg border overflow-hidden bg-muted">
                  <Image
                    src={settings.companyLogoUrl}
                    alt="Logo da empresa"
                    fill
                    className="object-contain"
                  />
                </div>
              ) : (
                <div className="w-32 h-16 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/50">
                  <Building2 className="w-6 h-6 text-muted-foreground/50" />
                </div>
              )}
              
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={() => companyLogoInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {settings.companyLogoUrl ? 'Trocar' : 'Carregar'}
                </Button>
                
                {settings.companyLogoUrl && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => updateCompanyLogo(null)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remover
                  </Button>
                )}
              </div>
            </div>
            
            <input
              ref={companyLogoInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, updateCompanyLogo)}
              className="hidden"
            />
            
            <p className="text-xs text-muted-foreground">
              Recomendado: formato retangular (ex: 200x80px), max 2MB
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Aviso sobre persistencia */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="py-4">
          <p className="text-sm text-amber-800">
            <strong>Nota:</strong> Atualmente as configuracoes sao armazenadas em memoria. 
            Quando o sistema for conectado ao banco de dados (Supabase), as logos serao salvas permanentemente.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
