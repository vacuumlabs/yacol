import {kill} from '../dist'
import {assert} from 'chai'
import {resetTimer, timeApprox} from './utils'
import {isTerminatedError} from '../dist/utils'
import {assertCorType} from '../dist/constants'
import Promise from 'bluebird'

beforeEach(resetTimer)

describe('kill', () => {

  it('can kill', async () => {

    let here1 = false, here2 = false, here3 = false

    async function job() {
      here1 = true
      await Promise.delay(100)
      here2 = true
    }

    const jobCoroutine = job();

    (async function() {
      try {
        const val = await jobCoroutine // eslint-disable-line no-unused-vars
      } catch (err) {
        here3 = true
        assert.isOk(isTerminatedError(err))
      }
    })()

    await Promise.delay(50)
    kill(jobCoroutine)
    await Promise.delay(150)
    assert.isOk(here1)
    assert.isNotOk(here2)
    assert.isOk(here3)
    timeApprox(200)
  })

  it('killing multiple times does nothing', async () => {

    let here1 = false, here2 = false, here3 = false

    async function job() {
      here1 = true
      await Promise.delay(100)
      here2 = true
    }

    const jobCoroutine = job();

    (async function() {
      try {
        const val = await jobCoroutine // eslint-disable-line no-unused-vars
      } catch (err) {
        here3 = true
        assert.isOk(isTerminatedError(err))
      }
    })()

    await Promise.delay(50)
    kill(jobCoroutine)
    kill(jobCoroutine)
    kill(jobCoroutine)
    kill(jobCoroutine)
    await Promise.delay(150)
    assert.isOk(here1)
    assert.isNotOk(here2)
    assert.isOk(here3)
    timeApprox(200)

  })


  it('children of killed coroutine are also killed', async () => {

    let here1 = false, here2 = false, here3 = false

    async function sideJob() {
      here1 = true
      await Promise.delay(100)
      here2 = true
    }

    let sideJobCoroutine

    async function job() {
      sideJobCoroutine = sideJob()
    }

    const jobCoroutine = job()
    await Promise.delay(50)
    kill(jobCoroutine)
    await Promise.delay(100)

    try {
      await sideJobCoroutine
    } catch (err) {
      here3 = true
    }

    assert.isOk(here1)
    assert.isNotOk(here2)
    assert.isOk(here3)

  })

  it('children of errored coroutine are also killed - explicit error', async () => {

    let here1 = false, here2 = false, here3 = false

    async function sideJob() {
      here1 = true
      await Promise.delay(100)
      here2 = true
    }

    async function job() {
      sideJob()
      await Promise.delay(50)
      throw new Error('whoops')
    }

    try {
      await job()
    } catch (err) {
      here3 = true
    }

    await Promise.delay(150)

    assert.isOk(here1)
    assert.isNotOk(here2)
    assert.isOk(here3)
  })

  it('children of errored coroutine are also killed - failed sibling job', async () => {

    let here1 = false, here2 = false, here3 = false

    async function sideJob() {
      here1 = true
      await Promise.delay(100)
      here2 = true
    }

    async function errorSideJob() {
      await Promise.delay(50)
      throw new Error('whooops')
    }

    async function job() {
      sideJob()
      errorSideJob()
    }

    try {
      await job()
    } catch (err) {
      here3 = true
    }

    await Promise.delay(150)

    assert.isOk(here1)
    assert.isNotOk(here2)
    assert.isOk(here3)
  })


  it('killing not awaited coroutine does not propagate error', async () => {

    let here1 = false, here2 = false

    async function job() {
      await Promise.delay(1000)
    }

    try {
      const jobCoroutine = job()
      kill(jobCoroutine)
      here1 = true
    } catch (err) {
      here2 = true
    }
    assert.isOk(here1)
    assert.isNotOk(here2)
  })

  it('can use argument to determine return value', async () => {

    async function job() {
      await Promise.delay(200)
    }

    const jobCoroutine = job()
    kill(jobCoroutine, 42)
    const res = await jobCoroutine
    assert.equal(res, 42)
  })

  it('killing succesfully terminated coroutine does nothing', async () => {

    async function job() {
      await Promise.delay(1)
      return 4
    }

    const jobCoroutine = job()
    await Promise.delay(20)
    kill(jobCoroutine)
    const res = await jobCoroutine
    assert.equal(res, 4)
  })

  it('killing errored coroutine does nothing', async () => {

    let here1 = false, here2 = false

    async function job() {
      await Promise.delay(1)
      throw new Error('whooops')
    }

    const jobCoroutine = job()

    try {
      await jobCoroutine
    } catch (err) {
      here1 = true
    }

    kill(jobCoroutine)

    try {
      await jobCoroutine
    } catch (err) {
      assert.equal(err.message, 'whooops')
      here2 = true
    }

    assert.isOk(here1)
    assert.isOk(here2)
  })

  it('invokes onKill handler', async () => {

    let here = false

    async function job() {
      await Promise.delay(100)
    }

    const jobCoroutine = job()
    jobCoroutine.onKill(() => {here = true})
    kill(jobCoroutine)

    assert.isOk(here)
  })

  it('kill validates its first argument', async () => {
    let here = false
    try {
      kill(Promise.delay(10))
    } catch (err) {
      assert.equal(err.type, assertCorType)
      here = true
    }
    assert.isOk(here)
  })

  it('killed coroutine acts as a failed promise', async () => {
    let here = false
    async function job() {
      await Promise.delay(10000)
    }
    const jobCor = job()
    kill(jobCor)
    await Promise.delay(10)
    jobCor.catch((err) => {
      isTerminatedError(err)
      here = true
    })
    await Promise.delay(10)
    assert.isOk(here)
  })

})
