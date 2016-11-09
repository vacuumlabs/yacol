import {run, runWithParent, runDetached, context} from '../dist'
import {assert} from 'chai'
import {resetTimer, timeApprox} from './utils'
import Promise from 'bluebird'

beforeEach(resetTimer)

describe('with-parent', () => {

  it('basics', () => run(function*() {
    const c1 = run(function*() {
      context.set('hello', 'world')
      yield Promise.delay(100)
    })

    runWithParent(c1, function*() {
      assert.equal(context.get('hello'), 'world')
      yield Promise.delay(200)
    })

    yield c1

    timeApprox(200)
  }))

  it('detached', () => run(function*() {
    const c1 = run(function*() {
      context.set('hello', 'world')

      runDetached(function*() {
        assert.equal(context.get('hello'), undefined)
        yield Promise.delay(1000)
      })

      yield Promise.delay(200)
    })
    yield c1
    timeApprox(200)
  }))

})
