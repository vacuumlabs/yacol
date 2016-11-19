import {run, createChannel,
  droppingChannel, slidingChannel, mult, kill, merge, mergeNamed} from '../dist'
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

    yield Promise.delay(150)
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

  it('accepts transducer', () => run(function*() {
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
      let msg = yield out.take()
      res.push(msg)
    }
    assert.deepEqual(res, [[1, 2], ['much'], [3, 4]])
  }))

  it('stops', (done) => {
    run(function*() {
      const ch = createChannel()
      const mlt = mult(ch)
      const out = mlt.subscribe()
      run(function*() {
        yield Promise.delay(100)
        ch.put('msg1')
        yield Promise.delay(100)
        ch.put('msg2')
      })
      run(function*() {
        while (true) {
          const msg1 = yield out.take()
          assert.equal(msg1, 'msg1')
        }
      })
      run(function*() {
        yield Promise.delay(150)
        mlt.stop()
        const msg2 = yield ch.take()
        assert.equal(msg2, 'msg2')
        done()
      })
      run(function*() {
        yield Promise.delay(300)
        //done()
      })
    })
  })
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
