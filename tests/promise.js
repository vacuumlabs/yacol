import Promise from 'bluebird'
import {run} from '../dist'
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
        yield Promise.delay(200)
        yield Promise.reject(new Error('yuck fou'))
      }
    }).catch((err) => {assert.equal(err.message, 'yuck fou'); timeApprox(200); done()})

  })

  it('can act as a Promise', (done) => {
    run(function*() {
      yield Promise.delay(100)
      yield Promise.delay(100)
      return 10
    }).then((res) => {
      timeApprox(200)
      assert.equal(res, 10)
      done()
    })
  })

  it('if used as a Promise, errors are propagated but not handled', (done) => {
    let here1 = false
    let here2 = false
    run(function*() {
      run(function*() {
        throw new Error('yuck fou')
      }).then(() => {}).catch((e) => {here1 = true})
    }).catch((e) => {here2 = true})
    setTimeout(() => {
      assert.isOk(here1)
      assert.isOk(here2)
      done()
    }, 100)
  })

})
