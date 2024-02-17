
export interface ClearableSignal extends AbortSignal {
  clear: () => void
}

/**
 * Takes an array of AbortSignals and returns a single signal.
 * If any signals are aborted, the returned signal will be aborted.
 */
export function anySignal (signals: Array<AbortSignal | undefined | null>): ClearableSignal {
  const controller = new globalThis.AbortController()
  const unsubscribe: Function[] = []

  function onAbort (reason: Error): void {
    controller.abort(reason)

    clear()
  }

  for (const signal of signals) {
    if (signal?.aborted === true) {
      onAbort(signal.reason)
      break
    }

    if (signal?.addEventListener != null) {
      const cb = (): void => {
        onAbort(signal.reason)
      }
      unsubscribe.push(() => {
        if (signal?.removeEventListener != null) {
          signal.removeEventListener('abort', cb)
        }
      })
      signal.addEventListener('abort', cb)
    }
  }

  function clear (): void {
    unsubscribe.forEach(cb => {
      cb()
    })
  }

  const signal = controller.signal as ClearableSignal
  signal.clear = clear

  return signal
}
