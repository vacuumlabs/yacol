import Promise from 'bluebird'
import {assert} from 'chai'
import {resetTimer, timeApprox} from './utils'

beforeEach(resetTimer)

describe('promise', () => {

  it('can await promise', async () => {
    for (let i = 0; i < 3; i++) {
      await Promise.delay(50)
    }
    timeApprox(150)
  })

  it('can handle errors', async () => {
    let here = false

    try {
      await (async function() {
        for (let i = 0; i < 10; i++) {
          await Promise.delay(100)
          await Promise.reject(new Error('whooops'))
        }
      })()
    } catch (err) {
      assert.equal(err.message, 'whooops')
      timeApprox(100)
      here = true
    }
    assert.isOk(here)

  })

  it('.then returns valid Promise (ok)', async () => {
    let here = false
    const p = (async () => {
      await Promise.delay(50)
      await Promise.delay(50)
      return 10
    })().then((res) => {
      timeApprox(100)
      assert.equal(res, 10)
      here = true
    })
    await p
    await Promise.delay(10)
    assert.isOk(here)
  })

  it('.then returns valid Promise (error)', async () => {
    let here1 = false, here2 = false
    try {
      const p = (async () => {
        await Promise.delay(100)
        throw new Error('whooops')
      })()
      p.then(() => {}).catch((err) => {
        timeApprox(100)
        here1 = true
      })
      await p
    } catch (err) {
      here2 = true
    }
    await Promise.delay(10)
    assert.isOk(here1)
    assert.isOk(here2)
  })

  it('.catch returns valid Promise (ok)', async () => {
    let here = false
    const p = (async () => {
      await Promise.delay(50)
      await Promise.delay(50)
      return 10
    })().catch(() => {}).then((res) => {
      here = true
      timeApprox(100)
      assert.equal(res, 10)
    })
    await p
    await Promise.delay(10)
    assert.isOk(here)
  })

  it('.catch returns valid Promise (error)', async () => {
    let here1 = false, here2 = false
    try {
      const p = (async () => {
        await Promise.delay(100)
        throw new Error('whooops')
      })()
      p.catch((err) => {
        timeApprox(100)
        here1 = true
      })
      await p
    } catch (err) {
      here2 = true
    }
    await Promise.delay(10)
    assert.isOk(here1)
    assert.isOk(here2)
  })

})
