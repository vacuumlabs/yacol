import {pidString, corType, builtinFns} from './constants'
import {isCor, assertCor} from './utils'

let idSeq = 0

const runPromise = (promise, handle) => {
  promise.then((res) => {
    handle.returnValue = res
    pushEnd(handle)
  }).catch((err) => {
    handleError(handle, err)
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

function handleError(handle, err) {

  // quite often, there may be multiple sources of errors. If handle is already in error state
  // do nothing
  if ('error' in handle) {
    return
  }

  // for logging purposes it's handy to remember, at what handle the error happened. However,
  // attaching this directly to err.handle would spam the console
  Object.defineProperty(err, 'handle', {value: handle})

  // first set .error attr to all errorneous channels, only then pushEnd to them to prevent
  // 'race conds'
  const shouldPushEnd = new Set()

  function _handleError(handle, err) {
    handle.error = err
    shouldPushEnd.add(handle)
    let handler = handle.options.onError
    let processed = false
    if (handler != null) {
      try {
        handle.returnValue = handler(err)
        processed = true
      } catch (errorCaught) {
        err = errorCaught
      }
    }
    if (!processed) {
      if (handle.parent == null) {
        console.error('unhandled error occured:', err)
        throw err
      } else {
        _handleError(handle.parent, err)
      }
    }
  }

  _handleError(handle, err)
  for (let handle of shouldPushEnd) {
    pushEnd(handle)
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
        handleError(handle, err)
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
          // We're repeating the logic from `runPromise` here. It would be nice just to `run` the
          // promise and handle it standard way, however, there is a bluebird-related problem with
          // such implementation: this way `runPromise` will start only in the next event loop and if the
          // (rejected) Promise does not have its error handler attached by that time, Bluebird will
          // mistakenly treat the error as unhandled
          if (looksLikePromise(nxt)) {
            nxt.catch((err) => {
              handleError(handle, err)
            }).then((res) => {step(res)})
          } else {
            if (isCor(nxt)) {
              childHandle = nxt
            } else {
              childHandle = run(nxt)
            }
            onReturn(childHandle, (err, ret) => {
              if (err == null) {
                step(ret)
              } else {
                handleError(handle, err)
              }
            })
          }
        }
      }
    })
  }
  // from the moment user calls run() we've already waited for the next event-loop to get here. At
  // this point, we can start execution immediately.
  _step()
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
  ) && !isCor(obj)
}

function getStacktrace() {
  const e = new Error()
  return e.stack
}

// creates coroutine handle, and collects all the options which can be specified via .then, .catch,
// etc. Delagates the actual running to runLater

export function run(first, ...args) {

  let id = `${idSeq++}`
  const parentHandle = global[pidString]

  let myZone = {
    public: new Map(),
    // handle: to be specified later
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
    type: corType,
    id,
    context: myZone,
    pendingSubProc: 0,
    locallyDone: false, // generator returned
    configLocked: false, // .catch shouldn't be able to modify config after the corroutine started
    done: false, // generator returned and everything terminated
    //returnValue,
    //error,
    options: {},
    parent: parentHandle,
    fn: first,
    args: args,
    stacktrace: getStacktrace(),
    returnListeners: new Set(),
    catch: (errorHandler) => addToOptions('onError', errorHandler),
    then
  }

  myZone.handle = handle

  changeProcCnt(parentHandle, 1)
  onReturn(handle, (err, res) => {
    changeProcCnt(parentHandle, -1)
    tryEnd(parentHandle)
  })

  setTimeout(() => runLater(handle, first, ...args), 0)

  return handle
}

function runLater(handle, first, ...args) {
  // the coroutine is to be started, so no more messing with config from now on
  handle.configLocked = true
  if (isCor(first)) {
    onReturn(first, (err, msg) => {
      if (err == null) {
        handle.returnValue = msg
        pushEnd(handle)
      } else {
        handleError(handle, err)
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

}

function pushEnd(handle) {
  assertCor(handle)
  if (handle.done) {
    throw new Error('cannot end channel more than once')
  }
  handle.done = true
  for (let listener of handle.returnListeners) {
    listener()
  }
}

export function onReturn(handle, cb) {
  assertCor(handle)

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
