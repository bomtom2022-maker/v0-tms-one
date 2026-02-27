'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { MACHINE_STATUS_CONFIG, type MachineStatus } from '@/lib/types'
import { Plus, Settings, AlertTriangle, AlertCircle, CheckCircle, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'

export function MachinesView() {
  const { machines, addMachine, updateMachine } = useData()
  const [isOpen, setIsOpen] = useState(false)
  const [editingMachine, setEditingMachine] = useState<{ id: string; name: string; sector: string; status: MachineStatus } | null>(null)
  const [newMachineName, setNewMachineName] = useState('')
  const [newMachineSector, setNewMachineSector] = useState('')
  const [newMachineStatus, setNewMachineStatus] = useState<MachineStatus>('ok')

  const handleAddMachine = () => {
    if (!newMachineName.trim() || !newMachineSector.trim()) return
    
    addMachine(newMachineName.trim(), newMachineSector.trim(), newMachineStatus)
    setNewMachineName('')
    setNewMachineSector('')
    setNewMachineStatus('ok')
    setIsOpen(false)
  }

  const handleEditMachine = () => {
    if (!editingMachine || !editingMachine.name.trim() || !editingMachine.sector.trim()) return
    
    updateMachine(editingMachine.id, editingMachine.name.trim(), editingMachine.sector.trim(), editingMachine.status)
    setEditingMachine(null)
  }

  const getStatusIcon = (status: MachineStatus) => {
    switch (status) {
      case 'critical': return AlertTriangle
      case 'attention': return AlertCircle
      case 'ok': return CheckCircle
    }
  }

  const statusCounts = {
    critical: machines.filter(m => m.status === 'critical').length,
    attention: machines.filter(m => m.status === 'attention').length,
    ok: machines.filter(m => m.status === 'ok').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            Gestao de Maquinas
          </h1>
          <p className="text-muted-foreground mt-1">
            Cadastre e gerencie as maquinas e seus niveis de atencao
          </p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Maquina
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Cadastrar Nova Maquina</DialogTitle>
              <DialogDescription>
                Defina o nome, setor e nivel de atencao da maquina.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="machine-name">Nome da Maquina</Label>
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
              
              <div className="space-y-2">
                <Label>Nivel de Atencao</Label>
                <Select value={newMachineStatus} onValueChange={(v) => setNewMachineStatus(v as MachineStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(MACHINE_STATUS_CONFIG) as MachineStatus[]).map((s) => {
                      const config = MACHINE_STATUS_CONFIG[s]
                      const Icon = getStatusIcon(s)
                      return (
                        <SelectItem key={s} value={s}>
                          <div className="flex items-center gap-2">
                            <div className={cn("p-1 rounded", config.color)}>
                              <Icon className="w-3 h-3 text-white" />
                            </div>
                            <div>
                              <span className="font-medium">{config.label}</span>
                              <span className="text-muted-foreground ml-2 text-xs">- {config.description}</span>
                            </div>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
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
            <DialogTitle>Editar Maquina</DialogTitle>
            <DialogDescription>
              Altere os dados e o nivel de atencao da maquina.
            </DialogDescription>
          </DialogHeader>
          
          {editingMachine && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-machine-name">Nome da Maquina</Label>
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
              
              <div className="space-y-2">
                <Label>Nivel de Atencao</Label>
                <Select 
                  value={editingMachine.status} 
                  onValueChange={(v) => setEditingMachine({ ...editingMachine, status: v as MachineStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(MACHINE_STATUS_CONFIG) as MachineStatus[]).map((s) => {
                      const config = MACHINE_STATUS_CONFIG[s]
                      const Icon = getStatusIcon(s)
                      return (
                        <SelectItem key={s} value={s}>
                          <div className="flex items-center gap-2">
                            <div className={cn("p-1 rounded", config.color)}>
                              <Icon className="w-3 h-3 text-white" />
                            </div>
                            <div>
                              <span className="font-medium">{config.label}</span>
                              <span className="text-muted-foreground ml-2 text-xs">- {config.description}</span>
                            </div>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {(Object.keys(MACHINE_STATUS_CONFIG) as MachineStatus[]).map((status) => {
          const config = MACHINE_STATUS_CONFIG[status]
          const Icon = getStatusIcon(status)
          const count = statusCounts[status]
          
          return (
            <Card key={status}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", config.bgLight)}>
                    <Icon className={cn("w-5 h-5", config.textColor)} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{config.label}</p>
                    <p className="text-xl font-bold">{count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Machines List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Maquinas Cadastradas
          </CardTitle>
          <CardDescription>
            Lista de todas as maquinas com seus niveis de atencao
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
                        sector: machine.sector,
                        status: machine.status 
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
