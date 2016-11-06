import {run, kill} from '../dist'
import {assert} from 'chai'
import {resetTimer, timeApprox} from './utils'
import {isTerminatedError} from '../dist/utils'
import Promise from 'bluebird'

beforeEach(resetTimer)

describe('kill', () => {

  it('can kill', (done) => {
    run(function*() {
      let c1, c2, c12, c123, c22, c223, here1 = false, here2 = false //eslint-disable-line no-unused-vars
      c1 = run(function*() {
        c12 = run(function*() {
          c123 = run(function*() {
            yield Promise.delay(300)
            here1 = true
          })
        })
      })
      c2 = run(function*() {
        c22 = run(function*() {
          c223 = run(function*() {
            yield Promise.delay(300)
            here2 = true
          })
        })
      })
      run(function*() {
        yield Promise.delay(200)
        kill(c12)
        kill(c223)
      })
      yield c1
      yield c2
      timeApprox(200)
      yield Promise.delay(200)
      assert.isNotOk(here1)
      assert.isNotOk(here2)
      done()
    })
  })

  it('killing not awaited coroutine does not propagate error', (done) => {
    let here1 = false
    run(function*() {
      const c = run(function*() {
        yield Promise.delay(200)
      })
      yield Promise.delay(50)
      kill(c)
      yield Promise.delay(50)
      assert.isNotOk(here1)
      done()
    }).catch((e) => {
      here1 = true
    })
  })

  it('killing coroutine can use second argument to determine return value', (done) => {
    run(function*() {
      const c = run(function*() {
        yield Promise.delay(200)
      })
      run(function*() {
        yield Promise.delay(50)
        kill(c, 42)
      })
      const res = yield c
      assert.equal(res, 42)
      done()
    })
  })

  it('killing coroutine uses catch handler to determine return value', (done) => {
    run(function*() {
      const c = run(function*() {
        yield Promise.delay(200)
      }).catch((e) => 42)
      run(function*() {
        yield Promise.delay(50)
        kill(c)
      })
      const res = yield c
      assert.equal(res, 42)
      done()
    })
  })

  it('If error handler throws, the error is propagated in a standard way', (done) => {
    run(function*() {
      const c = run(function*() {
        yield Promise.delay(200)
      }).catch((e) => {throw new Error('yuck fou')})
      run(function*() {
        yield Promise.delay(50)
        kill(c)
      })
    }).catch((e) => {
      assert.equal(e.message, 'yuck fou')
      done()
    })
  })

  it('Child coroutines are terminated with correct states', (done) => {
    let here3 = false, here4 = false
    run(function*() {
      let c2, c3, c4
      const c = run(function*() {
        c2 = run(function*() {
          yield Promise.delay(200)
        }).catch((e) => 42)
        c3 = run(function*() {
          yield Promise.delay(200)
        })
        c4 = run(function*() {
          yield Promise.delay(200)
        }).catch((e) => {throw new Error('yuck fou')})
      })
      run(function*() {
        yield Promise.delay(50)
        kill(c)
      })
      yield Promise.delay(50)
      const res2 = yield c2
      assert.equal(res2, 42)
      run(function*() {
        yield c3
      }).catch((e) => {
        assert.isOk(isTerminatedError(e))
        here3 = true
      })
      run(function*() {
        yield c4
      }).catch((e) => {
        assert.equal(e.message, 'yuck fou')
        here4 = true
      })
      setTimeout(() => {
        assert.isOk(here3)
        assert.isOk(here4)
        done()
      }, 20)
    })
  })

  it('killing succesfully terminated coroutine does nothing', (done) => {
    run(function*() {
      const c = run(function*() {
        yield Promise.delay(100)
        return 42
      })
      yield Promise.delay(200)
      kill(c)
      const res = yield c
      assert.equal(res, 42)
      done()
    })
  })

  it('killing errored and catched coroutine does nothing', (done) => {
    run(function*() {
      const c = run(function*() {
        yield Promise.delay(100)
        throw new Error('yuck fou')
      }).catch((e) => 42)
      yield Promise.delay(200)
      kill(c)
      const res = yield c
      assert.equal(res, 42)
      done()
    })
  })

  it('killing errored coroutine does not invoked catch handler second time', (done) => {
    run(function*() {
      let c2
      let caught = 0
      const c1 = run(function*() {
        c2 = run(function*() {
          yield Promise.delay(100)
          throw new Error('yuck fou')
        }).catch((e) => {caught++; throw e})
      }).catch((e) => 42)
      yield Promise.delay(200)
      assert.equal(caught, 1)
      kill(c2)
      const res = yield c1
      assert.equal(res, 42)
      assert.equal(caught, 1)
      done()
    })
  })

})
