import {Promise} from 'bluebird'
import {assert} from 'chai'
import {resetTimer, timeApprox} from './utils'
import {isCor, currentCoroutine} from '../dist'

async function inc(a, b) {
  await Promise.delay(100)
  return a + b
}

beforeEach(resetTimer)

describe('basics', () => {
  it('curentCoroutine', async () => {
    const current = currentCoroutine()
    assert.isOk(isCor(current))
  })

  it('toPromise works', () => Promise.resolve().then(() =>
    (async function() {
      await Promise.delay(10)
      return 4
    })().toPromise()
  ).then((res) => {
    assert.equal(res, 4)
  }))

})

describe('obscure', () => {

  it('more-processes', async () => {

    let here1, here2, here3

    const handle1 = (async () => {
      await Promise.delay(100)
      const val = await inc(3, 4)
      here1 = true
      return val
    })()

    const handle2 = (async () => {
      await Promise.delay(300)
      const proc1Res = await handle1
      timeApprox(300)
      assert.equal(proc1Res, 7)
      here2 = true
    })()

    const handle3 = (async () => {
      const proc1Res = await handle1
      timeApprox(200)
      assert.equal(proc1Res, 7)
      here3 = true
    })()

    await (async function() {
      await handle1
      await handle2
      await handle3
      assert.isOk(here1 && here2 && here3)
    })()
  })

  it('waits-nested', async () => {
    await (async function() {
      (async function() {
        (async function() {
          (async function() {
            await Promise.delay(100)
          })()
        })()
      })()
    })()
    timeApprox(100)
  })

  it('bugfix: coroutine awaited by its non-parent shouldn\'t change error handling for its parrent', async() => {
    let child, here1 = false, here2 = false

    const ff = (async function f() {
      child = (async function g() {
        await Promise.delay(100)
        throw new Error('whooops')
      })()
    })();

    (async function fakeParent() {
      try {
        await Promise.delay(10)
        await child
      } catch (err) {
        here1 = true
      }
    })()

    try {
      await ff
    } catch (err) {
      here2 = true
    }

    assert.isOk(here1)
    assert.isOk(here2)
  })

})
