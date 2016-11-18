import {channelType} from './constants'
import {Queue} from './queue'
import {assertChannel} from './utils'
import t from 'transducers-js'

function getMessage(channel) {
  assertChannel(channel)
  return new Promise((resolve, reject) => {
    const {queue} = channel
    queue.next((val) => {
      resolve(val)
    })
  })
}

function pushMessage(channel, message) {
  assertChannel(channel)
  channel.pushToQueue(channel.queue, message)
}

export function droppingChannel(capacity, transducer = null) {
  return _createChannel({dropping: capacity, transducer})
}

export function slidingChannel(capacity, transducer = null) {
  return _createChannel({sliding: capacity, transducer})
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

  const ch = {
    type: channelType,
    queue,
    pushToQueue,
    take: () => getMessage(ch),
    put: (msg) => pushMessage(ch, msg),
  }

  return ch
}
