import {assert} from 'chai'
import {resetTimer, timeApprox} from './utils'
import {Promise} from 'bluebird'

beforeEach(resetTimer)

describe('Promise', () => {

  it('basics', async () => {
    const a = Promise.delay(100)
    const b = Promise.delay(100)
    await a
    await b
    timeApprox(100)
  })

  it('error', async () => {
    let here = false
    try {
      await Promise.reject(new Error('whooops'))
    } catch (err) {
      here = true
    }
    assert.isOk(here)
  })

})
