import {runnableFromCb} from './utils'
import {channelType, handleType} from './constants'
import {WaitingQueue} from './queue'

/*
const queues = new WeakMap()
const lastValues = new WeakMap()
const returnListeners = new WeakMap()
const channelEnded = new WeakMap()
*/

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

/*
function dumpQueues() { // eslint-disable-line no-unused-vars
  console.log('queues:')
  for (let [chan, queue] of queues) {
    console.log(chan.id, queue.values())
  }
}
*/

export const getMessage = runnableFromCb(([channel], cb) => {
  channel = sanitizeChannel(channel)
  const {queue, lastValue} = channel
  queue.next(lastValue, (val, nextElem) => {
    channel.lastValue = nextElem
    cb(null, val)
  })
})

export const putMessage = runnableFromCb(([msg], cb, channel) => {
  if (channel != null) {
    pushMessage(channel, msg)
  } else {
    console.warn('put message with null parrent channel called')
  }
  cb()
})

export const getReturn = runnableFromCb(([channel], cb) => {
  channel = sanitizeChannel(channel)
  onReturn(channel, (ret) => {cb(null, ret)})
})

export function pushMessage(channel, message) {
  const queue = channel.queue
  queue.push(message)
}

export function pushEnd(channel) {
  if (channel.ended) {
    throw new Error('cannot end channel more than once')
  }
  channel.ended = true
  for (let listener of channel.returnListeners) {
    listener()
  }
}

export function onReturnSafe(channel, cb) {
  channel = sanitizeChannel(channel)

  function _cb() {
    const queue = channel.queue
    let val
    if (!queue.empty()) {
      val = queue.last()
    }
    cb(val)
  }
  if (channel.ended) {
    _cb()
  } else {
    channel.returnListeners.add(_cb)
  }
  return {dispose: () => {
    channel.returnListeners.delete(_cb)
  }}
}

export function onReturn(channel, cb) {
  channel = sanitizeChannel(channel)

  function _cb() {
    const queue = channel.queue
    let val
    if (!queue.empty()) {
      val = queue.last()
    }
    cb(val)
  }
  if (channel.ended) {
    _cb()
  } else {
    channel.returnListeners.add(_cb)
  }
  return {dispose: () => {
    channel.returnListeners.delete(_cb)
  }}
}

export function createChannel() {
  return ({
    type: channelType,
    queue: new WaitingQueue(),
    returnListeners: new Set(),
    channelEnded: false,
    lastValue: null
  })
}
