import {channelType} from './constants'
import {WaitingQueue} from './queue'
import {getCurrentCoroutine} from './utils'

export function assertChannel(channel) {
  if (channel.type !== channelType) {
    throw new Error('argument expected to be a channel')
  }
}

export function getMessage(channel) {
  assertChannel(channel)
  const handle = getCurrentCoroutine()
  return new Promise((resolve, reject) => {
    const {lastValue} = handle
    const {queue} = channel
    queue.next(lastValue, (val, nextElem) => {
      handle.lastValue = nextElem
      resolve(val)
    })
  })
}

export function pushMessage(channel, message) {
  assertChannel(channel)
  const queue = channel.queue
  queue.push(message)
}

export function createChannel(options = {}) {
  return ({
    type: channelType,
    queue: new WaitingQueue(options),
    options,
  })
}
