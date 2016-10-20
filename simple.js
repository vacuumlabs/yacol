/* eslint-disable no-unused-vars */
import {run, alts, zone} from './proc'
import {runnableFromFunction} from './utils'
import {putMessage, getMessage, onReturn} from './messaging'

const delay = runnableFromFunction((time, cb) => setTimeout(() => cb(), time))

const inc = function*(a, b) {
  yield [delay, 100]
  return a + b
}

run(function*() {
  for (let i = 0; i < 3; i++) {
    console.log('here', i)
    yield [delay, 100]
  }
  const val = yield [inc, run([inc, 3, 4]), run([inc, 1, 2])]
  console.log('res', val)
})

/*
run(function*() {
  for (let i = 0; i < 3; i++) {
    console.log('here', i)
    yield [delay, 100]
  }
  const val = yield [inc, 3, 4]
  console.log('res', val)
})
*/

