'use client'

import type { UsedPart, Part } from '@/lib/types'

interface UsedPartsListProps {
  usedParts: UsedPart[]
  parts: Part[]
}

export function UsedPartsList({ usedParts, parts }: UsedPartsListProps) {
  const grouped = (usedParts ?? [])
    .filter(up => up && up.partId)
    .reduce<Record<string, { partId: string; quantity: number }>>((acc, up) => {
      if (acc[up.partId]) {
        acc[up.partId] = { ...acc[up.partId], quantity: acc[up.partId].quantity + up.quantity }
      } else {
        acc[up.partId] = { partId: up.partId, quantity: up.quantity }
      }
      return acc
    }, {})

  return (
    <>
      {Object.entries(grouped).map(([partId, item]) => {
        const part = parts.find(p => p.id === partId)
        return (
          <div key={partId} className="flex items-center justify-between text-sm">
            <span>{part?.name || 'Peca nao encontrada'}</span>
            <span className="text-muted-foreground">
              {item.quantity}x
            </span>
          </div>
        )
      })}
    </>
  )
}
