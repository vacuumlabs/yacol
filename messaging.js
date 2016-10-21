import {runnableFromFunction, getCurrentCoroutine} from './utils'
import {channelType, handleType} from './constants'
import {WaitingQueue} from './queue'

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

const getMessageSafe_ = (handle, cb, errorValue = noErrorValue) => {
  assertHandle(handle)
  const channel = handle.channel
  const {queue, lastValue} = channel

  let returned = false
  let nextHandle
  let returnHandle
  nextHandle = queue.next(lastValue, (val, nextElem) => {
    // no point in further listening to an error
    if (returnHandle != null) {
      returnHandle.dispose()
    }
    channel.lastValue = nextElem
    cb(null, val)
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
          cb(err)
        } else {
          cb(null, errorValue)
        }
      }
    })
  }
}

export const getReturnSafe = runnableFromFunction(([handle, errorValue = noErrorValue], cb) => {
  onReturn(handle, (err, res) => {
    if (err != null) {
      if (errorValue !== noErrorValue) {
        cb(null, errorValue)
      } else {
        cb(err)
      }
    } else {
      cb(err)
    }
  })
})

export const getMessageSafe = runnableFromFunction(([handle, errorValue = noErrorValue], cb) => {
  assertHandle(handle)
  if (errorValue === noErrorValue) {
    throw new Error('the \'errorValue\' arg of getMessageSafe cannot be null')
  }
  getMessageSafe_(handle, cb, errorValue)
})

export const getMessage = runnableFromFunction(([chanOrHandle], cb) => {
  if (typeof chanOrHandle !== 'object' || chanOrHandle == null) {
    throw new Error('first argument of getMessage should be either channel or coroutine handle')
  }
  if (chanOrHandle.type === channelType) {
    const channel = chanOrHandle
    const {queue, lastValue} = channel
    queue.next(lastValue, (val, nextElem) => {
      channel.lastValue = nextElem
      cb(null, val)
    })
  } else if (chanOrHandle.type === handleType) {
    getMessageSafe_(chanOrHandle, cb)
  } else {
    throw new Error('first argument of getMessage should be either channel or coroutine handle')
  }
})

export const putMessage = runnableFromFunction(([msg], cb) => {
  pushMessage(getCurrentCoroutine().channel, msg)
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
