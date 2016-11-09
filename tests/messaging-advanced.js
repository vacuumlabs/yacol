import {run, pushMessage, getMessage, createChannel, mult, kill, merge} from '../dist'
import {assert} from 'chai'
//import {resetTimer, timeApprox} from './utils'
import Promise from 'bluebird'

describe('merge', () => {

  it('basics', () => run(function*() {

    const ch1 = createChannel()
    const ch2 = createChannel()
    const ch3 = createChannel()

    const ch = merge({ch1, ch2, ch3})

    pushMessage(ch1, 'a')
    pushMessage(ch2, 'b')
    pushMessage(ch3, 'c')

    run(function*() {
      const msg1 = yield run(getMessage, ch)
      const msg2 = yield run(getMessage, ch)
      const msg3 = yield run(getMessage, ch)
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
        const msg = yield run(getMessage, pipe1)
        pushMessage(pipeAll, msg)
      }
    })

    const c2 = run(function*() {
      while (true) {
        const msg = yield run(getMessage, pipe2)
        pushMessage(pipeAll, msg)
      }
    })

    const all = []

    const c3 = run(function*() {
      while (true) {
        const msg = yield run(getMessage, pipeAll)
        all.push(msg)
      }
    })

    pushMessage(ch, 1)
    pushMessage(ch, 2)

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
