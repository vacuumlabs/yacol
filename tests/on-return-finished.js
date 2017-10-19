import {Promise} from 'bluebird'
import {onReturn} from '../dist'
import {assert} from 'chai'

describe('onReturn finished', () => {

  it('onReturn on already finished coroutine', async () => {
    let here = false
    const cor = (async function() {
      await Promise.delay(10)
    })()
    await Promise.delay(20)
    onReturn(cor, (err, res) => {
      assert.equal(err, null)
      here = true
    })
    await Promise.delay(10)
    assert.isOk(here)
  })

  it('onReturn on already failed coroutine', async () => {
    let here = false
    const cor = (async function() {
      await Promise.delay(10)
      throw new Error('whooops')
    })()
    try {
      await cor
    } catch (err) { } // eslint-disable-line no-empty
    onReturn(cor, (err, res) => {
      assert.equal(err.message, 'whooops')
      here = true
    })
    await Promise.delay(10)
    assert.isOk(here)
  })
})
