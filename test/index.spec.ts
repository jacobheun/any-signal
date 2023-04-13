import { expect } from 'aegir/chai'
import pDefer from 'p-defer'
import { isNode, isElectronMain } from 'wherearewe'
import { anySignal } from '../src/index.js'
const { AbortController } = globalThis

// AbortSignal, with an introspection on number of "abort" event listeners
function withHandlersCount (signal: AbortSignal): AbortSignal & { _abortHandlers: number } {
  let abortHandlers = 0
  // @ts-expect-error missing _abortHandlers property
  return new Proxy(signal, {
    get (target, p) {
      if (p === 'addEventListener') {
        return function (...args: any[]) {
          abortHandlers += 1
          // @ts-expect-error cannot use string to index type
          target[p].apply(target, args)
        }
      }

      if (p === 'removeEventListener') {
        return function (...args: any[]) {
          abortHandlers -= 1
          // @ts-expect-error cannot use string to index type
          target[p].apply(target, args)
        }
      }

      if (p === '_abortHandlers') {
        return abortHandlers
      }

      // @ts-expect-error cannot use string to index type
      return target[p]
    }
  })
}

describe('any-signal', () => {
  it('should abort from any signal', async () => {
    const controllers = [...new Array(5)].map(() => new AbortController())
    const signals = controllers.map(c => withHandlersCount(c.signal))
    const signal = anySignal(signals)
    expect(signal).to.have.property('aborted', false)
    const deferred = pDefer()
    let abortCount = 0
    signal.addEventListener('abort', () => {
      abortCount++
      deferred.resolve()
    })

    // Handlers added
    signals.every(s => expect(s._abortHandlers).to.equal(1))

    const randomController = controllers[Math.floor(Math.random() * controllers.length)]
    randomController.abort()

    await deferred.promise
    expect(abortCount).to.equal(1)
    expect(signal).to.have.property('aborted', true)
    // Handlers removed
    signals.every(s => expect(s._abortHandlers).to.equal(0))
  })

  it('should ignore non signals', async () => {
    const controllers = [...new Array(5)].map(() => new AbortController())
    const signals = controllers.map(c => c.signal)
    // call with undefined value in array
    const signal = anySignal([...signals, undefined])
    expect(signal).to.have.property('aborted', false)
    const deferred = pDefer()
    let abortCount = 0
    signal.addEventListener('abort', () => {
      abortCount++
      deferred.resolve()
    })

    const randomController = controllers[Math.floor(Math.random() * controllers.length)]
    randomController.abort()

    await deferred.promise
    expect(abortCount).to.equal(1)
    expect(signal).to.have.property('aborted', true)
  })

  it('should only abort once', async () => {
    const controllers = [...new Array(5)].map(() => new AbortController())
    const signal = anySignal(controllers.map(c => c.signal))
    expect(signal).to.have.property('aborted', false)
    const deferred = pDefer()
    let abortCount = 0
    signal.addEventListener('abort', () => {
      abortCount++
      deferred.resolve()
    })

    // Abort all controllers
    for (const controller of controllers) {
      controller.abort()
    }

    await deferred.promise
    expect(abortCount).to.equal(1)
    expect(signal).to.have.property('aborted', true)
  })

  it('should abort if a provided signal is already aborted', () => {
    const controllers = [...new Array(5)].map(() => new AbortController())
    const randomController = controllers[Math.floor(Math.random() * controllers.length)]
    randomController.abort()

    const signal = anySignal(controllers.map(c => c.signal))
    expect(signal).to.have.property('aborted', true)
  })

  it('should explicitly clear handlers', () => {
    const controllers = [...new Array(5)].map(() => new AbortController())
    const signals = controllers.map(c => withHandlersCount(c.signal))
    const signal = anySignal(signals)
    // No aborts
    expect(signal).to.have.property('aborted', false)
    // Each signal got an "abort" listener
    signals.every(s => expect(s._abortHandlers).to.equal(1))
    signal.clear()
    // No aborts still
    expect(signal).to.have.property('aborted', false)
    // Each signal is clear of listeners
    signals.every(s => expect(s._abortHandlers).to.equal(0))
  })

  it('should abort after clear', () => {
    const controllers = [...new Array(5)].map(() => new AbortController())
    const signals = controllers.map(c => withHandlersCount(c.signal))
    const signal = anySignal(signals)
    expect(signal).to.have.property('aborted', false)
    // Clear event handlers
    signal.clear()

    const randomController = controllers[Math.floor(Math.random() * controllers.length)]
    randomController.abort()

    // No handlers means there are no events propagated to the composite `signal`
    expect(signal).to.have.property('aborted', false)
  })

  it('should be able to increase max number of listeners on returned signal', async () => {
    if (!isNode && !isElectronMain) {
      return
    }

    // @ts-expect-error setMaxListeners is missing from @types/node
    const { setMaxListeners } = await import('node:events')
    const controllers = [...new Array(5)].map(() => new AbortController())
    const signals = controllers.map(c => c.signal)
    const signal = anySignal(signals)

    setMaxListeners(Infinity, signal)
  })
})
