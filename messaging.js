import {runnableFromCb} from './utils'
import {channelType, handleType} from './constants'
import {WaitingQueue} from './queue'

const queues = new Map()
const returnListeners = new Map()
const channelEnded = new Map()
const iteratorFromChannel = new Map()

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

function dumpQueues() { // eslint-disable-line no-unused-vars
  console.log('queues:')
  for (let [chan, queue] of queues) {
    console.log(chan.id, queue.values())
  }
}

export const getMessage = runnableFromCb(([channel], cb) => {
  channel = sanitizeChannel(channel)
  iteratorFromChannel.get(channel).next((msg) => {
    cb(null, msg)
  })
})

/*
export const alts = (...args) => {
  for (let runnable of args) {
    handle = run(runnable)
    handle.onReturn((val) => {
      cb(
    })
  }
  //
  // yield [alts, [getMessage, channel1], [getMessage, channel2], [inc, 3, 4]]
  //
  //
}
*/

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
  const queue = queues.get(channel)
  queue.push(message)
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

export function onReturn(channel, cb) {
  channel = sanitizeChannel(channel)

  function _cb() {
    const queue = queues.get(channel)
    let val
    if (!queue.empty()) {
      val = queue.last()
    }
    cb(val)
  }
  if (channelEnded.get(channel)) {
    _cb()
  } else {
    returnListeners.get(channel).add(_cb)
  }
  return {dispose: () => {
    returnListeners.get(channel).delete(_cb)
  }}
}

let idSeq = 0
export function createChannel() {
  const channel = {
    type: channelType,
    id: idSeq++,
  }

  /*
  onReturn(channel, () => {
    iteratorFromChannel.get
  })
  */

  const queue = new WaitingQueue()
  queues.set(channel, queue)
  iteratorFromChannel.set(channel, queue.iterator())
  returnListeners.set(channel, new Set())
  channelEnded.set(channel, false)
  return channel
}
