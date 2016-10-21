import {run} from '../proc'
import {randomInt} from '../utils'
import {putMessage, getMessage} from '../messaging'
import {assert} from 'chai'
import {delay} from '../utils'

describe('messaging', () => {

  for (let factor of [0.2, 0.5, 1, 1.5, 2]) {

    it('sends and receive messages ', () => run(function*() {

      const rep = 7
      const baseWait = 50

      const handle1 = run(function*() {
        for (let i = 0; i < rep; i++) {
          yield [delay, randomInt(baseWait * factor)]
          yield [putMessage, i]
        }
      })

      run(function*() {
        for (let i = 0; i < rep; i++) {
          yield [delay, randomInt(baseWait)]
          const msg = yield [getMessage, handle1]
          assert.equal(msg, i)
        }
      })

      run(function*() {
        for (let i = 0; i < rep; i++) {
          yield [delay, randomInt(baseWait)]
          const msg = yield [getMessage, handle1]
          assert.equal(msg, i)
        }
      })

    }))
  }

})
