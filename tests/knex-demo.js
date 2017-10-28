import {currentCoroutine} from '../dist'
import {assert} from 'chai'
import {resetTimer, timeApprox} from './utils'
import Promise from 'bluebird'

beforeEach(resetTimer)

// will be mocked later
const knex = {}

// the simple wrapper can be used with functions such as knex.transaction - i.e. stuff that expects
// you to produce valid promise and simultaneously you want to await it in another coroutine. This
// creates situation:
// - topLevelCoroutine
// -- middleLevelPromise
// --- bottomLevelCoroutine
// using .withParent and .toPromise we can easily create the setting where bottomLevelCoroutine
// sends the error to both middleLevelPromise and topLevelCoroutine (the latter is important so that
// error is considered to be properly handled).
async function doTransaction(coroutineFn) {
  const parent = currentCoroutine()
  await knex.transaction((trx) => coroutineFn(trx).withParent(parent).toPromise())
}

describe('knex-demo', () => {

  it('success', async () => {
    let here = false
    knex.transaction = (fn) =>
      // run the function later so we simulate knex-like behavior
      Promise.delay(0).then(() => {
        const res = fn('mocked trx object')
        assert.equal(res.constructor.name, 'Promise')
        return res
      }).then((val) => {
        assert.equal(val, 10)
        here = true
      })

    await doTransaction(async (trx) => {
      await Promise.delay(100)
      return 10
    })
    timeApprox(100)
    // ad-hoc wait until the promise completes
    await Promise.delay(50)
    assert.isOk(here)
  })

  it('error', async () => {
    let here1 = false, here2 = false
    knex.transaction = (fn) =>
      Promise.delay(1).then(() => {
        const res = fn('mocked trx object')
        assert.equal(res.constructor.name, 'Promise')
        return res
      }).catch((err) => {
        assert.equal(err.message, 'whooops')
        here1 = true
      })
    try {
      await doTransaction(async (trx) => {
        throw new Error('whooops')
      })
    } catch (err) {
      // catching error on forked Promise does not stop it from bubbling up to it's artificialy set parent
      here2 = true
    }
    // ad-hoc wait until the promise completes
    await Promise.delay(50)
    assert.isOk(here1)
    assert.isOk(here2)
  })

})
