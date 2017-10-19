import {Promise} from 'bluebird'
import {assert} from 'chai'
import {race} from '../dist'
import {randomInt} from './utils'

async function inc(wait, a, b) {
  await Promise.delay(wait)
  return a + b
}

describe('race', () => {

  for (let i = 0; i < 5; i++) {

    const n = 5

    it('basics', async () => {
      const args = {}
      let sum = new Array(n)
      for (let j = 0; j < n; j++) {
        let time = (j + 1) * 20
        let a = randomInt(10)
        let b = randomInt(10)
        sum[j] = a + b
        args[`id-${j}`] = inc(time, a, b)
      }
      const res = await race(args)
      assert.deepEqual(res, ['id-0', sum[0]])
    })
  }
})

