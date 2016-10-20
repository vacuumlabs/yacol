/* eslint-disable no-unused-vars */
import {run, alts, zone} from './proc'
import {runnableFromCb} from './utils'
import {putMessage, getMessage, getReturn, onReturn} from './messaging'

const delay = runnableFromCb((time, cb) => setTimeout(() => cb(), time))

const inc = function*(a, b) {
  yield [delay, 100]
  return a + b
}

run(function*() {
  for (let i = 0; i < 3; i++) {
    console.log('here', i)
    yield [delay, 100]
  }
  const val = yield [inc, 3, 4]
  console.log('res', val)
})

//{onError: (err) => {}})

/*
let junk = []
for (let i = 0; i < 1000000; i++) {
  junk.push(`${i}`)
}
junk = junk.join('')

const getLargeData = function*(n) {
  //yield [putMessage, `${junk.join('')}${n}`]
  yield [putMessage, [junk, n].join('')]
}

run(function*() {
  for (let i = 0; i < 10000; i++) {
    const res = yield [getLargeData, i]
    console.log(i, res.length)
  }
})
*/

/*
run(function*() {
  for (let i = 0; i < 3; i++) {
    console.log('here', i)
    yield [delay, 100]
  }
  const val = yield [inc, 3, 4]
  console.log('res', val)
})
*/

