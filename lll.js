
yield [inc, run([inc, 3, 4]), run([inc, 1, 2])]
yield [tryValue, run([getMessage, chan]), val]

const tryValue = function*() {

}


yieldables:
  - Handle: returns
  - Promise
  - ListYieldable

ListYieldable:
  - [generatorFn, ...args],
  - generatorFn
  - [builtinFn, ...args],
  - builtinFn

runnableFromFunction(cb)
  cb: (...args, cb)

  returns generatorFn (Runnable)

Runable:
  - generatorFn
  - [generatorFn, ...args]
  - [builtinFn, ...args]

  returns handle


features to be implemented:
  - error handling
  - sliding queue
  - more effective queue
  - mock impl
  - alts done better
  - __private__
  - express helpers
Done:
  - proper GC
  - alts
  - test zones
  - terminate
  - return value by return


