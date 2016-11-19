import {run, createChannel, merge, mergeNamed} from '../dist'
import {assert} from 'chai'
import Promise from 'bluebird'
import t from 'transducers-js'

describe('merge', () => {

  it('basics', () => run(function*() {

    const ch1 = createChannel()
    const ch2 = createChannel()
    const ch = merge([ch1, ch2])

    run(function*() {
      ch1.put('a')
      yield Promise.resolve()
      ch2.put('b')
      yield Promise.resolve()
      ch1.put('c')
      yield Promise.resolve()
      ch2.put('d')
    })

    run(function*() {
      const msg1 = yield ch.take()
      const msg2 = yield ch.take()
      const msg3 = yield ch.take()
      const msg4 = yield ch.take()
      assert.deepEqual(msg1, 'a')
      assert.deepEqual(msg2, 'b')
      assert.deepEqual(msg3, 'c')
      assert.deepEqual(msg4, 'd')
    })
  }))

  it('double merge', () => run(function*() {
    const ch1 = createChannel()
    const ch2 = createChannel()
    const ch3 = createChannel()
    const mch = merge([ch1, ch2], t.map((x) => x * 2))
    const mmch = merge([mch, ch3])
    ch1.put(1)
    ch2.put(2)
    ch3.put(3)
    ch1.put(4)
    ch2.put(5)
    ch3.put(6)
    const msg1 = yield mmch.take()
    const msg2 = yield mmch.take()
    const msg3 = yield mmch.take()
    const msg4 = yield mmch.take()
    const msg5 = yield mmch.take()
    const msg6 = yield mmch.take()
    assert.deepEqual(msg1, 2)
    assert.deepEqual(msg2, 4)
    assert.deepEqual(msg3, 3)
    assert.deepEqual(msg4, 8)
    assert.deepEqual(msg5, 10)
    assert.deepEqual(msg6, 6)
  }))

  it('accepts transducer', () => run(function*() {
    const xf = t.partitionBy((x) => {return typeof x === 'string'})
    const ch1 = createChannel()
    const ch2 = createChannel()
    const ch3 = createChannel()
    const out = createChannel()


    const ch = merge([ch1, ch2, ch3], out, xf)
    assert.equal(ch, out)

    run(function*() {
      ch1.put(1)
      yield Promise.resolve()
      ch2.put(2)
      yield Promise.resolve()
      ch3.put('a')
      yield Promise.resolve()
      ch1.put(3)
      yield Promise.resolve()
      ch2.put(4)
      yield Promise.resolve()
      ch3.put('b')
    })

    run(function*() {
      const msg1 = yield ch.take()
      const msg2 = yield ch.take()
      const msg3 = yield ch.take()
      assert.deepEqual(msg1, [1, 2])
      assert.deepEqual(msg2, ['a'])
      assert.deepEqual(msg3, [3, 4])
    })
  }))
})

describe('mergeNamed', () => {

  it('basics', () => run(function*() {

    const ch1 = createChannel()
    const ch2 = createChannel()
    const ch3 = createChannel()

    const ch = mergeNamed({ch1, ch2, ch3})

    run(function*() {
      ch1.put('a')
      yield Promise.resolve()
      ch2.put('b')
      yield Promise.resolve()
      ch3.put('c')
      yield Promise.resolve()
    })

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


