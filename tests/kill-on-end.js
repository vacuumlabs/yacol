import {run, runWithOptions} from '../dist'
import {assert} from 'chai'
import {resetTimer, timeApprox} from './utils'
import Promise from 'bluebird'

beforeEach(resetTimer)

describe('kill on end', () => {

  it('basics', () => run(function*() {
    let here = false
    yield run(function*() {
      runWithOptions({killOnEnd: true}, function*() {
        yield Promise.delay(300)
        here = true
      })
      yield Promise.delay(200)
    })
    timeApprox(200)
    yield Promise.delay(200)
    assert.isNotOk(here)
  }))

})
