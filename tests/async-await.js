import {assert} from 'chai'
import {resetTimer, timeApprox} from './utils'
import {Promise} from 'bluebird'
import {badRunnableErrorType} from '../dist/constants'

beforeEach(resetTimer)

describe('async-await', () => {

  it('basics', async () => {
    async function slowSum(a, b) {
      await Promise.delay(100)
      return a + b
    }
    const r1 = await slowSum(1, 1)
    const r2 = await slowSum(r1, 1)
    timeApprox(200)
    assert.equal(r2, 3)
  })

  it('awaits unawaited', async () => {

    async function delay() {
      await Promise.delay(200)
    }

    async function test() {
      delay()
      delay()
      delay()
      delay()
      delay()
      timeApprox(0)
    }
    await test()
    // we wait for all the delays in parallel
    timeApprox(200)

  })

  it('catch awaited', (done) => {

    async function doThrow() {
      await Promise.delay(10)
      throw new Error('whooops')
    }

    async function test() {
      try {
        await Promise.delay(10)
        await doThrow()
      } catch (e) {
        assert.equal(e.message, 'whooops')
        done()
      }
    }

    test()

  })

  it('return value from catch', async () => {

    async function doThrow() {
      throw new Error('whooops')
    }

    async function test() {
      try {
        await doThrow()
      } catch (e) {
        return 4
      }
    }

    const res = await test()
    assert.equal(res, 4)

  })

  it('catch unawaited', (done) => {

    async function doThrow() {
      throw new Error('whoops')
    }

    async function notAwaiting() {
      try {
        doThrow()
      } catch (e) {
        assert.isOk(false)
      }
    }

    async function awaiting() {
      try {
        await notAwaiting()
      } catch (e) {
        assert.equal(e.message, 'whoops')
        done()
      }
    }

    awaiting()
  })

  it('error caught and rethrowed is propagated', async () => {
    let here1 = false, here2 = false
    async function f() {
      try {
        await (async function f2() {
          throw new Error('whooops')
        })()
      } catch (err) {
        here1 = true
        throw err
      }
    }

    try {
      await f()
    } catch (err) {
      here2 = true
    }

    assert.isOk(here1)
    assert.isOk(here2)
  })

  it('throws proper error when awaited something wrong', async () => {
    let here = false

    await (async () => {
      try {
        await undefined
      } catch (err) {
        assert.equal(err.type, badRunnableErrorType)
        here = true
      }
    })()
    assert.isOk(here)
  })

  it('throws proper error when awaited something wrong 2', async () => {

    let here = false

    async function f() {
      await undefined
    }

    try {
      await f()
    } catch (err) {
      assert.equal(err.type, badRunnableErrorType)
      here = true
    }

    assert.isOk(here)
  })

})
