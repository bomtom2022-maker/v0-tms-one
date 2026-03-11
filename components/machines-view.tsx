'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useData } from '@/lib/data-context'
import { useAuth } from '@/lib/auth-context'
import { Plus, Settings, Pencil, Cpu } from 'lucide-react'

export function MachinesView() {
  const { machines, addMachine, updateMachine } = useData()
  const { currentUser } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [editingMachine, setEditingMachine] = useState<{ id: string; name: string; sector: string } | null>(null)
  const [newMachineName, setNewMachineName] = useState('')
  const [newMachineSector, setNewMachineSector] = useState('')

  const handleAddMachine = () => {
    if (!newMachineName.trim() || !newMachineSector.trim()) return
    
    addMachine(newMachineName.trim(), newMachineSector.trim(), 'ok', currentUser?.id || '', currentUser?.name || '')
    setNewMachineName('')
    setNewMachineSector('')
    setIsOpen(false)
  }

  const handleEditMachine = () => {
    if (!editingMachine || !editingMachine.name.trim() || !editingMachine.sector.trim()) return
    
    const machine = machines.find(m => m.id === editingMachine.id)
    updateMachine(editingMachine.id, editingMachine.name.trim(), editingMachine.sector.trim(), machine?.status || 'ok', currentUser?.id || '', currentUser?.name || '')
    setEditingMachine(null)
  }

  

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
            Maquinas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cadastre e gerencie as maquinas
          </p>
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
              <DialogTitle>Cadastrar Nova Máquina</DialogTitle>
              <DialogDescription>
                Defina o nome e o setor da máquina.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="machine-name">Nome da Máquina</Label>
                <Input
                  id="machine-name"
                  placeholder="Ex: CNC Torno Romi GL-240"
                  value={newMachineName}
                  onChange={(e) => setNewMachineName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="machine-sector">Setor</Label>
                <Input
                  id="machine-sector"
                  placeholder="Ex: Usinagem A"
                  value={newMachineSector}
                  onChange={(e) => setNewMachineSector(e.target.value)}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddMachine} disabled={!newMachineName.trim() || !newMachineSector.trim()}>
                Cadastrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Machine Dialog */}
      <Dialog open={!!editingMachine} onOpenChange={(open) => !open && setEditingMachine(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Máquina</DialogTitle>
            <DialogDescription>
              Altere os dados da máquina.
            </DialogDescription>
          </DialogHeader>
          
          {editingMachine && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-machine-name">Nome da Máquina</Label>
                <Input
                  id="edit-machine-name"
                  value={editingMachine.name}
                  onChange={(e) => setEditingMachine({ ...editingMachine, name: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-machine-sector">Setor</Label>
                <Input
                  id="edit-machine-sector"
                  value={editingMachine.sector}
                  onChange={(e) => setEditingMachine({ ...editingMachine, sector: e.target.value })}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMachine(null)}>
              Cancelar
            </Button>
            <Button onClick={handleEditMachine} disabled={!editingMachine?.name.trim() || !editingMachine?.sector.trim()}>
              Salvar
            </Button>
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
            Lista de todas as maquinas
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          <div className="grid gap-2 sm:gap-3">
            {machines.map((machine) => (
              <div 
                key={machine.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10">
                    <Cpu className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <span className="font-medium text-sm sm:text-base">{machine.name}</span>
                    <p className="text-xs sm:text-sm text-muted-foreground">{machine.sector}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setEditingMachine({ 
                    id: machine.id, 
                    name: machine.name, 
                    sector: machine.sector
                  })}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
