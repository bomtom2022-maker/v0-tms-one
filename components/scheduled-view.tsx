'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
} from '@/components/ui/dialog'
import { useData } from '@/lib/data-context'
import { MAINTENANCE_TYPE_CONFIG, type ScheduledMaintenance } from '@/lib/types'
import { Calendar, Plus, Pencil, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react'
import { format, isBefore, isToday, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

export function ScheduledView() {
  const { 
    machines, 
    scheduledMaintenances, 
    addScheduledMaintenance, 
    updateScheduledMaintenance,
    deleteScheduledMaintenance,
    getMachineById 
  } = useData()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  // Form state
  const [machineId, setMachineId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [maintenanceType, setMaintenanceType] = useState<'preventive' | 'corrective' | 'inspection'>('preventive')

  const resetForm = () => {
    setMachineId('')
    setTitle('')
    setDescription('')
    setScheduledDate('')
    setMaintenanceType('preventive')
    setEditingId(null)
    setShowForm(false)
  }

  const handleEdit = (maintenance: ScheduledMaintenance) => {
    setEditingId(maintenance.id)
    setMachineId(maintenance.machineId)
    setTitle(maintenance.title)
    setDescription(maintenance.description)
    setScheduledDate(format(maintenance.scheduledDate, 'yyyy-MM-dd'))
    setMaintenanceType(maintenance.type)
    setShowForm(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!machineId || !title || !scheduledDate) return

    // Converter a data corretamente para evitar problemas de timezone
    // O input date retorna yyyy-MM-dd, precisamos criar a data no timezone local
    const [year, month, day] = scheduledDate.split('-').map(Number)
    const localDate = new Date(year, month - 1, day, 12, 0, 0) // Meio-dia para evitar problemas de DST

    const data = {
      machineId,
      title,
      description,
      scheduledDate: localDate,
      type: maintenanceType,
    }

    if (editingId) {
      updateScheduledMaintenance(editingId, data)
    } else {
      addScheduledMaintenance(data)
    }

    resetForm()
  }

  const handleDelete = (id: string) => {
    deleteScheduledMaintenance(id)
    setShowDeleteConfirm(null)
  }

  const handleMarkComplete = (id: string) => {
    updateScheduledMaintenance(id, { status: 'completed' })
  }

  const handleMarkCancelled = (id: string) => {
    updateScheduledMaintenance(id, { status: 'cancelled' })
  }

  // Ordenar por data
  const sortedMaintenances = [...scheduledMaintenances].sort((a, b) => 
    a.scheduledDate.getTime() - b.scheduledDate.getTime()
  )

  const pendingMaintenances = sortedMaintenances.filter(m => m.status === 'pending')
  const completedMaintenances = sortedMaintenances.filter(m => m.status === 'completed')
  const cancelledMaintenances = sortedMaintenances.filter(m => m.status === 'cancelled')

  const getDateStatus = (date: Date) => {
    if (isToday(date)) return { label: 'Hoje', color: 'text-orange-600 bg-orange-50' }
    if (isBefore(date, new Date())) return { label: 'Atrasada', color: 'text-red-600 bg-red-50' }
    if (isBefore(date, addDays(new Date(), 7))) return { label: 'Esta Semana', color: 'text-blue-600 bg-blue-50' }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            Manutencoes Futuras
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie manutencoes preventivas e programadas
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Manutencao
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold">{pendingMaintenances.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Concluidas</p>
                <p className="text-2xl font-bold">{completedMaintenances.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-50 rounded-lg">
                <XCircle className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Canceladas</p>
                <p className="text-2xl font-bold">{cancelledMaintenances.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar Manutencao' : 'Nova Manutencao Programada'}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados da manutencao programada
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="machine">Maquina *</Label>
              <Select value={machineId} onValueChange={setMachineId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a maquina..." />
                </SelectTrigger>
                <SelectContent>
                  {machines.map((machine) => (
                    <SelectItem key={machine.id} value={machine.id}>
                      {machine.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Titulo *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Troca de Oleo Hidraulico"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Manutencao *</Label>
              <Select value={maintenanceType} onValueChange={(v) => setMaintenanceType(v as typeof maintenanceType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(MAINTENANCE_TYPE_CONFIG) as (keyof typeof MAINTENANCE_TYPE_CONFIG)[]).map((type) => (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", MAINTENANCE_TYPE_CONFIG[type].color)} />
                        {MAINTENANCE_TYPE_CONFIG[type].label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Data Programada *</Label>
              <Input
                id="date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descricao</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva os detalhes da manutencao..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!machineId || !title || !scheduledDate}>
                {editingId ? 'Salvar Alteracoes' : 'Criar Manutencao'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusao</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta manutencao programada? Esta acao nao pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pending Maintenances */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Manutencoes Pendentes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pendingMaintenances.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">Nenhuma manutencao pendente.</p>
            </div>
          ) : (
            <div className="divide-y">
              {pendingMaintenances.map((maintenance) => {
                const machine = getMachineById(maintenance.machineId)
                const typeConfig = MAINTENANCE_TYPE_CONFIG[maintenance.type]
                const dateStatus = getDateStatus(maintenance.scheduledDate)
                
                return (
                  <div key={maintenance.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{maintenance.title}</h3>
                          <Badge className={cn("text-xs", typeConfig.bgLight, typeConfig.textColor)}>
                            {typeConfig.label}
                          </Badge>
                          {dateStatus && (
                            <Badge variant="outline" className={cn("text-xs", dateStatus.color)}>
                              {dateStatus.label}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {machine?.name || 'Maquina desconhecida'}
                        </p>
                        {maintenance.description && (
                          <p className="text-sm text-foreground/80 mt-2">{maintenance.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Programada para: {format(maintenance.scheduledDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleEdit(maintenance)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleMarkComplete(maintenance.id)}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setShowDeleteConfirm(maintenance.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed & Cancelled */}
      {(completedMaintenances.length > 0 || cancelledMaintenances.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historico</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {[...completedMaintenances, ...cancelledMaintenances].map((maintenance) => {
                const machine = getMachineById(maintenance.machineId)
                const typeConfig = MAINTENANCE_TYPE_CONFIG[maintenance.type]
                const isCompleted = maintenance.status === 'completed'
                
                return (
                  <div key={maintenance.id} className="p-4 opacity-70">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium">{maintenance.title}</h3>
                          <Badge variant="outline" className={cn("text-xs", isCompleted ? "text-green-600" : "text-gray-500")}>
                            {isCompleted ? 'Concluida' : 'Cancelada'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {machine?.name || 'Maquina desconhecida'}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
