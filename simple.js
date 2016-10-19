import {run, alts, zone} from './proc'
import {runnableFromCb} from './utils'
import {putMessage, getMessage, getReturn, onReturn} from './messaging'

const delay = runnableFromCb((time, cb) => setTimeout(() => cb(), time))

const inc = function*(a, b) {
  yield [delay, 100]
  yield [putMessage, a + b]
}

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

run(function*() {
  const res = yield run(function*() {
    run([delay, 3000])
    const res = yield [inc, 3, 4]
    yield [putMessage, res]
  })
  console.log(res)
})

/*
const inc = function*(a, b) {
  yield [delay, 100]
  yield [putMessage, a + b]
}

run(function*() {
  for (let i = 0; i < 3; i++) {
    console.log(i)
    yield [delay, 100]
  }
  const val = yield [inc, 3, 4]
  console.log('val', val)
})
*/
