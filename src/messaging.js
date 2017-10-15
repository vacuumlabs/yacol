import {runImmediately} from './cor'
import {channelType} from './constants'
import {Queue} from './queue'
import {assertChannel} from './utils'
import t from 'transducers-js'

function getMessage(channel) {
  assertChannel(channel)
  let handle
  return runImmediately(
    {
      onKill: () => {
        if (handle != null) {
          handle.dispose()
        }
      }
    },
    function*() {
      const {queue} = channel
      yield new Promise((resolve, reject) => {
        try {
          handle = queue.next((val) => {
            resolve(val)
          })
        } catch (err) {
          reject(err)
        }
      })
      return queue.pop()
    })
}

export function putToChannel(channel, message) {
  assertChannel(channel)
  if (channel.merger) {
    channel.merger.putToChannel(channel.merger.channel, message)
  } else {
    channel.pushToQueue(channel.queue, message)
  }
  return channel
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
    put: (msg) => putToChannel(ch, msg),
  }

  return ch
}
