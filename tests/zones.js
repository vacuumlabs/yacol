import {run, zone} from '../dist'

import {assert} from 'chai'

describe('zones', () => {

  it('basic', (done) => {

    run(function*() {
      zone.set('a', 'aa')
      assert.equal(zone.get('a'), 'aa')
      assert.equal(zone.get('unknown'), undefined)
      yield run(function*() {
        yield run(function*() {
          assert.equal(zone.get('a'), 'aa')
          assert.equal(zone.get('unknown'), undefined)
        })
        assert.equal(zone.get('a'), 'aa')
        zone.set('a', 'b')
        assert.equal(zone.get('a'), 'b')
      })
      assert.equal(zone.get('a'), 'aa')
      done()
    })
  })
})
