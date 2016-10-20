import {pushMessage, pushEnd, onReturn, createChannel} from './messaging'
import {pidString, handleType, runnableFromFunctionType} from './constants'
import {runnableFromFunction} from './utils'

let idSeq = 0

function zoneGet(key) {
  let zone = global[pidString].zone
  while (true) {
    if (zone.public.has(key)) {
      return zone.public.get(key)
    } else {
      zone = zone.parentZone
      if (zone == null) {
        break
      }
    }
  }
}

function zoneSet(key, val) {
  const zone = global[pidString].zone
  zone.public.set(key, val)
}

const runFromCb = (runnable, handle, parentHandle) => {
  const rfc = runnable[0]
  const args = [...runnable].splice(1)
  rfc.cb(args, (err, res) => {
    if (err != null) {
      handleError(err, handle)
    }
    pushMessage(handle.channel, res)
    pushEnd(handle)
  }, parentHandle == null ? null : parentHandle.channel)
}

function handleError(e, handle) {

  // first set .error attr to all errorneous channels, only then pushEnd to them to prevent
  // 'race conds'
  const shouldPushEnd = []

  function _handleError(e, handle) {
    handle.error = e
    shouldPushEnd.push(handle)
    let handler = handle.options.onError
    let processed = false
    if (handler != null) {
      try {
        handler(e)
        processed = true
      } catch (errorCaught) {
        e = errorCaught
      }
    }
    if (!processed) {
      if (handle.parent == null) {
        // uncaught error on the top level
        throw e
      } else {
        _handleError(e, handle.parent)
      }
    }
  }

  _handleError(e, handle)
  for (let handle of shouldPushEnd) {
    pushEnd(handle)
  }
}

const isRunnable(sth) {
  return (sth.type === handleType) || (sth.type === runnableFromFunction)
}

const runCorroutineRecursive = (runnable, handle) => {
  const args = runnable.slice(1)
  const realArgs = new Array(args.length)
  run(function*() { //eslint-disable-line no-use-before-define
    for (let i = 0; i < args.length; i++) {
      if (args[i].type === handleType) {
        realArgs[i] = yield args[i]
      }
    }
    const res = yield run([runnable[0], ...realArgs]) //eslint-disable-line no-use-before-define
    pushMessage(handle.channel, res)
    handle.locallyDone = true
    tryEnd(handle)
  })
}

const runCorroutine = (runnable, handle) => {

  const args = runnable.slice(1)
  for (let i = 0; i < args.length; i++) {
    if (args[i].type === handleType) {
      return runCorroutineRecursive(runnable, handle)
    }
  }

  const gen = runnable[0].apply(null, runnable.slice(1))

  function withPid(what) {
    let oldPid = global[pidString]
    global[pidString] = handle
    what()
    global[pidString] = oldPid
  }


  function step(val) {
    setTimeout(() => _step(val), 0)
  }

  function _step(val) {
    if (handle.error != null) {
      return
    }
    withPid(() => {
      let nxt
      try {
        nxt = gen.next(val)
      } catch (err) {
        handleError(err, handle)
      }
      if (nxt != null) {
        if (nxt.done) {
          if (handle.locallyDone) {
            throw new Error('myZone.done was already set to true')
          }
          if (nxt.value !== undefined) {
            pushMessage(handle.channel, nxt.value)
          }
          handle.locallyDone = true
          tryEnd(handle)
        } else {
          nxt = nxt.value
          let childHandle = run(nxt, handle)
          onReturn(childHandle, (err, ret) => {
            if (err == null) {
              step(ret)
            } else {
              // Error on subprocess may or may not cause crash of a current process.
              // If the current process is still OK, but it tries to yield from crashed subprocess,
              // the error occurs.
              if (handle.error == null) {
                handleError(err, handle)
              }
            }
          })
        }
      }
    })
  }
  step(null)
}

function changeProcCnt(handle, val) {
  if (handle != null) {
    handle.pendingSubProc += val
  }
}

function tryEnd(handle) {
  if (handle != null) {
    if (handle.pendingSubProc === 0 && handle.locallyDone && handle.error == null) {
      pushEnd(handle)
    }
  }
}

// implementation of run
const run = (runnable, options = {}) => {

  let id = `${idSeq++}`
  let channel = createChannel()
  const parentHandle = global[pidString]

  let myZone = {
    public: new Map(),
    parentZone: parentHandle == null ? null : parentHandle.zone
  }

  const handle = {
    type: handleType,
    id,
    channel,
    zone: myZone,
    pendingSubProc: 0,
    locallyDone: false, // generator returned
    done: false, // generator returned and everything terminated
    error: null,
    options,
    parent: parentHandle,
    returnListeners: new Set(),
  }

  channel.handle = handle

  changeProcCnt(parentHandle, 1)
  onReturn(handle, (err, res) => {
    changeProcCnt(parentHandle, -1)
    tryEnd(parentHandle)
  })

  if (typeof runnable === 'object' && runnable.type === handleType) {
    onReturn(runnable, (err, msg) => {
      if (err == null) {
        pushMessage(handle.channel, msg)
        pushEnd(handle)
      } else {
        handleError(err, handle)
      }
    })
  } else if (typeof runnable === 'function') {
    runCorroutine([runnable], handle)
  } else if (Array.isArray(runnable)) {
    const first = runnable[0]
    if (typeof first === 'function') {
      runCorroutine(runnable, handle, myZone)
    } else if (typeof first === 'object' && first.type === runnableFromFunctionType) {
      runFromCb(runnable, handle, parentHandle)
    } else {
      console.error(`unknown runnable (type: ${typeof first}),`, first)
      throw new Error('unknown runnable')
    }
  } else {
    console.error('runnable should be function or array, got', runnable)
    throw new Error('unknown runnable')
  }

  return handle
}

const zone = {get: zoneGet, set: zoneSet}
export {run, zone}

export const alts = runnableFromFunction((args, cb) => {
  let returned = false
  for (let i = 0; i < args.length; i++) {
    let handle = run(args[i])
    onReturn(handle, (err, val) => {
      if (!returned) {
        returned = true
        cb(err, [i, val])
      }
    })
  }
})
