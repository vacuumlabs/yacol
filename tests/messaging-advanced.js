import {run, createChannel,
  droppingChannel, slidingChannel, mult, kill, merge} from '../dist'
import {assert} from 'chai'
//import {resetTimer, timeApprox} from './utils'
import Promise from 'bluebird'

describe('merge', () => {

  it('basics', () => run(function*() {

    const ch1 = createChannel()
    const ch2 = createChannel()
    const ch3 = createChannel()

    const ch = merge({ch1, ch2, ch3})

    ch1.put('a')
    ch2.put('b')
    ch3.put('c')

    run(function*() {
      const msg1 = yield ch.take()
      const msg2 = yield ch.take()
      const msg3 = yield ch.take()
      assert.deepEqual(msg1, ['ch1', 'a'])
      assert.deepEqual(msg2, ['ch2', 'b'])
      assert.deepEqual(msg3, ['ch3', 'c'])
    })
  }))

})

describe('mult', () => {

  it('basics', () => run(function*() {
    const ch = createChannel()
    const pipe1 = createChannel()
    const pipe2 = createChannel()
    const pipeAll = createChannel()

    const m = mult(ch)
    m.subscribe(pipe1)
    m.subscribe(pipe2)

    const c1 = run(function*() {
      while (true) {
        const msg = yield pipe1.take()
        pipeAll.put(msg)
      }
    })

    const c2 = run(function*() {
      while (true) {
        const msg = yield pipe2.take()
        pipeAll.put(msg)
      }
    })

    const all = []

    const c3 = run(function*() {
      while (true) {
        const msg = yield pipeAll.take()
        all.push(msg)
      }
    })

    ch.put(1)
    ch.put(2)

    yield Promise.delay(100)
    assert.deepEqual(all.sort(), [1, 1, 2, 2])
    kill(c1)
    kill(c2)
    kill(c3)
  }))

  it('does not block', () => run(function*() {
    const c1 = run(function*() {
      const ch = createChannel()
      const pipe = createChannel()
      const m = mult(ch)
      m.subscribe(pipe)
    })
    yield c1
  }))
})

describe('sliding channel', () => {

  it('basics', () => run(function*() {
    const ch = slidingChannel(2)
    for (let i = 0; i < 10; i++) {
      ch.put(i)
    }
    run(function*() {
      const msg1 = yield ch.take()
      assert.equal(msg1, 8)
      const msg2 = yield ch.take()
      assert.equal(msg2, 9)
    })
  }))

})

describe('dropping channel', () => {

  it('basics', () => run(function*() {
    const ch = droppingChannel(2)
    for (let i = 0; i < 10; i++) {
      ch.put(i)
    }
    run(function*() {
      const msg1 = yield ch.take()
      assert.equal(msg1, 0)
      const msg2 = yield ch.take()
      assert.equal(msg2, 1)
    })
  }))
})

