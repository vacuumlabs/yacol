import {run, createChannel} from 'yacol'
import Promise from 'bluebird'

const rep = 10
const chan = createChannel()

run(function*() {
  for (let i = 0; i < rep; i++) {
    yield Promise.delay(Math.random() * 500)
    chan.put(i)
  }
})

run(function*() {
  for (let i = 0; i < rep; i++) {
    yield Promise.delay(Math.random() * 500)
    const msg = yield chan.take()
    console.log('got msg', msg)
  }
})
