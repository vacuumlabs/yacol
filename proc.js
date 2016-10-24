import {pidString, handleType, builtinFns} from './constants'
import {isHandle, assertHandle} from './utils'

let idSeq = 0

const runPromise = (promise, handle) => {
  promise.then((res) => {
    pushEnd(handle, res)
  }).catch((err) => {
    handleError(err, handle)
  })
}

const runBuiltin = (first, args, handle) => {
  const promise = new Promise((resolve, reject) => {
    first(...args, (err, res) => {
      if (err == null) {
        resolve(res)
      } else {
        reject(err)
      }
    })
  })
  runPromise(promise, handle)
}

function handleError(e, handle) {

  // first set .error attr to all errorneous channels, only then pushEnd to them to prevent
  // 'race conds'
  const shouldPushEnd = new Map()

  function _handleError(e, handle) {
    handle.error = e
    shouldPushEnd.set(handle, pushEndNoReturnValue)
    let handler = handle.options.onError
    let processed = false
    if (handler != null) {
      try {
        let errorValue = handler(e)
        shouldPushEnd.set(handle, errorValue)
        processed = true
      } catch (errorCaught) {
        e = errorCaught
      }
    }
    if (!processed) {
      if (handle.parent == null) {
        // uncaught error on the top level
        console.error('unhandled error occured:', e)
        throw e
      } else {
        _handleError(e, handle.parent)
      }
    }
  }

  _handleError(e, handle)
  for (let [handle, value] of shouldPushEnd) {
    pushEnd(handle, value)
  }
}


const runGenerator = (gen, handle) => {

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
    if (handle.done) {
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
          handle.returnValue = nxt.value
          handle.locallyDone = true
          tryEnd(handle)
        } else {
          nxt = nxt.value
          let childHandle
          if (isHandle(nxt)) {
            childHandle = nxt
          } else {
            childHandle = run(nxt)
          }
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
    // if coroutine ended with error, pushEnd was already called
    if (handle.pendingSubProc === 0 && handle.locallyDone && (!('error' in handle))) {
      pushEnd(handle)
    }
  }
}

function looksLikePromise(obj) {
  return (
    typeof obj === 'object' &&
    typeof obj.then === 'function' &&
    typeof obj.catch === 'function'
  )
}

// implementation of run
export const run = (first, ...args) => {

  let id = `${idSeq++}`
  const parentHandle = global[pidString]

  let myZone = {
    public: new Map(),
    parentZone: parentHandle == null ? null : parentHandle.zone
  }

  function addToOptions(key, val) {
    if (handle.configLocked) {
      console.error('Cannot modify options after coroutine started. Ignoring the command')
    } else if (key in handle.options) {
      console.error('Cannot override coroutine options. Ignoring the command')
    } else {
      handle.options[key] = val
    }
    return handle
  }

  function then(fn) {
    return new Promise((resolve, reject) => {
      onReturn(
        handle,
        (err, res) => {
          if (err == null) {
            resolve(res)
          } else {
            reject(err)
          }
        })
    }).then(fn)
  }

  const handle = {
    type: handleType,
    id,
    zone: myZone,
    pendingSubProc: 0,
    locallyDone: false, // generator returned
    configLocked: false, // .catch shouldn't be able to modify config after the corroutine started
    done: false, // generator returned and everything terminated
    //returnValue,
    //error,
    options: {},
    parent: parentHandle,
    returnListeners: new Set(),
    catch: (errorHandler) => addToOptions('onError', errorHandler),
    then
  }

  changeProcCnt(parentHandle, 1)
  onReturn(handle, (err, res) => {
    changeProcCnt(parentHandle, -1)
    tryEnd(parentHandle)
  })

  setTimeout(() => {handle.configLocked = true}, 0)
  if (isHandle(first)) {
    onReturn(first, (err, msg) => {
      if (err == null) {
        pushEnd(handle, msg)
      } else {
        handleError(err, handle)
      }
    })
  } else if (typeof first === 'function' && builtinFns.has(first)) {
    runBuiltin(first, args, handle)
  } else if (typeof first === 'function') {
    const gen = first(...args)
    if (looksLikePromise(gen)) {
      runPromise(gen, handle)
    } else if (typeof gen.next === 'function') {
      runGenerator(gen, handle)
    } else {
      console.error(`unknown first argument (type: ${typeof first}),`, first)
      throw new Error('unknown first argument')
    }
  } else if (looksLikePromise(first)) {
    runPromise(first, handle)
  } else {
    console.error(`unknown first argument (type: ${typeof first}),`, first)
    throw new Error('unknown first argument')
  }

  return handle
}


const pushEndNoReturnValue = {}
function pushEnd(handle, returnValue = pushEndNoReturnValue) {
  assertHandle(handle)
  if (returnValue !== pushEndNoReturnValue) {
    handle.returnValue = returnValue
  }
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

  function _cb() {
    if ('error' in handle) {
      if ('returnValue' in handle) {
        cb(null, handle.returnValue)
      } else {
        if (handle.error == null) {
          console.error('Throwing null and undefined is not yet supported!')
        }
        cb(handle.error)
      }
    } else {
      cb(null, handle.returnValue)
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
