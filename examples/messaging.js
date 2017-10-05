import {createChannel} from 'yacol'
import Promise from 'bluebird'

const rep = 10
const chan = createChannel()

async function producer() {
  for (let i = 0; i < rep; i++) {
    await Promise.delay(Math.random() * 500)
    chan.put(i)
  }
}

async function consumer() {
  for (let i = 0; i < rep; i++) {
    await Promise.delay(Math.random() * 500)
    const msg = await chan.take()
    console.log('got msg', msg)
  }
}

producer()
consumer()
