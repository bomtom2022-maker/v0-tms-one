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
import { MACHINE_STATUS_CONFIG, type MachineStatus } from '@/lib/types'
import { Plus, Settings, AlertTriangle, AlertCircle, CheckCircle, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'

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

  const getStatusIcon = (status: MachineStatus) => {
    switch (status) {
      case 'critical': return AlertTriangle
      case 'attention': return AlertCircle
      case 'ok': return CheckCircle
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            Gestão de Máquinas
          </h1>
          <p className="text-muted-foreground mt-1">
            Cadastre e gerencie as máquinas do sistema
          </p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Máquina
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Máquinas Cadastradas
          </CardTitle>
          <CardDescription>
            Lista de todas as máquinas cadastradas no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {machines.map((machine) => {
              const config = MACHINE_STATUS_CONFIG[machine.status]
              const Icon = getStatusIcon(machine.status)
              
              return (
                <div 
                  key={machine.id}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border-l-4",
                    config.borderColor,
                    "bg-card hover:bg-muted/50 transition-colors"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", config.bgLight)}>
                      <Icon className={cn("w-4 h-4", config.textColor)} />
                    </div>
                    <div>
                      <span className="font-medium">{machine.name}</span>
                      <p className="text-sm text-muted-foreground">{machine.sector}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="secondary"
                      className={cn(config.bgLight, config.textColor, "text-xs")}
                    >
                      {config.label}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingMachine({ 
                        id: machine.id, 
                        name: machine.name, 
                        sector: machine.sector
                      })}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
