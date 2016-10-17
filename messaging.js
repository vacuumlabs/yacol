import {runnableFromCb} from './utils'
import {channelType, handleType, corroutineEndMessage} from './constants'

const waitForMessage = new Map()

function sanitizeChannel(channelOrHandle) {
  if (channelOrHandle.type === channelType) {
    return channelOrHandle
  } else if (channelOrHandle.type === handleType) {
    return channelOrHandle.channel
  } else {
    console.error('expected channel (or coroutine handle), got: ', channelOrHandle)
    throw new Error('expected channel (or coroutine handle)')
  }
}

export const getMessage = runnableFromCb((channel, cb) => {
  channel = sanitizeChannel(channel)
  onceMessage(channel, (msg) => {cb(msg)})
})

export const putMessage = runnableFromCb((msg, cb, channel) => {
  pushMessage(channel, msg)
  cb()
})

export const getReturn = runnableFromCb((channel, cb) => {
  channel = sanitizeChannel(channel)
  onReturn(channel, (ret) => {cb(null, ret)})
})

export function pushMessage(channel, message) {
  const chanObj = waitForMessage.get(channel)
  if (chanObj != null) {
    const toBeCompleted = [...chanObj.perm, ...chanObj.once]
    chanObj.once = []
    for (let cb of toBeCompleted) {
      if (typeof cb !== 'function') {
        console.error('cb is not a fn', cb)
        throw new Error('cb is not a fn')
      }
      cb(message)
    }
  }
}

function initChannelObj(channel) {
  if (waitForMessage.get(channel) == null) {
    waitForMessage.set(channel, {once: [], perm: []})
  }
}

function disposeCb(channel, oncePerm, cb) {
  const channelObj = waitForMessage.get(channel)
  const index = channelObj[oncePerm].indexOf(cb)
  if (index !== -1) {
    console.log('!!! disposing cb')
    channelObj[oncePerm].splice(index, 1)
  }
}

export function onMessage(channel, cb) {
  initChannelObj(channel)
  waitForMessage.get(channel).perm.push(cb)
  return {dispose: () => disposeCb(channel, 'perm', cb)}
}

export function onceMessage(channel, cb) {
  initChannelObj(channel)
  waitForMessage.get(channel).once.push(cb)
  return {dispose: () => disposeCb(channel, 'once', cb)}
}

export function onReturn(channel, cb) {
  let lastValue
  const handle = onMessage(channel, (message) => {
    if (message === corroutineEndMessage) {
      cb(lastValue)
      handle.dispose()
    } else {
      lastValue = message
    }
  })
}

let idSeq = 0
export function createChannel() {
  return {
    type: channelType,
    id: idSeq++,
  }
}
