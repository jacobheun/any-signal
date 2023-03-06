const test = require('ava')
const pDefer = require('p-defer')
const anySignal = require('./')
const { AbortController } = globalThis

// AbortSignal, with an introspection on number of "abort" event listeners
function withHandlersCount (signal) {
  let abortHandlers = 0
  return new Proxy(signal, {
    get (target, p) {
      if (p === 'addEventListener') {
        return function (...args) {
          abortHandlers += 1
          target[p].apply(target, args)
        }
      }
      if (p === 'removeEventListener') {
        return function (...args) {
          abortHandlers -= 1
          target[p].apply(target, args)
        }
      }
      if (p === '_abortHandlers') {
        return abortHandlers
      }
      return target[p]
    }
  })
}

test('should abort from any signal', async t => {
  const controllers = [...new Array(5)].map(() => new AbortController())
  const signals = controllers.map(c => withHandlersCount(c.signal))
  const signal = anySignal(signals)
  t.is(signal.aborted, false)
  const deferred = pDefer()
  let abortCount = 0
  signal.addEventListener('abort', () => {
    abortCount++
    deferred.resolve()
  })

  // Handlers added
  signals.every(s => t.is(s._abortHandlers, 1))

  const randomController = controllers[Math.floor(Math.random() * controllers.length)]
  randomController.abort()

  await deferred.promise
  t.is(abortCount, 1)
  t.is(signal.aborted, true)
  // Handlers removed
  signals.every(s => t.is(s._abortHandlers, 0))
})

test('ignores non signals', async t => {
  const controllers = [...new Array(5)].map(() => new AbortController())
  const signals = controllers.map(c => c.signal)
  signals.push(undefined)
  const signal = anySignal(signals)
  t.is(signal.aborted, false)
  const deferred = pDefer()
  let abortCount = 0
  signal.addEventListener('abort', () => {
    abortCount++
    deferred.resolve()
  })

  const randomController = controllers[Math.floor(Math.random() * controllers.length)]
  randomController.abort()

  await deferred.promise
  t.is(abortCount, 1)
  t.is(signal.aborted, true)
})

test('should only abort once', async t => {
  const controllers = [...new Array(5)].map(() => new AbortController())
  const signal = anySignal(controllers.map(c => c.signal))
  t.is(signal.aborted, false)
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
  t.is(abortCount, 1)
  t.is(signal.aborted, true)
})

test('should abort if a provided signal is already aborted', t => {
  const controllers = [...new Array(5)].map(() => new AbortController())
  const randomController = controllers[Math.floor(Math.random() * controllers.length)]
  randomController.abort()

  const signal = anySignal(controllers.map(c => c.signal))
  t.is(signal.aborted, true)
})

test('explicitly clear handlers', t => {
  const controllers = [...new Array(5)].map(() => new AbortController())
  const signals = controllers.map(c => withHandlersCount(c.signal))
  const signal = anySignal(signals)
  // No aborts
  t.is(signal.aborted, false)
  // Each signal got an "abort" listener
  signals.every(s => t.is(s._abortHandlers, 1))
  signal.clear()
  // No aborts still
  t.is(signal.aborted, false)
  // Each signal is clear of listeners
  signals.every(s => t.is(s._abortHandlers, 0))
})

test('abort after clear', t => {
  const controllers = [...new Array(5)].map(() => new AbortController())
  const signals = controllers.map(c => withHandlersCount(c.signal))
  const signal = anySignal(signals)
  t.is(signal.aborted, false)
  // Clear event handlers
  signal.clear()

  const randomController = controllers[Math.floor(Math.random() * controllers.length)]
  randomController.abort()

  // No handlers means there are no events propagated to the composite `signal`
  t.is(signal.aborted, false)
})
