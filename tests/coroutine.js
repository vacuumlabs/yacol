import {coroutine, run} from '../dist'
import {assert} from 'chai'
import {resetTimer, timeApprox, delay} from './utils'

const inc = coroutine(function*(a, b) {
  yield run(delay, 100)
  return a + b
})

beforeEach(resetTimer)

describe('coroutine', () => {
  it('can define async function', (done) => {
    coroutine(function*() {
      const res = yield inc(1, 2)
      yield run(delay, 100)
      timeApprox(200)
      assert.equal(res, 3)
      done()
    })()
  })
})
