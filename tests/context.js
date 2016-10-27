import {run, context} from '../dist'

import {assert} from 'chai'

describe('context', () => {

  it('basic', (done) => {

    run(function*() {
      context.set('a', 'aa')
      assert.equal(context.get('a'), 'aa')
      assert.equal(context.get('unknown'), undefined)
      yield run(function*() {
        yield run(function*() {
          assert.equal(context.get('a'), 'aa')
          assert.equal(context.get('unknown'), undefined)
        })
        assert.equal(context.get('a'), 'aa')
        context.set('a', 'b')
        assert.equal(context.get('a'), 'b')
      })
      assert.equal(context.get('a'), 'aa')
      done()
    })
  })
})
