
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


Runable:
  - generatorFn
  - [generatorFn, ...args]
  - [builtinFn, ...args]

  returns handle


features to be implemented:
  - kill
  - sliding queue
  - mock impl
  - __private__
Done:
  - express helpers
  - alts done better
  - more effective queue
  - error handling
  - proper GC
  - alts
  - test zones
  - terminate
  - return value by return


