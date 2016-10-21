/* eslint-disable prefer-arrow-callback */
import {run} from '../proc'
import {delay} from '../utils'
import {getMessage, getMessageSafe, getReturnSafe} from '../messaging'
import {assert} from 'chai'

describe('error handling', () => {

  it('error handler invoked', (done) => {
    run(function*() {
      yield [delay, 100]
      throw new Error('yuck fou')
    }).catch((e) => {
      assert.equal(e.message, 'yuck fou')
      done()
    })
  })

  it('error caught is not propagated 1', function(done) {
    let here = false
    run(function*() {
      run(function*() {
        throw new Error('yuck fou')
      }).catch((e) => {})
      yield [delay, 10]
    }).catch((e) => {here = true})
    setTimeout(() => {
      assert.isNotOk(here)
      done()
    }, 100)
  })

  it('error caught is not propagated 2', (done) => {
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
      }).catch((e) => {assert.equal(e.message, 'yuck fou'); here1 = true})
    }).catch((e) => {here2 = true})
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
      }).catch((e) => {assert.equal(e.message, 'yuck fou'); here1 = true; throw e})
    }).catch((e) => {assert.equal(e.message, 'yuck fou'); here2 = true})
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
      }).catch((e) => {})
      yield handle1
    }).catch((e) => {assert.equal(e.message, 'yuck fou'); done()})
  })

  it('Error handler can return value', function(done) {
    let here1 = false
    let here2 = false
    run(function*() {
      const handle1 = run(function*() {
        throw new Error('yuck fou')
      }).catch((e) => 42)
      const res = yield handle1
      here1 = true
      assert.equal(res, 42)
    }).catch((e) => {here2 = true})
    setTimeout(() => {
      assert.isOk(here1)
      assert.isNotOk(here2)
      done()
    }, 100)
  })

})
