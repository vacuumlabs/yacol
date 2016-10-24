import {run} from '../../proc'
import {getMessage} from '../../messaging'

let junk = []
for (let i = 0; i < 1000000; i++) {
  junk.push(`${i}`)
}
junk = junk.join('')

describe('gc', () => {

  it('garbages old processed', function(done) {
    this.timeout(60000)

    const getLargeData = function*(n) {
      return [junk, n].join('')
    }

    run(function*() {
      // if all data was in RAM, the memory should suffice for ~200 runs.
      // If 2000 runs pass, it's probably OK
      for (let i = 0; i < 2000; i++) {
        yield run(getLargeData, i)
      }
      done()
    })
  })

  it('discardRead', function(done) {
    this.timeout(60000)
    const rep = 2000

    const handle1 = run(function*() {
      for (let i = 0; i < rep; i++) {
        yield run(putMessage, [junk, i].join(''))
      }
    }, {discardRead: true})

    const handle2 = run(function*() {
      for (let i = 0; i < rep; i++) {
        yield run(getMessage, handle1)
      }
    })

    run(function*() {
      yield handle1
      yield handle2
      done()
    })
  })

})
