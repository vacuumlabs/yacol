import {run} from '../../proc'
import {putMessage, getMessage} from '../../messaging'

let junk = []
for (let i = 0; i < 1000000; i++) {
  junk.push(`${i}`)
}
junk = junk.join('')

describe('gc', () => {

  it('garbages old processed', function(done) {
    this.timeout(60000)

    const getLargeData = function*(n) {
      for (let i = 0; i < 10; i++) {
        yield [putMessage, [junk, n, i].join('')]
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

  it('discardRead', function(done) {
    this.timeout(60000)
    const rep = 2000

    const handle1 = run(function*() {
      for (let i = 0; i < rep; i++) {
        yield [putMessage, [junk, i].join('')]
      }
    }, {discardRead: true})

    const handle2 = run(function*() {
      for (let i = 0; i < rep; i++) {
        console.log(i)
        yield [getMessage, handle1]
      }
    })

    run(function*() {
      yield handle1
      yield handle2
      done()
    })
  })

})
