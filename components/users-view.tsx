'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import type { UserRole } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Users, Plus, Pencil, Trash2, AlertCircle, Eye, EyeOff, Shield, User } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const ROLE_CONFIG = {
  manutentor: {
    label: 'Manutentor',
    description: 'Acesso total ao sistema',
    color: 'bg-blue-500',
    textColor: 'text-blue-600',
    bgLight: 'bg-blue-50',
  },
  lider: {
    label: 'Líder',
    description: 'Criar e visualizar chamados',
    color: 'bg-amber-500',
    textColor: 'text-amber-600',
    bgLight: 'bg-amber-50',
  },
  viewer: {
    label: 'Visualizador',
    description: 'Apenas visualizar e gerar relatórios',
    color: 'bg-slate-500',
    textColor: 'text-slate-600',
    bgLight: 'bg-slate-50',
  },
} as const

export function UsersView() {
  const { users, register, updateUser, deleteUser, currentUser, canManageUsers } = useAuth()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('lider')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const resetForm = () => {
    setName('')
    setEmail('')
    setPassword('')
    setRole('lider')
    setShowPassword(false)
    setError('')
    setEditingUser(null)
  }

  const handleOpenDialog = (userId?: string) => {
    if (userId) {
      const user = users.find(u => u.id === userId)
      if (user) {
        setEditingUser(userId)
        setName(user.name)
        setEmail(user.email)
        setRole(user.role)
        setPassword('')
      }
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    resetForm()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    setError('')
    setIsSubmitting(true)

    if (editingUser) {
      const result = await updateUser(editingUser, name, email, role, password || undefined)
      if (!result.success) {
        setError(result.error || 'Erro ao atualizar usuário')
        setIsSubmitting(false)
        return
      }
    } else {
      if (!password) {
        setError('Senha é obrigatória para novos usuários')
        setIsSubmitting(false)
        return
      }
      const result = await register(name, email, password, role)
      if (!result.success) {
        setError(result.error || 'Erro ao cadastrar usuário')
        setIsSubmitting(false)
        return
      }
    }

    setIsSubmitting(false)
    handleCloseDialog()
  }

  const handleDelete = async (userId: string) => {
    const result = await deleteUser(userId)
    if (!result.success) {
      setError(result.error || 'Erro ao deletar usuário')
    }
    setDeleteConfirmId(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
            <p className="text-sm text-muted-foreground">Gerencie os usuários do sistema</p>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          {canManageUsers && (
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Usuário
              </Button>
            </DialogTrigger>
          )}
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
              <DialogDescription>
                {editingUser 
                  ? 'Atualize as informações do usuário abaixo.' 
                  : 'Preencha os dados para cadastrar um novo usuário.'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do usuário"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@empresa.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  {editingUser ? 'Nova Senha (deixe em branco para manter)' : 'Senha'}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={editingUser ? 'Nova senha' : 'Senha'}
                    required={!editingUser}
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

              <div className="space-y-2">
                <Label htmlFor="role">Tipo de Usuário</Label>
                <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manutentor">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-blue-500" />
                        <div>
                          <span className="font-medium">Manutentor</span>
                          <span className="text-muted-foreground ml-2 text-xs">- Acesso total</span>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="lider">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-amber-500" />
                        <div>
                          <span className="font-medium">Líder</span>
                          <span className="text-muted-foreground ml-2 text-xs">- Criar/visualizar chamados</span>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="viewer">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-slate-500" />
                        <div>
                          <span className="font-medium">Visualizador</span>
                          <span className="text-muted-foreground ml-2 text-xs">- Somente visualização</span>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Salvando...' : editingUser ? 'Salvar' : 'Cadastrar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Usuários</CardDescription>
            <CardTitle className="text-3xl">{users.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Manutentores</CardDescription>
            <CardTitle className="text-3xl text-blue-600">
              {users.filter(u => u.role === 'manutentor').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Líderes</CardDescription>
            <CardTitle className="text-3xl text-amber-600">
              {users.filter(u => u.role === 'lider').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Visualizadores</CardDescription>
            <CardTitle className="text-3xl text-slate-600">
              {users.filter(u => u.role === 'viewer').length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabela de usuários */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
          <CardDescription>
            Todos os usuários cadastrados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cadastrado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const config = ROLE_CONFIG[user.role]
                const isCurrentUser = user.id === currentUser?.id
                
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {user.name}
                        {isCurrentUser && (
                          <Badge variant="outline" className="text-xs">Você</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge className={`${config.bgLight} ${config.textColor} border-0`}>
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(user.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      {canManageUsers && (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(user.id)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          
                          {!isCurrentUser && (
                            <Dialog open={deleteConfirmId === user.id} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setDeleteConfirmId(user.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Confirmar Exclusão</DialogTitle>
                                  <DialogDescription>
                                    Tem certeza que deseja excluir o usuário <strong>{user.name}</strong>? 
                                    Esta ação não pode ser desfeita.
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
                                    Cancelar
                                  </Button>
                                  <Button variant="destructive" onClick={() => handleDelete(user.id)}>
                                    Excluir
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
