/**
 * Takes an array of AbortSignals and returns a single signal.
 * If any signals are aborted, the returned signal will be aborted.
 * @param {Array<AbortSignal>} signals
 * @returns {CompositeSignal}
 */
function anySignal (signals) {
  const controller = new globalThis.AbortController()

  function onAbort () {
    controller.abort()

    for (const signal of signals) {
      if (!signal || !signal.removeEventListener) continue
      signal.removeEventListener('abort', onAbort)
    }
  }

  for (const signal of signals) {
    if (!signal || !signal.addEventListener) continue
    if (signal.aborted) {
      onAbort()
      break
    }
    signal.addEventListener('abort', onAbort)
  }

  function clear () {
    for (const signal of signals) {
      if (!signal || !signal.removeEventListener) continue
      signal.removeEventListener('abort', onAbort)
    }
  }

  return new Proxy(controller.signal, {
    get (target, p) {
      if (p === 'clear') {
        return clear
      }
      return target[p]
    }
  })
}

module.exports = anySignal
module.exports.anySignal = anySignal
