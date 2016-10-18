import {runnableFromCb} from './utils'
import {channelType, handleType} from './constants'
import Queue from './queue'

const queues = new Map()
const messageListeners = new Map()
const returnListeners = new Map()
const channelEnded = new Map()

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
  const queue = queues.get(channel)
  queue.push(message)
  for (let listener of messageListeners.get(channel)) {
    listener(message)
  }
}

export function pushEnd(channel) {
  const ended = channelEnded.get(channel)
  if (ended) {
    throw new Error('cannot end channel more than once')
  }
  channelEnded.set(channel, true)
  for (let listener of returnListeners.get(channel)) {
    listener()
  }
}

export function onMessage(channel, cb) {
  messageListeners.get(channel).add(cb)
  const queue = queues.get(channel)
  let disposed = false
  for (let val of queue.values()) {
    if (disposed) break
    cb(val)
  }
  return {dispose: () => {
    disposed = true
    messageListeners.get(channel).delete(cb)
  }}
}

export function onceMessage(channel, cb) {
  const handle = onMessage(channel, (val) => {
    handle.dispose()
    cb(val)
  })
}

export function onReturn(channel, cb) {

  function _cb() {
    const queue = queues.get(channel)
    let val
    if (!queue.empty()) {
      val = queue.last()
    }
    cb(val)
  }
  let disposed = false
  if (channelEnded.get(channel)) {
    if (!disposed) {_cb()}
  } else {
    returnListeners.get(channel).add(_cb)
  }
  return {dispose: () => {
    disposed = true
    returnListeners.get(channel).delete(_cb)
  }}
}

let idSeq = 0
export function createChannel() {
  const channel = {
    type: channelType,
    id: idSeq++,
  }
  queues.set(channel, Queue())
  returnListeners.set(channel, new Set())
  messageListeners.set(channel, new Set())
  channelEnded.set(channel, false)
  return channel
}
