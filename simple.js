/* eslint-disable no-unused-vars */
import {run, alts, zone, runRec} from './proc'
import {runnableFromFunction} from './utils'
import {putMessage, getMessage, onReturn} from './messaging'

const delay = runnableFromFunction(([time], cb) => setTimeout(() => cb(), time))

const lateOne = runnableFromFunction((args, cb) => setTimeout(() => cb(null, 1), 100))
const lateValue = runnableFromFunction(([val], cb) => setTimeout(() => cb(null, val)), 100)

const inc = function*(...args) {
  yield [delay, 100]
  let res = 0
  for (let elem of args) {
    res += elem
  }
  return res
}

run(function*() {
  for (let i = 0; i < 3; i++) {
    console.log('here', i)
    yield [delay, 100]
  }
  //const res = yield [inc, run([inc, 1, 1]), [inc, 1, 1], run([lateOne]), lateOne, [lateValue, 1]]

  const res = yield runRec([inc, run([inc, 1, 1]), [inc, [inc, 1, 1], 1], run([lateOne]), lateOne, [lateValue, 1]])

  //const res = yield [lateThree]
  console.log('res', res)
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

