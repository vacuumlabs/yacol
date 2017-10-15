import {context} from 'yacol'
import {assert} from 'chai'
import {resetTimer, timeApprox} from './utils'
import {Promise} from 'bluebird'

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
    // we wait or all the delays though we do it in parallel
    timeApprox(200)

  })

  it('catch awaited', (done) => {

    async function doThrow() {
      await Promise.delay(10)
      throw new Error('whooopsie')
    }

    async function test() {
      try {
        await Promise.delay(10)
        await doThrow()
      } catch (e) {
        console.log('########')
        //assert.equal(e.message, 'whoopsie')
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

  it('works with context', async () => {

    async function parent() {
      context.set('hello', 'world')
      await Promise.delay(10)
      async function child() {
        await Promise.delay(10)
        assert.equal(context.get('hello'), 'world')
      }
      await child()
    }
    await parent()
  })

})
