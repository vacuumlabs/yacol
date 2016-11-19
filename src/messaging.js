import {run} from './cor'
import {channelType} from './constants'
import {Queue} from './queue'
import {assertChannel} from './utils'
import t from 'transducers-js'

function* getMessage(channel) {
  assertChannel(channel)
  const {queue} = channel
  yield new Promise((resolve, reject) => {
    queue.next((val) => {
      resolve(val)
    })
  })
  return queue.pop()
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
    take: () => run(getMessage, ch),
    put: (msg) => pushMessage(ch, msg),
  }

  return ch
}
