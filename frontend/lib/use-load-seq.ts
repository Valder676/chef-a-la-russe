import { useCallback, useRef } from 'react'

/** Игнорирует устаревшие ответы при повторном вызове load (React Strict Mode, F5). */
export function useLoadSeq() {
  const seqRef = useRef(0)

  const nextSeq = useCallback(() => {
    seqRef.current += 1
    return seqRef.current
  }, [])

  const isCurrent = useCallback((seq: number) => seq === seqRef.current, [])

  return { nextSeq, isCurrent }
}
