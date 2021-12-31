const test = require('ava')
const pDefer = require('p-defer')
const anySignal = require('./')
const { AbortController } = globalThis

test('should abort from any signal', async t => {
  const controllers = [...new Array(5)].map(() => new AbortController())
  const signal = anySignal(controllers.map(c => c.signal))
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
