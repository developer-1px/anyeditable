import { useCallback, useMemo, useRef, useState } from 'react'
import { fromList, reduce, type NormalizedData, type UiEvent } from '@p/aria-kernel'

/**
 * F8 #135 제안 B 검증 — derived/ephemeral 데이터(매 keystroke filter 결과)를
 * `useComboboxPattern` 의 데이터-driven 모델에 어댑트한다.
 *
 * 매 render 의 `items` 시그니처가 바뀌면 entities/relationships 는 fresh fromList 로 교체,
 * meta(focus/open/typeahead) 는 보존하되 stale id 는 잘라낸다.
 *
 * 반환된 `dispatch` 를 `useComboboxPattern(data, dispatch)` 의 onEvent 로 그대로 전달.
 */
export function useEphemeralCollection<T extends { id: string } & Record<string, unknown>>(
  items: readonly T[],
): [NormalizedData, (e: UiEvent) => void] {
  const fresh = useMemo(() => fromList(items as unknown as Record<string, unknown>[]), [items])
  type CarriedMeta = { focus?: string | null; open?: string[]; expanded?: string[] }
  const [carried, setCarried] = useState<CarriedMeta>({})

  const idsKey = useMemo(() => items.map(i => i.id).join('|'), [items])
  const idsKeyRef = useRef(idsKey)
  let effectiveCarried = carried
  if (idsKeyRef.current !== idsKey) {
    idsKeyRef.current = idsKey
    effectiveCarried = pruneCarried(carried, items)
  }

  const data: NormalizedData = { ...fresh, meta: { ...fresh.meta, ...effectiveCarried } }

  const dispatch = useCallback((e: UiEvent) => {
    setCarried(prev => {
      const dataForReduce: NormalizedData = { ...fresh, meta: { ...fresh.meta, ...prev } }
      const next = reduce(dataForReduce, e)
      const m = next.meta
      if (!m) return prev
      return {
        ...(m.focus !== undefined ? { focus: m.focus } : {}),
        ...(m.open ? { open: m.open } : {}),
        ...(m.expanded ? { expanded: m.expanded } : {}),
      }
    })
  }, [fresh])

  return [data, dispatch]
}

function pruneCarried(
  carried: { focus?: string | null; open?: string[]; expanded?: string[] },
  items: readonly { id: string }[],
): { focus?: string | null; open?: string[]; expanded?: string[] } {
  const live = new Set(items.map(i => i.id))
  const focus = carried.focus && live.has(carried.focus) ? carried.focus : null
  const open = carried.open?.filter(id => live.has(id) || id === '__root__')
  const expanded = carried.expanded?.filter(id => live.has(id))
  return { focus, ...(open ? { open } : {}), ...(expanded ? { expanded } : {}) }
}
