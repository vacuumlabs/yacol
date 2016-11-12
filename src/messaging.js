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

export function droppingChannel(capacity) {
  return _createChannel({dropping: capacity})
}

export function slidingChannel(capacity) {
  return _createChannel({sliding: capacity})
}

export function createChannel(transducer = null) {
  return _createChannel({transducer})
}

function _createChannel(options) {
  const queue = new Queue({sliding: options.sliding, dropping: options.dropping})

  let pushToQueue = (queue, message) => {
    queue.push(message)
    return queue
  }

  if (options.transducer != null) {
    pushToQueue = t.toFn(options.transducer, pushToQueue)
  }

  return ({
    type: channelType,
    queue,
    pushToQueue,
  })
}
