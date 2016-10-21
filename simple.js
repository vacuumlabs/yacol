/* eslint-disable no-unused-vars */
import {run} from './proc'
import {runnableFromFunction, randomInt} from './utils'
import {putMessage, getMessage, getMessageSafe, onReturn} from './messaging'
import Promise from 'bluebird'

const delay = runnableFromFunction(([time], cb) => setTimeout(() => cb(), time))

const inc = function*(...args) {
  yield [delay, 100]
  let res = 0
  for (let elem of args) {
    res += elem
  }
  return res
}

const baseWait = 50
const rep = 10

run(function*() {
  for (let i = 0; i < 3; i++) {
    console.log('here', i)
    yield [delay, 100]
  }
  const val = yield [inc, 3, 4]
  console.log('res', val)
}).then((res) => {console.log('tututu', res)})

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

