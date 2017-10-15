/* eslint-disable prefer-arrow-callback */
import {assert} from 'chai'

describe('error handling', () => {

  it('error caught is not propagated', async function() {
    let here1 = false, here2 = false
    async function f() {
      try {
        await (async function f2() {
          throw new Error('whooops')
        })()
      } catch (err) {
        here1 = true
      }
    }

    try {
      await f()
    } catch (err) {
      here2 = true
    }

    assert.isOk(here1)
    assert.isNotOk(here2)
  })

  it('error caught and rethrowed is propagated', async function() {
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

  it('Error handler can return value', async function() {

    async function doThrow() {
      throw new Error('whoops')
    }

    async function test() {
      try {
        await doThrow()
      } catch (err) {
        return 4
      }
    }

    const res = await test()

    assert.equal(res, 4)
  })

})
