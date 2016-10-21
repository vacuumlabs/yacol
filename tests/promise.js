import Promise from 'bluebird'
import {run} from '../proc'
import {assert} from 'chai'
import {resetTimer, timeApprox} from './utils'

beforeEach(resetTimer)

describe('promise', () => {

  it('can await promise', (done) => {
    run(function*() {
      for (let i = 0; i < 3; i++) {
        yield Promise.delay(100)
      }
      timeApprox(300)
      done()
    })
  })

  it('can handle errors', (done) => {

    run(function*() {
      for (let i = 0; i < 10; i++) {
        yield Promise.delay(100)
        yield Promise.reject(new Error('yuck fou'))
      }
    }, {onError: (err) => {assert.equal(err.message, 'yuck fou'); timeApprox(100); done()}})

  })

})
