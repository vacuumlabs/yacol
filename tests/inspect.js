import {run, context} from '../dist'
import {assert} from 'chai'
import {resetTimer} from './utils'
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

    function isPromise(obj) {
      return (typeof obj.then === 'function')
    }

    run(function*() {
      let what
      what = yield cor.takeEffect()
      assert.isOk(isPromise(what.promise))
      cor.step()
      what = yield cor.takeEffect()
      assert.deepEqual(what, {runnable: inc, args: [10, 0]})
      cor.step(100)
      what = yield cor.takeEffect()
      assert.isOk(isPromise(what.promise))
      cor.step()
      what = yield cor.takeEffect()
      assert.deepEqual(what, {runnable: inc, args: [100, 1]})
      cor.step(101)
      what = yield cor.takeEffect()
      assert.deepEqual(what, {returnValue: 101, done: true})
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
      what = yield cor.takeEffect()
      assert.deepEqual(what, {runnable: inc, args: [0, 0]})
      cor.step()
      what = yield cor.takeEffect()
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
          what = yield cor.takeEffect()
          cor.step()
          context.set('hello', 'world')
        }
        done()
      })
    })
  })

})
