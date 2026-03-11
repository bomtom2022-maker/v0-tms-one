'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useData } from '@/lib/data-context'
import { useAuth } from '@/lib/auth-context'
import { formatCurrency } from '@/lib/types'
import { Plus, Package, DollarSign, CheckCircle, Pencil } from 'lucide-react'

export function PartsView() {
  const { parts, addPart, updatePart } = useData()
  const { currentUser } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [newPartName, setNewPartName] = useState('')
  const [newPartPrice, setNewPartPrice] = useState('')
  const [newPartDescription, setNewPartDescription] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [editingPart, setEditingPart] = useState<{ id: string; name: string; price: number; description?: string } | null>(null)

  const totalValue = parts.reduce((sum, part) => sum + part.price, 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newPartName.trim() || !newPartPrice) return

    addPart(newPartName.trim(), parseFloat(newPartPrice), newPartDescription.trim() || undefined, currentUser?.id || '', currentUser?.name || '')
    
    setNewPartName('')
    setNewPartPrice('')
    setNewPartDescription('')
    setShowSuccess(true)
    
    setTimeout(() => {
      setShowSuccess(false)
      setShowForm(false)
    }, 1500)
  }

  const handleEditPart = () => {
    if (!editingPart || !editingPart.name.trim()) return
    
    const oldPart = parts.find(p => p.id === editingPart.id)
    updatePart(editingPart.id, editingPart.name.trim(), editingPart.price, editingPart.description?.trim() || undefined, currentUser?.id || '', currentUser?.name || '', oldPart?.price)
    setEditingPart(null)
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
            Pecas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie as pecas do estoque
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Nova Peca
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 lg:p-3 rounded-lg bg-primary">
                <Package className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-[10px] sm:text-sm text-muted-foreground">Itens</p>
                <p className="text-lg sm:text-2xl font-bold">{parts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 lg:p-3 rounded-lg bg-green-500">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] sm:text-sm text-muted-foreground">Valor</p>
                <p className="text-lg sm:text-2xl font-bold">{formatCurrency(totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Part Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {showSuccess ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Peça Cadastrada!
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Cadastrar Nova Peça
                </>
              )}
            </CardTitle>
            {!showSuccess && (
              <CardDescription>Preencha os dados da nova peça</CardDescription>
            )}
          </CardHeader>
          {!showSuccess && (
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="partName">Nome da Peça</Label>
                    <Input
                      id="partName"
                      value={newPartName}
                      onChange={(e) => setNewPartName(e.target.value)}
                      placeholder="Ex: Rolamento SKF 6205"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partPrice">Preço Unitário (R$)</Label>
                    <Input
                      id="partPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={newPartPrice}
                      onChange={(e) => setNewPartPrice(e.target.value)}
                      placeholder="Ex: 85.00"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partDescription">Descrição (opcional)</Label>
                  <Textarea
                    id="partDescription"
                    value={newPartDescription}
                    onChange={(e) => setNewPartDescription(e.target.value)}
                    placeholder="Ex: Rolamento de esferas para eixo principal"
                    rows={2}
                  />
                </div>
                <div className="flex gap-3">
                  <Button type="submit" disabled={!newPartName.trim() || !newPartPrice}>
                    Cadastrar Peça
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          )}
        </Card>
      )}

      {/* Edit Part Dialog */}
      <Dialog open={!!editingPart} onOpenChange={(open) => !open && setEditingPart(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Peça</DialogTitle>
            <DialogDescription>
              Altere os dados da peça.
            </DialogDescription>
          </DialogHeader>
          
          {editingPart && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-part-name">Nome da Peça</Label>
                <Input
                  id="edit-part-name"
                  value={editingPart.name}
                  onChange={(e) => setEditingPart({ ...editingPart, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-part-price">Preço Unitário (R$)</Label>
                <Input
                  id="edit-part-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingPart.price}
                  onChange={(e) => setEditingPart({ ...editingPart, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-part-description">Descrição (opcional)</Label>
                <Textarea
                  id="edit-part-description"
                  value={editingPart.description || ''}
                  onChange={(e) => setEditingPart({ ...editingPart, description: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPart(null)}>
              Cancelar
            </Button>
            <Button onClick={handleEditPart} disabled={!editingPart?.name.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Parts List - Mobile friendly */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Lista de Pecas</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Todas as pecas cadastradas</CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          {/* Mobile: Card layout */}
          <div className="grid gap-2 sm:hidden">
            {parts.map((part) => (
              <div key={part.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{part.name}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(part.price)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setEditingPart({ 
                    id: part.id, 
                    name: part.name, 
                    price: part.price,
                    description: part.description 
                  })}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
          
          {/* Desktop: Table layout */}
          <div className="hidden sm:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Nome da Peca</TableHead>
                  <TableHead className="text-right">Preco</TableHead>
                  <TableHead className="w-12">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parts.map((part, index) => (
                  <TableRow key={part.id}>
                    <TableCell className="font-medium text-muted-foreground text-sm">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium text-sm">{part.name}</TableCell>
                    <TableCell className="text-right text-sm">
                      {formatCurrency(part.price)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingPart({ 
                          id: part.id, 
                          name: part.name, 
                          price: part.price,
                          description: part.description 
                        })}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
