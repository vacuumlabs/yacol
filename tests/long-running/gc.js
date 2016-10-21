import {run} from '../../proc'
import {putMessage} from '../../messaging'

describe('gc', () => {
  it('gc', function(done) {
    this.timeout(60000)
    let junk = []
    for (let i = 0; i < 1000000; i++) {
      junk.push(`${i}`)
    }
    junk = junk.join('')

    const getLargeData = function*(n) {
      for (let i = 0; i < 10; i++) {
        putMessage([junk, n, i].join(''))
      }
    }

    run(function*() {
      // if all data was in RAM, the memory should suffice for 20 runs.
      // If 200 runs pass, it's probably OK
      for (let i = 0; i < 200; i++) {
        yield [getLargeData, i]
      }
      done()
    })
  })
})
