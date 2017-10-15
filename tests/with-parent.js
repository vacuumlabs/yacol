import {context} from '../dist'
import {assert} from 'chai'
import {resetTimer, timeApprox} from './utils'
import Promise from 'bluebird'

beforeEach(resetTimer)

describe('with-parent', () => {

  it('context works', async () => {
    const c1 = (async () => {
      context.set('hello', 'world')
    })()

    await Promise.delay(10)

    await (async function() {
      assert.equal(context.get('hello'), 'world')
    })().withParent(c1)

  })

  it('blocks parent', async () => {

    await (async () => {

      const c = (async () => {
        await Promise.delay(1)
      })();

      (async function() {
        await Promise.delay(100)
      })().withParent(c)

      await c
      timeApprox(100)
    })()

  })

  it('errors parent', async () => {

    let here = false

    await (async () => {

      const c = (async () => {
        await Promise.delay(100)
      })();

      (async function() {
        await Promise.delay(10)
        throw new Error('whooops')
      })().withParent(c)

      try {
        await c
      } catch (err) {
        here = true
      }
    })()

    assert.isOk(here)

  })

  it('detached', async () => {
    context.set('hello', 'world');

    (async () => {
      assert.equal(context.get('hello'), undefined)
    })().detached();

    (async () => {
      await Promise.delay(100000)
    })().detached()

    await Promise.delay(100)
    timeApprox(100)
  })
})
