import {assert} from 'chai'
import Promise from 'bluebird'
import {createChannel, kill} from '../dist'
import {randomInt} from './utils'
import multipleTakeError from '../dist/constants'

describe('messaging', () => {

  for (let factor of [0.2, 0.5, 1, 1.5, 2]) {

    it('sends and receive messages ', async () => {

      const rep = 7
      const baseWait = 50

      const chan = createChannel()

      async function producer() {
        for (let i = 0; i < rep; i++) {
          await Promise.delay(randomInt(baseWait * factor))
          chan.put(i)
        }
      }

      async function consumer() {
        for (let i = 0; i < rep; i++) {
          await Promise.delay(randomInt(baseWait))
          const msg = await chan.take()
          assert.equal(msg, i)
        }
      }

      const producerCor = producer()
      const consumerCor = consumer()
      await producerCor
      await consumerCor

    })
  }

  it('Does not take when killed', async () => {
    const ch = createChannel()

    async function takeFromCh() {
      await ch.take()
    }

    (async function() {
      await Promise.delay(100)
      ch.put('hello')
    })()

    const takeCor = takeFromCh()

    await (async function() {
      await Promise.delay(50)
      kill(takeCor)
      const msg = await ch.take()
      assert.equal(msg, 'hello')
    })()
  })

  it('cannot do multiple takes at once', async () => {

    const ch = createChannel()

    let here = false, msg

    (async () => {
      msg = await ch.take()
    })();

    (async function() {
      try {
        await ch.take()
      } catch (err) {
        assert.equal(err.type, multipleTakeError)
        here = true
      }
    })()

    // wait a while until the second take throws
    await Promise.delay(10)
    assert.isOk(here)

    // wait a while until the first take is satisfied
    ch.put(4)
    await Promise.delay(10)
    assert.equal(msg, 4)

  })

})
