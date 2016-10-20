import {runnableFromCb} from './utils'
import {channelType, handleType} from './constants'
import {WaitingQueue} from './queue'

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

function assertChannel(channel) {
  if (channel.type !== channelType) {
    throw new Error('argument expected to be a channel')
  }
}

function assertHandle(handle) {
  if (handle.type !== handleType) {
    throw new Error('argument expected to be a handle')
  }
}

export const getMessage = runnableFromCb(([chOrHan], cb) => {
  const channel = sanitizeChannel(chOrHan)
  const {queue, lastValue} = channel
  queue.next(lastValue, (val, nextElem) => {
    channel.lastValue = nextElem
    cb(null, val)
  })
})

export const putMessage = runnableFromCb(([msg], cb, channel) => {
  assertChannel(channel)
  if (channel != null) {
    pushMessage(channel, msg)
  } else {
    console.warn('put message with null parrent channel called')
  }
  cb()
})

export function pushMessage(channel, message) {
  assertChannel(channel)
  const queue = channel.queue
  queue.push(message)
}

export function pushEnd(handle) {
  assertHandle(handle)
  if (handle.done) {
    throw new Error('cannot end channel more than once')
  }
  handle.done = true
  for (let listener of handle.returnListeners) {
    listener()
  }
}

export function onReturn(handle, cb) {
  assertHandle(handle)
  const channel = handle.channel

  function _cb() {
    const queue = channel.queue
    if (handle.error) {
      cb(handle.error)
    } else {
      let val
      if (!queue.empty()) {
        val = queue.last()
      }
      cb(null, val)
    }
  }
  if (handle.done) {
    _cb()
  } else {
    handle.returnListeners.add(_cb)
  }
  return {dispose: () => {
    handle.returnListeners.delete(_cb)
  }}
}

export function createChannel() {
  return ({
    type: channelType,
    queue: new WaitingQueue(),
    lastValue: null
  })
}
