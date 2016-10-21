import {run} from '../proc'
import {runnableFromFunction, randomInt} from '../utils'
import {putMessage, getMessage} from '../messaging'
import {assert} from 'chai'

const delay = runnableFromFunction((time, cb) => setTimeout(() => cb(), time))

describe('messaging', () => {

  for (let factor of [0.2, 0.5, 1, 1.5, 2]) {

    it('sends and receive messages ', (done) => {

      const rep = 7
      const baseWait = 50

      const handle1 = run(function*() {
        for (let i = 0; i < rep; i++) {
          yield [delay, randomInt(baseWait * factor)]
          yield [putMessage, i]
        }
      })

      const handle2 = run(function*() {
        for (let i = 0; i < rep; i++) {
          yield [delay, randomInt(baseWait)]
          const msg = yield [getMessage, handle1]
          assert.equal(msg, i)
        }
      })

      run(function*() {
        yield handle1
        yield handle2
        done()
      })
    })
  }

})
