'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useData } from '@/lib/data-context'
import { useAuth } from '@/lib/auth-context'
import { Plus, Settings, Pencil, Cpu, Trash2, Search, ChevronDown, ChevronUp } from 'lucide-react'

interface MachineForm {
  name: string
  sector: string
  manufacturer: string
  model: string
  controller: string
}

const emptyForm: MachineForm = {
  name: '',
  sector: '',
  manufacturer: '',
  model: '',
  controller: '',
}

export function MachinesView() {
  const { machines, addMachine, updateMachine, deleteMachine } = useData()
  const { currentUser } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingMachineId, setDeletingMachineId] = useState<string | null>(null)
  const [form, setForm] = useState<MachineForm>(emptyForm)
  const [editForm, setEditForm] = useState<MachineForm>(emptyForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Estados para busca e exibição controlada
  const [searchQuery, setSearchQuery] = useState('')
  const [showAll, setShowAll] = useState(false)
  const INITIAL_DISPLAY_COUNT = 5
  
  // Filtrar máquinas com base na busca
  const filteredMachines = machines.filter(machine => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      machine.name.toLowerCase().includes(query) ||
      machine.sector.toLowerCase().includes(query) ||
      machine.manufacturer?.toLowerCase().includes(query) ||
      machine.model?.toLowerCase().includes(query) ||
      machine.controller?.toLowerCase().includes(query)
    )
  })
  
  // Limitar exibição inicial a 5 máquinas
  const displayedMachines = showAll ? filteredMachines : filteredMachines.slice(0, INITIAL_DISPLAY_COUNT)
  const hasMoreMachines = filteredMachines.length > INITIAL_DISPLAY_COUNT

  const handleAdd = async () => {
    if (!form.name.trim() || !form.sector.trim()) return
    setIsSubmitting(true)
    setError(null)
    try {
      await addMachine(
        form.name.trim(), form.sector.trim(), 'ok',
        currentUser?.id || '', currentUser?.name || '',
        form.manufacturer.trim() || undefined,
        form.model.trim() || undefined,
        form.controller.trim() || undefined,
      )
      setForm(emptyForm)
      setIsOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar máquina')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async () => {
    if (!editingId || !editForm.name.trim() || !editForm.sector.trim()) return
    setIsSubmitting(true)
    setError(null)
    try {
      const machine = machines.find(m => m.id === editingId)
      await updateMachine(
        editingId, editForm.name.trim(), editForm.sector.trim(), machine?.status || 'ok',
        currentUser?.id || '', currentUser?.name || '',
        editForm.manufacturer.trim() || undefined,
        editForm.model.trim() || undefined,
        editForm.controller.trim() || undefined,
      )
      setEditingId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao editar máquina')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = () => {
    if (!deletingMachineId) return
    deleteMachine(deletingMachineId, currentUser?.id || '', currentUser?.name || '')
    setDeletingMachineId(null)
  }

  const openEdit = (id: string) => {
    const m = machines.find(m => m.id === id)
    if (!m) return
    setEditForm({
      name: m.name,
      sector: m.sector,
      manufacturer: m.manufacturer || '',
      model: m.model || '',
      controller: m.controller || '',
    })
    setEditingId(id)
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Maquinas</h1>
          <p className="text-sm text-muted-foreground mt-1">Cadastre e gerencie as maquinas</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Nova Maquina
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Cadastrar Nova Maquina</DialogTitle>
              <DialogDescription>Preencha os dados da maquina.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-name">Nome da Maquina *</Label>
                <Input id="new-name" placeholder="Ex: Torno CNC Romi GL-240" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-sector">Setor *</Label>
                <Input id="new-sector" placeholder="Ex: Usinagem A" value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-manufacturer">Fabricante</Label>
                <Input id="new-manufacturer" placeholder="Ex: Romi, Mazak, DMG Mori" value={form.manufacturer} onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-model">Modelo</Label>
                <Input id="new-model" placeholder="Ex: GL-240" value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-controller">Comando (CNC)</Label>
                <Input id="new-controller" placeholder="Ex: Fanuc 0i-TF, Siemens 840D" value={form.controller} onChange={e => setForm(f => ({ ...f, controller: e.target.value }))} />
              </div>
            </div>
            <DialogFooter className="flex-col gap-2">
              {error && (
                <p className="text-xs text-destructive text-center w-full">{error}</p>
              )}
              <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
                <Button variant="outline" onClick={() => { setIsOpen(false); setForm(emptyForm); setError(null) }} className="flex-1 sm:flex-none">Cancelar</Button>
                <Button onClick={handleAdd} disabled={!form.name.trim() || !form.sector.trim() || isSubmitting} className="flex-1 sm:flex-none">
                  {isSubmitting ? 'Cadastrando...' : 'Cadastrar'}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingId} onOpenChange={open => !open && setEditingId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Maquina</DialogTitle>
            <DialogDescription>Altere os dados da maquina.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome da Maquina *</Label>
              <Input id="edit-name" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-sector">Setor *</Label>
              <Input id="edit-sector" value={editForm.sector} onChange={e => setEditForm(f => ({ ...f, sector: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-manufacturer">Fabricante</Label>
              <Input id="edit-manufacturer" placeholder="Ex: Romi, Mazak, DMG Mori" value={editForm.manufacturer} onChange={e => setEditForm(f => ({ ...f, manufacturer: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-model">Modelo</Label>
              <Input id="edit-model" placeholder="Ex: GL-240" value={editForm.model} onChange={e => setEditForm(f => ({ ...f, model: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-controller">Comando (CNC)</Label>
              <Input id="edit-controller" placeholder="Ex: Fanuc 0i-TF, Siemens 840D" value={editForm.controller} onChange={e => setEditForm(f => ({ ...f, controller: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2">
              {error && (
                <p className="text-xs text-destructive text-center w-full">{error}</p>
              )}
              <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
                <Button variant="outline" onClick={() => { setEditingId(null); setError(null) }} className="flex-1 sm:flex-none">Cancelar</Button>
                <Button onClick={handleEdit} disabled={!editForm.name.trim() || !editForm.sector.trim() || isSubmitting} className="flex-1 sm:flex-none">
                  {isSubmitting ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Machines List */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
                Máquinas Cadastradas
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {machines.length === 0 
                  ? 'Nenhuma máquina cadastrada' 
                  : filteredMachines.length === machines.length
                    ? `${machines.length} máquina(s) cadastrada(s)`
                    : `${filteredMachines.length} de ${machines.length} máquina(s)`
                }
              </CardDescription>
            </div>
            
            {/* Campo de Busca */}
            {machines.length > 0 && (
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar máquina por nome ou ID..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setShowAll(false) // Reset para mostrar apenas 5 ao buscar
                  }}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          {machines.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Cpu className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhuma máquina cadastrada ainda.</p>
              <p className="text-xs mt-1">Clique em &quot;Nova Máquina&quot; para começar.</p>
            </div>
          ) : filteredMachines.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhuma máquina encontrada com este nome.</p>
              <p className="text-xs mt-1">Tente buscar por outro termo.</p>
            </div>
          ) : (
            <div className="grid gap-2 sm:gap-3">
              {displayedMachines.map((machine) => (
                <div
                  key={machine.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 shrink-0">
                      <Cpu className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-medium text-sm sm:text-base block truncate">{machine.name}</span>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        <span className="text-xs text-muted-foreground">{machine.sector}</span>
                        {machine.manufacturer && <span className="text-xs text-muted-foreground">Fab: {machine.manufacturer}</span>}
                        {machine.model && <span className="text-xs text-muted-foreground">Mod: {machine.model}</span>}
                        {machine.controller && <span className="text-xs text-muted-foreground">CNC: {machine.controller}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(machine.id)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeletingMachineId(machine.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {/* Botão Exibir Mais / Exibir Menos */}
              {hasMoreMachines && (
                <Button
                  variant="ghost"
                  className="w-full mt-2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll ? (
                    <>
                      <ChevronUp className="w-4 h-4 mr-2" />
                      Exibir menos
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 mr-2" />
                      Exibir mais ({filteredMachines.length - INITIAL_DISPLAY_COUNT} máquinas restantes)
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmacao de desativacao (soft delete) */}
      <AlertDialog open={!!deletingMachineId} onOpenChange={open => !open && setDeletingMachineId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar Máquina</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                Tem certeza que deseja desativar a máquina{' '}
                <strong>{machines.find(m => m.id === deletingMachineId)?.name}</strong>?
              </span>
              <span className="block text-sm">
                Os dados históricos de manutenção desta máquina serão preservados, 
                mas ela não poderá mais receber novos chamados.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
