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

const handle1 = run(function*() {
  for (let i = 0; i < rep; i++) {
    yield [delay, randomInt(baseWait)]
    yield [putMessage, i]
  }
})

const handle2 = run(function*() {
  for (let i = 0; i < rep; i++) {
    yield [delay, randomInt(baseWait)]
    const msg = yield [getMessage, handle1]
    console.log('handle2', msg)
  }
})

const handle3 = run(function*() {
  for (let i = 0; i < rep; i++) {
    yield [delay, randomInt(baseWait)]
    const msg = yield [getMessage, handle1]
    console.log('handle3', msg)
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

