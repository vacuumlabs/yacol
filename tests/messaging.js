import {run} from '../proc'
import {randomInt, delay} from '../utils'
import {pushMessage, getMessage, createChannel} from '../messaging'
import {assert} from 'chai'

describe('messaging', () => {

  for (let factor of [0.2, 0.5, 1, 1.5, 2]) {

    it('sends and receive messages ', () => run(function*() {

      const rep = 7
      const baseWait = 50

      const chan = createChannel()

      run(function*() {
        for (let i = 0; i < rep; i++) {
          yield run(delay, randomInt(baseWait * factor))
          pushMessage(chan, i)
        }
      })

      run(function*() {
        for (let i = 0; i < rep; i++) {
          yield run(delay, randomInt(baseWait))
          const msg = yield run(getMessage, chan)
          assert.equal(msg, i)
        }
      })

      run(function*() {
        for (let i = 0; i < rep; i++) {
          yield run(delay, randomInt(baseWait))
          const msg = yield run(getMessage, chan)
          assert.equal(msg, i)
        }
      })

    }))
  }

})
