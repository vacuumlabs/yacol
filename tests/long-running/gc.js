import {createChannel} from '../../dist'

let junk = []
for (let i = 0; i < 1000000; i++) {
  junk.push(`${i}`)
}
junk = junk.join('')

describe('gc', () => {

  it('garbages old processed', async () => {

    async function getLargeData(n) {
      return [junk, n].join('')
    }

    (async function() {
      // if all data was in RAM, the memory should suffice for ~200 runs.
      // If 2000 runs pass, it's probably OK
      for (let i = 0; i < 2000; i++) {
        await getLargeData(i)
      }
    })()
  }).timeout(60000)

  it('discard read values from channel', async () => {

    const rep = 2000
    const channel = createChannel();

    (async function() {
      for (let i = 0; i < rep; i++) {
        channel.put([junk, i].join(''))
        await channel.take()
      }
    })()

  }).timeout(60000)

})
