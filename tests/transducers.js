import {run, createChannel} from '../dist'
import Promise from 'bluebird'
import {assert} from 'chai'
import t from 'transducers-js'

describe('transducers', () => {
  it('basic functionality', () => run(function*() {
    const xf = t.comp(t.filter((x) => x % 2 === 0), t.map((x) => x * 2))
    const ch = createChannel(xf)
    run(function*() {
      for (let i = 0; i < 10; i++) {
        ch.put(i)
        yield Promise.delay(10)
      }
    })
    run(function*() {
      for (let i = 0; i < 5; i++) {
        const msg = yield ch.take()
        assert.equal(msg, i * 4)
      }
    })
  }))
})
