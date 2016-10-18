import {run} from '../proc'
import {runnableFromCb} from '../utils'
import {putMessage, getReturn, onReturn} from '../messaging'
import {assert} from 'chai'

const delay = runnableFromCb((time, cb) => setTimeout(() => cb(), time))

const inc = function*(a, b) {
  yield [delay, 100]
  yield [putMessage, a + b]
}

const getTime = () => (new Date()).getTime()
let timeStart

function resetTimer() {
  timeStart = getTime()
}

function timeApprox(target) {
  const delta = getTime() - timeStart
  assert.approximately(delta, target, target / 10)
}

beforeEach(resetTimer)

describe('basics', () => {

  it('can await handle', () => {
    run(function*() {
      const res = yield run([inc, 1, 2])
      timeApprox(100)
      assert.equal(res, 3)
    })
  })

  it('can await runnable from callback', (done) => {
    const handle = run([delay, 100])
    onReturn(handle, () => {
      timeApprox(100)
      done()
    })
  })

  it('one-process', (done) => {
    run(function*() {
      resetTimer()
      for (let i = 0; i < 3; i++) {
        yield [delay, 100]
      }
      timeApprox(300)
      const val = yield [inc, 3, 4]
      assert.equal(val, 7)
      timeApprox(400)
      done()
    })
  })

  it('more-processes', (done) => {

    const handle1 = run(function*() {
      yield [delay, 100]
      const val = yield [inc, 3, 4]
      yield [putMessage, val]
    })

    let here3

    run(function*() {
      yield [delay, 300]
      const proc1Res = yield [getReturn, handle1]
      timeApprox(300)
      assert.equal(proc1Res, 7)
      assert.isOk(here3)
      done()
    })

    run(function*() {
      const proc1Res = yield [getReturn, handle1]
      timeApprox(200)
      assert.equal(proc1Res, 7)
      here3 = true
      done()
    })
  })
})


/*

const handle1 = run(function*() {
  for (let i = 0; i < 3; i++) {
    yield [delay, 500]
  }
  const val = yield [inc, 3, 4]
  console.log('proc1 get val', val)
  yield [putMessage, val]
})

const handle2 = run(function*() {
  yield [delay, 10000]
  console.log('proc2 waiting')
  const proc1Res = yield [getReturn, handle1]
  console.log('proc 2 res', proc1Res)
})
*/
