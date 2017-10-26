import {context, currentCoroutine} from '../dist'
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

    timeApprox(0)
  })

  it('coroutine-promise-coroutine sandwich', async () => {
    let here1 = false, here2 = false, here3 = false

    function doLater(fn) {
      return Promise.delay(10).then(() => fn().toPromise())
    }

    try {
      await (async function() {
        const parent = currentCoroutine()
        try {
          await doLater(() => {
            async function doThrow() {
              await Promise.delay(10)
              throw new Error('so bad')
            }
            return doThrow().withParent(parent)
          })
          // wont get here - awaited failed Promise
          here1 = true
        } catch (err) {
          // won't get here - the whole stuff will be terminated sooner than this could exectute
          here2 = true
        }
      })()
    } catch (err) {
      //will get here - artificialy set parent must handle child errors
      here3 = true
    }
    // wait until all asynchronous work is done
    await Promise.delay(50)
    assert.isNotOk(here1)
    assert.isNotOk(here2)
    assert.isOk(here3)
  })

})
