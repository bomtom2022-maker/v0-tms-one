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
import { Plus, Settings, Pencil, Cpu, Trash2 } from 'lucide-react'

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

  const handleAdd = () => {
    if (!form.name.trim() || !form.sector.trim()) return
    addMachine(
      form.name.trim(), form.sector.trim(), 'ok',
      currentUser?.id || '', currentUser?.name || '',
      form.manufacturer.trim() || undefined,
      form.model.trim() || undefined,
      form.controller.trim() || undefined,
    )
    setForm(emptyForm)
    setIsOpen(false)
  }

  const handleEdit = () => {
    if (!editingId || !editForm.name.trim() || !editForm.sector.trim()) return
    const machine = machines.find(m => m.id === editingId)
    updateMachine(
      editingId, editForm.name.trim(), editForm.sector.trim(), machine?.status || 'ok',
      currentUser?.id || '', currentUser?.name || '',
      editForm.manufacturer.trim() || undefined,
      editForm.model.trim() || undefined,
      editForm.controller.trim() || undefined,
    )
    setEditingId(null)
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
            <DialogFooter>
              <Button variant="outline" onClick={() => { setIsOpen(false); setForm(emptyForm) }}>Cancelar</Button>
              <Button onClick={handleAdd} disabled={!form.name.trim() || !form.sector.trim()}>Cadastrar</Button>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={!editForm.name.trim() || !editForm.sector.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Machines List */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            Maquinas Cadastradas
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {machines.length === 0 ? 'Nenhuma maquina cadastrada' : `${machines.length} maquina(s) cadastrada(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          {machines.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Cpu className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhuma maquina cadastrada ainda.</p>
              <p className="text-xs mt-1">Clique em "Nova Maquina" para comecar.</p>
            </div>
          ) : (
            <div className="grid gap-2 sm:gap-3">
              {machines.map((machine) => (
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmacao de exclusao */}
      <AlertDialog open={!!deletingMachineId} onOpenChange={open => !open && setDeletingMachineId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Maquina</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a maquina{' '}
              <strong>{machines.find(m => m.id === deletingMachineId)?.name}</strong>?
              Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
