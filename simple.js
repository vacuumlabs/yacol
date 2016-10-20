/* eslint-disable no-unused-vars */
import {run, alts, zone} from './proc'
import {runnableFromCb} from './utils'
import {putMessage, getMessage, onReturn} from './messaging'

const delay = runnableFromCb((time, cb) => setTimeout(() => cb(), time))

const inc = function*(a, b) {
  yield [delay, 100]
  return a + b
}

run(function*() {
  const handle1 = run(function*() {
    throw new Error('yuck fou')
  }, {onError: (e) => {}})
  yield [delay, 100]
  //console.log(handle1)

  const res = yield handle1

  //console.log('res', res)
}, {onError: (e) => {
  console.log('tututu')
}})


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

