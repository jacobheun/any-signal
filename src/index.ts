
export interface ClearableSignal extends AbortSignal {
  clear: () => void
}

/**
 * Takes an array of AbortSignals and returns a single signal.
 * If any signals are aborted, the returned signal will be aborted.
 */
export function anySignal (signals: Array<AbortSignal | undefined | null>): ClearableSignal {
  const controller = new globalThis.AbortController()

  function onAbort (): void {
    controller.abort()

    for (const signal of signals) {
      if (signal?.removeEventListener != null) {
        signal.removeEventListener('abort', onAbort)
      }
    }
  }

  for (const signal of signals) {
    if (signal?.aborted === true) {
      onAbort()
      break
    }

    if (signal?.addEventListener != null) {
      signal.addEventListener('abort', onAbort)
    }
  }

  function clear (): void {
    for (const signal of signals) {
      if (signal?.removeEventListener != null) {
        signal.removeEventListener('abort', onAbort)
      }
    }
  }

  // @ts-expect-error Proxy is not a ClearableSignal
  return new Proxy(controller.signal, {
    get (target, p) {
      if (p === 'clear') {
        return clear
      }

      // @ts-expect-error cannot use string to index target type
      const value = target[p]

      if (typeof value === 'function') {
        return function (...args: any[]) {
          value.apply(target, args)
        }
      }

      return value
    }
  })
}
