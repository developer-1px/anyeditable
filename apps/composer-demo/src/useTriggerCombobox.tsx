import { useEffect, useRef } from 'react'
import { ROOT, type UiEvent } from '@p/aria-kernel'
import { useComboboxPattern } from '@p/aria-kernel/patterns'
import { useEphemeralCollection } from 'editable-lifecycle'

interface Trigger { kind: string; query: string; blockIdx: number }
interface Item { id: string; label: string; name: string }

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
  useEffect(() => {
    if (!trigger || items.length === 0) { lastKey.current = null; return }
    const key = trigger.kind + ':' + trigger.blockIdx
    if (key === lastKey.current) return
    lastKey.current = key
    dispatch({ type: 'open', id: ROOT, open: true })
    dispatch({ type: 'navigate', id: items[0]!.id })
  }, [trigger, items, dispatch])

  return cb
}
