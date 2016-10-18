import {run} from '../proc'
import {runnableFromCb} from '../utils'
import {putMessage, getMessage} from '../messaging'
import {assert} from 'chai'

const delay = runnableFromCb((time, cb) => setTimeout(() => cb(), time))

function randomDelay() {
  return Math.random() * 100
}

describe('messaging', () => {

  for (let rep = 0; rep < 10; rep++) {
    it('sends and receive messages ', (done) => {

      const handle1 = run(function*() {
        for (let i = 0; i < rep; i++) {
          yield [delay, randomDelay()]
          yield [putMessage, i]
        }
      })

      run(function*() {
        yield handle1
        done()
      })

      run(function*() {
        for (let i = 0; i < rep; i++) {
          yield [delay, randomDelay()]
          const msg = yield [getMessage, handle1]
          assert.equal(msg, i)
        }
      })
    })
  }

})
