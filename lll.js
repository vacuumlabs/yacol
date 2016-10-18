

function* inc(x, y) {
  yield [delay, 500]
  return x + y
}

function* dummy(...args) {
  yield [delay, 500]
  return ['dummy', ...args]
}

run(function*(){

  const val = yield promise
  const val = yield [fn, arg1, arg2]
  const val = yield run([fn, arg1, arg2])
  proc = run([fn, arg1, arg2])
  const val = yield proc

  const val = yield run([patchedFn, arg1, arg2])

  const msg = yield [getMessage, chan]


}).catch((e) => {
  return 4
}).impl({
  // if ListYieldable with 1th argument, it is replaced by this.
  patchedFn: dummy,
  fn: inc,

})


yieldables:
  - Handle: returns
  - Promise
  - ListYieldable

ListYieldable:
  - [generatorFn, ...args],
  - generatorFn
  - [builtinFn, ...args],
  - builtinFn

runnableFromCb(cb)
  cb: (...args, cb)

  returns generatorFn (Runnable)

Runable:
  - generatorFn
  - [generatorFn, ...args]
  - [builtinFn, ...args]

  returns handle


features to be implemented:
  - proper GC
  - terminate
  - error handling
  - sliding queue
  - more effective queue
  - mock impl
  - return value by return
Done:
  - alts
  - test zones
