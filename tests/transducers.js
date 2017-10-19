import {createChannel} from '../dist'
import Promise from 'bluebird'
import {assert} from 'chai'
import t from 'transducers-js'

describe('transducers', () => {
  it('basic functionality', async () => {
    const xf = t.comp(t.filter((x) => x % 2 === 0), t.map((x) => x * 2))
    const ch = createChannel(xf);
    (async function() {
      for (let i = 0; i < 10; i++) {
        ch.put(i)
        await Promise.delay(10)
      }
    })();
    (async function() {
      for (let i = 0; i < 5; i++) {
        const msg = await ch.take()
        assert.equal(msg, i * 4)
      }
    })()
  })
})
