/* eslint-disable no-unused-vars */
import {run} from './proc'
import {runnableFromFunction, randomInt} from './utils'
import {putMessage, getMessage, getMessageSafe, onReturn} from './messaging'
import Promise from 'bluebird'
import fs from 'fs'

const delay = runnableFromFunction(([time], cb) => setTimeout(() => cb(), time))

const inc = function*(...args) {
  yield [delay, 100]
  let res = 0
  for (let elem of args) {
    res += elem
  }
  return res
}

const baseWait = 50
const rep = 10

/*
fs.writeFile('sampleFile', 'much content', (err, res) => {
  console.log(err)
  console.log(res)
})
*/

run(function*() {
  const filename = './__delete__me__'
  yield [fs.writeFile, filename, 'much data']
  const res = yield [fs.readFile, filename]
  yield [fs.unlink, filename]
  console.log(res.toString('utf-8'))
})

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

