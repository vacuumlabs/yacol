import {run, pushMessage, getMessage, createChannel} from 'yacol'
import Promise from 'bluebird'

const rep = 10
const chan = createChannel()

run(function*() {
  for (let i = 0; i < rep; i++) {
    yield Promise.delay(Math.random() * 500)
    pushMessage(chan, i)
  }
})

run(function*() {
  for (let i = 0; i < rep; i++) {
    yield Promise.delay(Math.random() * 500)
    const msg = yield run(getMessage, chan)
    console.log('got msg', msg)
  }
})
