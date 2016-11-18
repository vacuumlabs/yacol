import {run, createChannel} from '../../dist'
import Promise from 'bluebird'

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

  it('discard read values from channel', function() {
    this.timeout(60000)
    return run(function*() {
      const rep = 2000
      const channel = createChannel()

      run(function*() {
        for (let i = 0; i < rep; i++) {
          channel.put([junk, i].join(''))
          yield Promise.delay(0)
        }
      })

      run(function*() {
        for (let i = 0; i < rep; i++) {
          yield channel.take()
        }
      })
    })
  })

})
