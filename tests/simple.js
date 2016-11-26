import {run, runc, onReturn} from '../dist'
import {assert} from 'chai'
import {resetTimer, timeApprox, delay} from './utils'
import {runcBadCbArgs} from '../dist/constants'

const inc = function*(a, b) {
  yield run(delay, 100)
  return a + b
}

beforeEach(resetTimer)

describe('basics', () => {

  it('can await handle', (done) => {
    run(function*() {
      const res = yield run(inc, 1, 2)
      yield run(delay, 100)
      timeApprox(200)
      assert.equal(res, 3)
      done()
    })
  })

  it('can await runnable from callback', (done) => {
    const handle = run(delay, 100)
    onReturn(handle, () => {
      timeApprox(100)
      done()
    })
  })

  it('last message acts as a return value', (done) => {
    run(function*() {
      const res = yield run(function*() {
        const res = yield run(inc, 1, 2)
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
        yield run(delay, 100)
      }
      timeApprox(300)
      const val = yield run(inc, 3, 4)
      assert.equal(val, 7)
      timeApprox(400)
      done()
    })
  })

  it('more-processes', (done) => {

    let here1, here2, here3

    const handle1 = run(function*() {
      yield run(delay, 100)
      const val = yield run(inc, 3, 4)
      here1 = true
      return val
    })

    const handle2 = run(function*() {
      yield run(delay, 300)
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
        run(delay, 200)
        yield run(delay, 100)
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
            run(delay, 200)
          })
        })
        yield run(delay, 100)
      })
      timeApprox(200)
      done()
    })
  })

  it('can be awaited', async () => {
    const res = await run(function*() {
      yield run(delay, 100)
      return 1
    })
    timeApprox(100)
    assert.equal(res, 1)
  })

  it('onReturn on already errored coroutine', (done) => {
    run(function*() {
      const c = run(function*() {
        yield run(delay, 100)
        throw new Error('yuck fou')
      }).catch((e) => {})
      yield run(delay, 200)
      onReturn(c, (err, res) => {
        assert.equal(err, null)
        done()
      })
    })
  })
})

function slowSum(a, b, cb) {
  setTimeout(() => {
    if (a < 0) {
      cb(new Error('low'))
    } else {
      cb(null, a + b)
    }
  }, 10)
}

function slowSumNotNodeCallback1(a, b, cb) {
  setTimeout(() => {
    cb(a + b)
  }, 10)
}

function slowSumNotNodeCallback2(a, b, cb) {
  setTimeout(() => {
    cb(a, b)
  }, 10)
}

function slowSumNotNodeCallback3(a, b, cb) {
  setTimeout(() => {
    cb(a, b, a, b)
  }, 10)
}

describe('runc', () => {

  beforeEach(() => {
    console._error = console.error
    console.error = () => {}
  })

  afterEach(() => {
    console.error = console._error
  })

  it('basics', (done) => {
    run(function*() {
      const res = yield runc(slowSum, 1, 2)
      assert.equal(res, 3)
      done()
    })
  })

  it('error from callback', (done) => {
    run(function*() {
      yield runc(slowSum, -1, 2)
    }).catch((e) => {
      assert.equal(e.message, 'low')
      done()
    })
  })

  it('error on wrong callback type 1', (done) => {
    run(function*() {
      yield runc(slowSumNotNodeCallback1, 1, 2)
    }).catch((e) => {
      assert.equal(e.type, runcBadCbArgs)
      done()
    })
  })

  it('error on wrong callback type 2', (done) => {
    run(function*() {
      yield runc(slowSumNotNodeCallback2, 1, 2)
    }).catch((e) => {
      assert.equal(e.type, runcBadCbArgs)
      done()
    })
  })

  it('error on wrong callback type 3', (done) => {
    run(function*() {
      yield runc(slowSumNotNodeCallback3, 1, 2)
    }).catch((e) => {
      assert.equal(e.type, runcBadCbArgs)
      done()
    })
  })

})

