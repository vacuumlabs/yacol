import {run} from './proc'
import {runnableFromCb} from './utils'
import {putMessage, getReturn} from './messaging'

const delay = runnableFromCb((time, cb) => setTimeout(() => cb(), time))

const inc = function*(a, b) {
  yield [delay, 500]
  yield [putMessage, a + b]
}

const handle1 = run(function*() {
  for (let i = 0; i < 3; i++) {
    console.log(`start ${i + 1}`)
    yield [delay, 500]
  }
  const val = yield [inc, 3, 4]
  console.log('get val', val)
  yield [putMessage, val]
})

const handle2 = run(function*() {
  yield [delay, 1000]
  console.log('proc2 waiting')
  const proc1Res = yield [getReturn, handle1]
  console.log('proc 1 res', proc1Res)
})

