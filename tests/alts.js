import {run, alts} from '../dist'
import {randomInt, delay} from './utils'
import {assert} from 'chai'


export const inc = function*(wait, a, b) {
  yield run(delay, wait)
  return a + b
}

describe('alts', function(done) {

  // last task take about 2s to finish. Setting limit to 1s means that alts does not wait
  // for all the tasks to finish.
  this.timeout(1000)

  for (let i = 0; i < 5; i++) {

    const n = 20

    it('alts', (done) => {
      run(function*() {
        const args = []
        let mini = 0
        let sum
        for (let j = 0; j < n; j++) {
          let time = (j + 1) * 100
          let a = randomInt(10)
          let b = randomInt(10)
          if (j === 0) {
            sum = a + b
          }
          args.push(run(inc, time, a, b))
        }
        for (let j = 0; j < 3 * n; j++) {
          const ind1 = randomInt(n)
          const ind2 = randomInt(n)
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
        const res = yield run(alts, ...args)
        assert.deepEqual(res, [mini, sum])
        done()
      })
    })
  }
})

