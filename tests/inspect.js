import {run, context} from '../dist'
import {assert} from 'chai'
import {resetTimer, timeApprox} from './utils'
import Promise from 'bluebird'

beforeEach(resetTimer)

describe('inspect', () => {

  it('can inspect', (done) => {

    let hereInc = false
    function* inc(a, b) {
      hereInc = true
    }

    const cor = run(function*() {
      let res = 10
      for (let i = 0; i < 2; i++) {
        yield Promise.delay(200)
        res = yield run(inc, res, i)
      }
      return res
    }).inspect()

    run(function*() {
      let what
      what = yield cor.getEffect()
      timeApprox(200)
      assert.deepEqual(what, {runnable: inc, args: [10, 0], done: false})
      cor.step(100)
      what = yield cor.getEffect()
      timeApprox(400)
      assert.deepEqual(what, {runnable: inc, args: [100, 1], done: false})
      cor.step(101)
      what = yield cor.getEffect()
      timeApprox(400)
      assert.deepEqual(what, {value: 101, done: true})
      assert.isNotOk(hereInc)
      done()
    })

  })

  it('Error is passed as a message', (done) => {

    function* inc(a, b) { }

    const cor = run(function*() {
      yield run(inc, 0, 0)
      throw new Error('yuck fou')
    }).inspect()

    run(function*() {
      let what
      what = yield cor.getEffect()
      assert.deepEqual(what, {runnable: inc, args: [0, 0], done: false})
      cor.step()
      what = yield cor.getEffect()
      assert.equal(what.done, true)
      assert.equal(what.error.message, 'yuck fou')
      done()
    })
  })

  it('Works with context', (done) => {

    run(function*() {

      context.set('hello', 'world')

      function* inc(a, b) { }

      const cor = run(function*() {
        assert.equal(context.get('hello'), 'world')
        context.set('hello', 'universe')
        for (let i = 0; i < 10; i++) {
          yield run(inc, 0, 0)
        }
        assert.equal(context.get('hello'), 'universe')
      }).inspect()

      run(function*() {
        let what
        while (what == null || !what.done) {
          assert.equal(context.get('hello'), 'world')
          what = yield cor.getEffect()
          cor.step()
          context.set('hello', 'world')
        }
        done()
      })
    })
  })

})