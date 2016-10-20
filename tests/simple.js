import {run, runRec} from '../proc'
import {runnableFromFunction} from '../utils'
import {onReturn} from '../messaging'
import {assert} from 'chai'

const delay = runnableFromFunction((time, cb) => setTimeout(() => cb(), time))

const inc = function*(a, b) {
  yield [delay, 100]
  return a + b
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

  it('can await handle', (done) => {
    run(function*() {
      const res = yield run([inc, 1, 2])
      yield [delay, 100]
      timeApprox(200)
      assert.equal(res, 3)
      done()
    })
  })

  it('can await runnable from callback', (done) => {
    const handle = run([delay, 100])
    onReturn(handle, () => {
      timeApprox(100)
      done()
    })
  })

  it('last message acts as a return value', (done) => {
    run(function*() {
      const res = yield run(function*() {
        const res = yield [inc, 1, 2]
        return res
      })
      assert.equal(res, 3)
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

    let here1, here2, here3

    const handle1 = run(function*() {
      yield [delay, 100]
      const val = yield [inc, 3, 4]
      here1 = true
      return val
    })

    const handle2 = run(function*() {
      yield [delay, 300]
      const proc1Res = yield handle1
      timeApprox(300)
      assert.equal(proc1Res, 7)
      here2 = true
    })

    const handle3 = run(function*() {
      const proc1Res = yield handle1
      timeApprox(200)
      assert.equal(proc1Res, 7)
      here3 = true
    })

    run(function*() {
      yield handle1
      yield handle2
      yield handle3
      assert.isOk(here1 && here2 && here3)
      done()
    })
  })

  it('waits', (done) => {
    run(function*() {
      yield run(function*() {
        run([delay, 200])
        yield [delay, 100]
      })
      timeApprox(200)
      done()
    })
  })

  it('waits-nested', (done) => {
    run(function*() {
      yield run(function*() {
        run(function*() {
          run(function*() {
            run([delay, 200])
          })
        })
        yield [delay, 100]
      })
      timeApprox(200)
      done()
    })
  })

  it('runRec', (done) => {
    run(function*() {
      const lateOne = runnableFromFunction((args, cb) => setTimeout(() => cb(null, 1), 100))
      const lateValue = runnableFromFunction(([val], cb) => setTimeout(() => cb(null, val)), 100)
      const res = yield runRec([inc,
        run([inc, 1, 1]),
        [inc, [inc, 1, 1], 1],
        run([lateOne]),
        lateOne,
        [lateValue, 1]])
      timeApprox(300)
      assert.equal(res, 8)
      done()
    })
  })

})
