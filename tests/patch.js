import {run} from '../dist'
import {assert} from 'chai'
import Promise from 'bluebird'

describe('patch', () => {

  it('basic patch', (done) => {

    function* inc(a, b) {
      yield Promise.delay(10000)
      return a + b
    }

    function* inc2(a, b) {
      return 2 * (a + b)
    }

    run(function*() {
      const res = yield run(inc, 2, 3)
      assert.equal(res, 10)
      done()
    }).patch([inc, inc2])

  })

  it('can patch strings', (done) => {

    function* inc(a, b) {
      return a + b
    }

    run(function*() {
      const res = yield run('inc', 2, 3)
      assert.equal(res, 5)
      done()
    }).patch(['inc', inc])

  })

  it('can patch strings', (done) => {

    function* inc(a, b) {
      return a + b
    }

    run(function*() {
      run(function*() {
        const res = yield run('inc', 2, 3)
        assert.equal(res, 5)
        done()
      }).patch(['inc', inc])
    }).patch(['inc', 'this is really bad patch'])

  })

  it('can patch on parent', (done) => {

    function* inc(a, b) {
      return a + b
    }

    run(function*() {
      run(function*() {
        const res = yield run('inc', 2, 3)
        assert.equal(res, 5)
        done()
      })
    }).patch(['inc', inc])

  })

  it('can patch multiple fns', (done) => {

    function* inc(a, b) {
      return a + b
    }

    function* inc2(a, b) {
      return 2 * (a + b)
    }

    run(function*() {
      run(function*() {
        let res = yield run('inc', 2, 3)
        assert.equal(res, 5)
        res = yield run('inc2', 2, 3)
        assert.equal(res, 10)
        done()
      })
    }).patch(['inc', inc], ['inc2', inc2])

  })
})
