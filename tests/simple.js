import {run, onReturn} from '../proc'
import {delay} from '../utils'
import {assert} from 'chai'
import {resetTimer, timeApprox} from './utils'
import fs from 'fs'

const inc = function*(a, b) {
  yield [delay, 100]
  return a + b
}

beforeEach(resetTimer)

describe('basics', () => {

  it('can await handle', (done) => {
    run(function*() {
      const res = yield run([inc, 1, 2])
      yield [delay, 100]
      timeApprox(200)
      assert.equal(res, 3)
      done()
    })
  })

  it('can await runnable from callback', (done) => {
    const handle = run([delay, 100])
    onReturn(handle, () => {
      timeApprox(100)
      done()
    })
  })

  it('last message acts as a return value', (done) => {
    run(function*() {
      const res = yield run(function*() {
        const res = yield [inc, 1, 2]
        return res
      })
      assert.equal(res, 3)
      done()
    })
  })

  it('one-process', (done) => {
    run(function*() {
      resetTimer()
      for (let i = 0; i < 3; i++) {
        yield [delay, 100]
      }
      timeApprox(300)
      const val = yield [inc, 3, 4]
      assert.equal(val, 7)
      timeApprox(400)
      done()
    })
  })

  it('more-processes', (done) => {

    let here1, here2, here3

    const handle1 = run(function*() {
      yield [delay, 100]
      const val = yield [inc, 3, 4]
      here1 = true
      return val
    })

    const handle2 = run(function*() {
      yield [delay, 300]
      const proc1Res = yield handle1
      timeApprox(300)
      assert.equal(proc1Res, 7)
      here2 = true
    })

    const handle3 = run(function*() {
      const proc1Res = yield handle1
      timeApprox(200)
      assert.equal(proc1Res, 7)
      here3 = true
    })

    run(function*() {
      yield handle1
      yield handle2
      yield handle3
      assert.isOk(here1 && here2 && here3)
      done()
    })
  })

  it('waits', (done) => {
    run(function*() {
      yield run(function*() {
        run([delay, 200])
        yield [delay, 100]
      })
      timeApprox(200)
      done()
    })
  })

  it('waits-nested', (done) => {
    run(function*() {
      yield run(function*() {
        run(function*() {
          run(function*() {
            run([delay, 200])
          })
        })
        yield [delay, 100]
      })
      timeApprox(200)
      done()
    })
  })

  it('can be awaited', async () => {
    const res = await run(function*() {
      yield [delay, 100]
      return 1
    })
    timeApprox(100)
    assert.equal(res, 1)
  })

  it('can yield fs functions directly ', (done) => {
    run(function*() {
      const filename = './__delete__me__'
      yield [fs.writeFile, filename, 'much data']
      const res = yield [fs.readFile, filename]
      yield [fs.unlink, filename]
      assert.equal(res.toString('utf-8'), 'much data')
      done()
    })
  })

})
