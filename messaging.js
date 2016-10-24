import {channelType} from './constants'
import {Queue} from './queue'
import {assertChannel} from './utils'

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
  channel.queue.push(message)
}

export function createChannel() {
  return ({
    type: channelType,
    queue: new Queue(),
  })
}
