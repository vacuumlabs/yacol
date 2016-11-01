import {run, getMessage, createChannel, pushMessage} from '../dist'
import Promise from 'bluebird'
import {assert} from 'chai'
import t from 'transducers-js'

describe('transducers', () => {
  it('basic functionality', () => run(function*() {
    const xf = t.comp(t.filter((x) => x % 2 === 0), t.map((x) => x * 2))
    const ch = createChannel(xf)
    run(function*() {
      for (let i = 0; i < 10; i++) {
        pushMessage(ch, i)
        yield Promise.delay(10)
      }
    })
    run(function*() {
      for (let i = 0; i < 5; i++) {
        const msg = yield run(getMessage, ch)
        assert.equal(msg, i * 4)
      }
    })
  }))
})
