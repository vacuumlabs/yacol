/* eslint-disable no-unused-vars */
import {run} from './proc'
import {runnableFromFunction} from './utils'
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

run(function*() {
  const handle1 = run(function*() {
    throw new Error('yuck fou')
  }).catch((e) => {})
  console.log('popopo', handle1)
  yield handle1
}).catch((e) => {console.log('tututu')})

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

