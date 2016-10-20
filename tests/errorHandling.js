/* eslint-disable prefer-arrow-callback */
import {run} from '../proc'
import {runnableFromCb} from '../utils'
import {getReturn, onReturn} from '../messaging'
import {assert} from 'chai'

const delay = runnableFromCb((time, cb) => setTimeout(() => cb(), time))

describe('error handling', () => {

  it('error handler invoked', (done) => {
    run(function*() {
      yield [delay, 100]
      throw new Error('yuck fou')
    }, {
      onError: (e) => {
        assert.equal(e.message, 'yuck fou')
        done()
      }
    })
  })

  it('error caught is not propagated', (done) => {
    let here1 = false
    let here2 = false
    let here3 = false
    run(function*() {
      run(function*() {
        run(function*() {
          throw new Error('yuck fou')
        })
        yield [delay, 10]
        // inner run throws sooner than this is reached
        here3 = true
      }, {
        onError: (e) => {assert.equal(e.message, 'yuck fou'); here1 = true}
      })
    }, {
      onError: (e) => {here2 = true}
    })
    setTimeout(() => {
      assert.isOk(here1)
      assert.isNotOk(here2)
      assert.isNotOk(here3)
      done()
    }, 200)
  })

  it('error caught but rethrowed is propagated', (done) => {
    let here1 = false
    let here2 = false
    run(function*() {
      run(function*() {
        run(function*() {
          throw new Error('yuck fou')
        })
        yield [delay, 100]
      }, {
        onError: (e) => {assert.equal(e.message, 'yuck fou'); here1 = true; throw e}
      })
    }, {
      onError: (e) => {assert.equal(e.message, 'yuck fou'); here2 = true}
    })
    setTimeout(() => {
      assert.isOk(here1)
      assert.isOk(here2)
      done()
    }, 200)
  })

  it('Yield on failed process propagates error', function(done) {
    run(function*() {
      const handle1 = run(function*() {
        throw new Error('yuck fou')
      }, {onError: (e) => {}})
      yield handle1
    }, {onError: (e) => {assert.equal(e.message, 'yuck fou'); done()}})
  })

})
