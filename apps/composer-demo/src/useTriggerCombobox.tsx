import { useEffect, useRef } from 'react'
import { ROOT, type UiEvent } from '@p/aria-kernel'
import { useComboboxPattern } from '@p/aria-kernel/patterns'
import { useEphemeralCollection } from '@p/anyeditable'

interface Trigger { kind: string; query: string; blockIdx: number }
interface Item { id: string; label: string; name: string; [k: string]: unknown }

/** Wires aria-kernel combobox to a composer trigger:
 *  - filters items by trigger.query
 *  - primes listbox open + first-focus when trigger transitions
 *  - routes 'activate' to onActivate (rest of UiEvents to ephemeral state) */
export function useTriggerCombobox(
  trigger: Trigger | null,
  items: readonly Item[],
  onActivate: (item: Item) => void,
) {
  const [data, dispatch] = useEphemeralCollection(items)
  const cb = useComboboxPattern(data, (e: UiEvent) => {
    if (e.type === 'activate') {
      const it = items.find(x => x.id === e.id)
      if (it) onActivate(it)
      return
    }
    dispatch(e)
  })

  const lastKey = useRef<string | null>(null)
  const lastFirstId = useRef<string | null>(null)
  useEffect(() => {
    if (!trigger || items.length === 0) { lastKey.current = null; lastFirstId.current = null; return }
    const key = trigger.kind + ':' + trigger.blockIdx
    const firstId = items[0]!.id
    const transitioned = key !== lastKey.current
    const firstChanged = firstId !== lastFirstId.current
    if (!transitioned && !firstChanged) return
    lastKey.current = key
    lastFirstId.current = firstId
    if (transitioned) dispatch({ type: 'open', id: ROOT, open: true })
    dispatch({ type: 'navigate', id: firstId })
  }, [trigger, items, dispatch])

  return cb
}
