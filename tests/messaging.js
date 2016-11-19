import {assert} from 'chai'
import Promise from 'bluebird'
import {run, createChannel, kill} from '../dist'
import {randomInt, delay} from './utils'

describe('messaging', () => {

  for (let factor of [0.2, 0.5, 1, 1.5, 2]) {

    it('sends and receive messages ', () => run(function*() {

      const rep = 7
      const baseWait = 50

      const chan = createChannel()

      run(function*() {
        for (let i = 0; i < rep; i++) {
          yield run(delay, randomInt(baseWait * factor))
          chan.put(i)
        }
      })

      run(function*() {
        for (let i = 0; i < rep; i++) {
          yield run(delay, randomInt(baseWait))
          const msg = yield chan.take()
          assert.equal(msg, i)
        }
      })

    }))
  }

  it('Does not take when killed', () => run(function*() {
    const ch = createChannel()
    const cor = run(function*() {
      yield ch.take()
    })
    run(function*() {
      yield Promise.delay(100)
      ch.put('hello')
    })
    run(function*() {
      yield Promise.delay(50)
      kill(cor)
      const msg = yield ch.take()
      assert.equal(msg, 'hello')
    })
  }))

})
