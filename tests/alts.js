import {run, alts, getMessage, createChannel} from '../dist'
import {randomInt, delay} from '../dist/utils'
import {assert} from 'chai'


export const inc = function*(wait, a, b) {
  yield run(delay, wait)
  return a + b
}

describe('alts', () => {

  for (let i = 0; i < 10; i++) {

    it('alts', (done) => {
      run(function*() {
        const args = []
        let mini = 0
        let sum
        for (let j = 0; j < 10; j++) {
          let time = (j + 1) * 30
          let a = randomInt(10)
          let b = randomInt(10)
          if (j === 0) {
            sum = a + b
          }
          args.push(run(inc, time, a, b))
        }
        for (let j = 0; j < 100; j++) {
          const ind1 = randomInt(10)
          const ind2 = randomInt(10)
          if (ind1 !== ind2) {
            let tmp = args[ind1]
            args[ind1] = args[ind2]
            args[ind2] = tmp
            if (ind1 === mini) {
              mini = ind2
            } else if (ind2 === mini) {
              mini = ind1
            }
          }
        }
        const channel = createChannel()
        run(alts, channel, ...args)
        const res = yield run(getMessage, channel)
        assert.deepEqual(res, [mini, sum])
        done()
      })
    })
  }
})

