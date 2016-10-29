import {run, kill} from '../dist'
import {assert} from 'chai'
import {resetTimer, timeApprox} from './utils'
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
        }).catch((e) => 42)
      })
      c2 = run(function*() {
        c22 = run(function*() {
          c223 = run(function*() {
            yield Promise.delay(300)
            here2 = true
          })
        }).catch((e) => {})
      })
      run(function*() {
        yield Promise.delay(200)
        kill(c12)
        kill(c223)
      })
      yield Promise.delay(10)
      const res1 = yield c12
      const res2 = yield c22
      timeApprox(200)
      setTimeout(() => {
        assert.equal(res1, 42)
        assert.equal(res2, undefined)
        assert.isNotOk(here1)
        assert.isNotOk(here2)
        done()
      }, 200)
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
