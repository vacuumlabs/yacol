import {createChannel, droppingChannel, slidingChannel, mult, kill} from '../dist'
import {assert} from 'chai'
import Promise from 'bluebird'
import t from 'transducers-js'
import {resetTimer, timeApprox} from './utils'

beforeEach(resetTimer)

describe('mult', () => {

  it('basics', async () => {
    const ch = createChannel()
    const pipe1 = createChannel()
    const pipe2 = createChannel()
    const pipeAll = createChannel()

    const m = mult(ch)
    m.subscribe(pipe1)
    m.subscribe(pipe2)

    const c1 = (async function() {
      while (true) {
        const msg = await pipe1.take()
        pipeAll.put(msg)
      }
    })()

    const c2 = (async function() {
      while (true) {
        const msg = await pipe2.take()
        pipeAll.put(msg)
      }
    })()

    const all = []

    const c3 = (async function() {
      while (true) {
        const msg = await pipeAll.take()
        all.push(msg)
      }
    })()

    ch.put(1)
    ch.put(2)

    await Promise.delay(150)
    assert.deepEqual(all.sort(), [1, 1, 2, 2])
    kill(c1)
    kill(c2)
    kill(c3)
  })

  it('does not block', async () => {
    const c1 = (async function() {
      const ch = createChannel()
      const pipe = createChannel()
      const m = mult(ch)
      m.subscribe(pipe)
    })
    await c1()
  })

  it('accepts transducer', async () => {
    const xf = t.partitionBy((x) => {return typeof x === 'string'})
    const ch = createChannel()
    const mlt = mult(ch)
    const out = mlt.subscribe(xf)
    ch.put(1)
    ch.put(2)
    ch.put('much')
    ch.put(3)
    ch.put(4)
    ch.put('progress')
    const res = []
    for (let i = 0; i < 3; i++) {
      let msg = await out.take()
      res.push(msg)
    }
    assert.deepEqual(res, [[1, 2], ['much'], [3, 4]])
  })

  it('stops', async () => {
    const ch = createChannel()
    const mlt = mult(ch)
    const out = mlt.subscribe();

    (async function() {
      await Promise.delay(100)
      ch.put('msg1')
      await Promise.delay(100)
      ch.put('msg2')
    })()

    const takeEverything = (async function() {
      let msg1 = await out.take()
      assert.equal(msg1, 'msg1')
      // second message never arrives to the mult, because mult is stopped sooner
      await out.take()
      assert.isNotOk()
    })()

    await (async function() {
      await Promise.delay(150)
      mlt.stop()
      // after 200 ms, second message is put to the ch, mult is already stopped though. Message can
      // be therefore read only directly from ch.
      const msg2 = await ch.take()
      assert.equal(msg2, 'msg2')
      timeApprox(200)
      // kill waiting coroutine, so the test can end
      kill(takeEverything)
    })()
  })
})

describe('sliding channel', () => {

  it('basics', async () => {
    const ch = slidingChannel(2)
    for (let i = 0; i < 10; i++) {
      ch.put(i)
    }
    (async function() {
      const msg1 = await ch.take()
      assert.equal(msg1, 8)
      const msg2 = await ch.take()
      assert.equal(msg2, 9)
    })()
  })

})

describe('dropping channel', () => {

  it('basics', async () => {
    let here1 = false, here2 = false
    const ch = droppingChannel(2)
    for (let i = 0; i < 10; i++) {
      ch.put(i)
    }
    const waitForThreeMessages = (async () => {
      const msg1 = await ch.take()
      assert.equal(msg1, 0)
      const msg2 = await ch.take()
      assert.equal(msg2, 1)
      here1 = true
      // since this is dropping channel with capacity 2, there are no more messages at this point.
      // This await will therefore block indefinitely
      await ch.take()
      here2 = true
    })()

    await Promise.delay(50)
    assert.isOk(here1)
    assert.isNotOk(here2)
    // kill the stuck coroutine so the test can end
    kill(waitForThreeMessages)

  })
})
