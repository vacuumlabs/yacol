import {Promise} from 'bluebird'
import {assert} from 'chai'
import {resetTimer, timeApprox} from './utils'

async function inc(a, b) {
  await Promise.delay(100)
  return a + b
}

beforeEach(resetTimer)

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
})
