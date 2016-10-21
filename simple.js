/* eslint-disable no-unused-vars */
import {run, alts, zone} from './proc'
import {runnableFromFunction} from './utils'
import {putMessage, getMessage, onReturn} from './messaging'

const delay = runnableFromFunction(([time], cb) => setTimeout(() => cb(), time))

const inc = function*(...args) {
  yield [delay, 100]
  let res = 0
  for (let elem of args) {
    res += elem
  }
  return res
}

const msg = ['one', 'two']

run(function*() {
  for (let i = 0; i < 3; i++) {
    console.log(msg[i].length)
    yield [delay, 100]
  }
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

