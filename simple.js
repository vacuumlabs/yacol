/* eslint-disable no-unused-vars */
import {run} from './proc'
import {alts} from './alts'
import {randomInt} from './utils'
import {getMessage} from './messaging'
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

run(function*() {
  const handle1 = run(function*() {
    throw new Error('yuck fou')
  }).catch((e) => 42)
  const res = yield handle1
  console.log(res)
}).catch((e) => {console.log('cele zle')})

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

