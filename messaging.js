import {channelType, handleType} from './constants'
import {WaitingQueue} from './queue'
import {runnableFromFunction} from './utils'

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

const noErrorValue = {}

export function getReturnSafe(handle, errorValue = noErrorValue) {
  return new Promise((resolve, reject) => {
    onReturn(handle, (err, res) => {
      if (err != null) {
        if (errorValue !== noErrorValue) {
          resolve(errorValue)
        } else {
          reject(err)
        }
      } else {
        reject(err)
      }
    })
  })
}

function getMessageSafe_(ctx, handle, errorValue = noErrorValue) {
  return new Promise((resolve, reject) => {
    assertHandle(handle)
    const parentHandle = ctx.parentHandle
    const channel = handle.channel
    const {queue} = channel
    const {lastValue} = parentHandle

    let returned = false
    let nextHandle
    let returnHandle
    nextHandle = queue.next(lastValue, (val, nextElem) => {
      // no point in further listening to an error
      if (returnHandle != null) {
        returnHandle.dispose()
      }
      parentHandle.lastValue = nextElem
      resolve(val)
      returned = true
    })
    // if queue.next executed cb synchronously
    if (!returned) {
      returnHandle = onReturn(handle, (err, res) => {
        if (err != null) {
          // no point in further listening to an error
          if (nextHandle != null) {
            nextHandle.dispose()
          }
          if (errorValue === noErrorValue) {
            reject(err)
          } else {
            resolve(errorValue)
          }
        }
      })
    }
  })
}

export function getMessageSafe(ctx, handle, errorValue = noErrorValue) {
  assertHandle(handle)
  if (errorValue === noErrorValue) {
    throw new Error('the \'errorValue\' arg of getMessageSafe cannot be null')
  }
  return getMessageSafe_(ctx, handle, errorValue)
}

export function getMessage(ctx, chanOrHandle) {
  if (typeof chanOrHandle !== 'object' || chanOrHandle == null) {
    throw new Error('first argument of getMessage should be either channel or coroutine handle')
  }
  if (chanOrHandle.type === channelType) {
    return new Promise((resolve, reject) => {
      if (chanOrHandle.type === channelType) {
        const channel = chanOrHandle
        const {lastValue} = ctx.parentHandle
        const {queue} = channel
        queue.next(lastValue, (val, nextElem) => {
          ctx.parentHandle.lastValue = nextElem
          resolve(val)
        })
      }
    })
  } else if (chanOrHandle.type === handleType) {
    return getMessageSafe_(ctx, chanOrHandle)
  } else {
    throw new Error('first argument of getMessage should be either channel or coroutine handle')
  }
}

export const putMessage = runnableFromFunction(([msg], cb, parrentHandle) => {
  pushMessage(parrentHandle.channel, msg)
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

export function createChannel(options = {}) {
  return ({
    type: channelType,
    queue: new WaitingQueue(options),
    options,
  })
}

export const needContext = new Set([getMessage, putMessage, getMessageSafe])
