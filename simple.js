/* eslint-disable no-unused-vars */
import {run} from './proc'
import {randomInt} from './utils'
import {putMessage, getMessage, getMessageSafe, onReturn} from './messaging'
import Promise from 'bluebird'
import fs from 'fs'

const delay = (time) => Promise.delay(time)

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

const pokus = function*() {
  const handle1 = run([inc, 3, 4])
  yield run([getMessage, handle1])
}

run(function*() {
  yield run(pokus)
  //yield run(true)
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

