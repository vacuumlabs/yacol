import {channelType} from './constants'
import {Queue} from './queue'
import {assertChannel} from './utils'
import t from 'transducers-js'

export function getMessage(channel) {
  assertChannel(channel)
  return new Promise((resolve, reject) => {
    const {queue} = channel
    queue.next((val) => {
      resolve(val)
    })
  })
}


export function pushMessage(channel, message) {
  assertChannel(channel)
  channel.pushToQueue(channel.queue, message)
}

export function createChannel(transducer = null) {
  const queue = new Queue()

  let pushToQueue = (queue, message) => {
    queue.push(message)
    return queue
  }

  if (transducer != null) {
    pushToQueue = t.toFn(transducer, pushToQueue)
  }

  return ({
    type: channelType,
    queue,
    pushToQueue,
  })
}
