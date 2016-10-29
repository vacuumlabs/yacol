import {pidString, corType, builtinFns} from './constants'
import {isCor, assertCor} from './utils'

let idSeq = 0

const runPromise = (cor, promise) => {
  promise.then((res) => {
    cor.returnValue = res
    pushEnd(cor)
  }).catch((err) => {
    handleError(cor, err)
  })
}

const runBuiltin = (cor, first, args) => {
  const promise = new Promise((resolve, reject) => {
    first(...args, (err, res) => {
      if (err == null) {
        resolve(res)
      } else {
        reject(err)
      }
    })
  })
  runPromise(cor, promise)
}

function handleError(cor, err) {

  // quite often, there may be multiple sources of errors. If cor is already in error state
  // do nothing
  if ('error' in cor) {
    return
  }

  // for logging purposes it's handy to remember, at what cor the error happened. However,
  // attaching this directly to err.cor would spam the console
  Object.defineProperty(err, 'cor', {value: cor})

  // first set .error attr to all errorneous channels, only then pushEnd to them to prevent
  // 'race conds'
  const shouldPushEnd = new Set()

  function _handleError(cor, err) {
    cor.error = err
    shouldPushEnd.add(cor)
    let handler = cor.options.onError
    let processed = false
    if (handler != null) {
      try {
        cor.returnValue = handler(err)
        processed = true
      } catch (errorCaught) {
        err = errorCaught
      }
    }
    if (!processed) {
      if (cor.parent == null) {
        console.error('unhandled error occured:', err)
        throw err
      } else {
        _handleError(cor.parent, err)
      }
    }
  }

  _handleError(cor, err)
  for (let cor of shouldPushEnd) {
    pushEnd(cor)
  }
}


const runGenerator = (cor, gen) => {

  function withPid(what) {
    let oldPid = global[pidString]
    global[pidString] = cor
    what()
    global[pidString] = oldPid
  }

  function step(val) {
    setTimeout(() => _step(val), 0)
  }

  function _step(val) {
    if (cor.done) {
      return
    }
    withPid(() => {
      let nxt
      try {
        nxt = gen.next(val)
      } catch (err) {
        handleError(cor, err)
      }
      if (nxt != null) {
        if (nxt.done) {
          if (cor.locallyDone) {
            throw new Error('myZone.done was already set to true')
          }
          cor.returnValue = nxt.value
          cor.locallyDone = true
          tryEnd(cor)
        } else {
          nxt = nxt.value
          let childHandle
          // We're repeating the logic from `runPromise` here. It would be nice just to `run` the
          // promise and cor it standard way, however, there is a bluebird-related problem with
          // such implementation: this way `runPromise` will start only in the next event loop and if the
          // (rejected) Promise does not have its error handler attached by that time, Bluebird will
          // mistakenly treat the error as unhandled
          if (looksLikePromise(nxt)) {
            nxt.catch((err) => {
              handleError(cor, err)
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
                handleError(cor, err)
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

function changeProcCnt(cor, val) {
  if (cor != null) {
    cor.pendingSubProc += val
  }
}

function tryEnd(cor) {
  if (cor != null) {
    // if coroutine ended with error, pushEnd was already called
    if (cor.pendingSubProc === 0 && cor.locallyDone && (!('error' in cor))) {
      pushEnd(cor)
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

// creates coroutine cor, and collects all the options which can be specified via .then, .catch,
// etc. Delagates the actual running to runLater

export function run(first, ...args) {

  let id = `${idSeq++}`
  const parentCor = global[pidString]

  let myZone = {
    public: new Map(),
    // cor: to be specified later
  }

  function addToOptions(key, val) {
    if (cor.configLocked) {
      console.error('Cannot modify options after coroutine started. Ignoring the command')
    } else if (key in cor.options) {
      console.error('Cannot override coroutine options. Ignoring the command')
    } else {
      cor.options[key] = val
    }
    return cor
  }

  function then(fn) {
    return new Promise((resolve, reject) => {
      onReturn(
        cor,
        (err, res) => {
          if (err == null) {
            resolve(res)
          } else {
            reject(err)
          }
        })
    }).then(fn)
  }

  const cor = {
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
    parent: parentCor,
    fn: first,
    args: args,
    stacktrace: getStacktrace(),
    returnListeners: new Set(),
    catch: (errorHandler) => addToOptions('onError', errorHandler),
    then
  }

  myZone.cor = cor

  changeProcCnt(parentCor, 1)
  onReturn(cor, (err, res) => {
    changeProcCnt(parentCor, -1)
    tryEnd(parentCor)
  })

  setTimeout(() => runLater(cor, first, ...args), 0)

  return cor
}

function runLater(cor, first, ...args) {
  // the coroutine is to be started, so no more messing with config from now on
  cor.configLocked = true
  if (isCor(first)) {
    onReturn(first, (err, msg) => {
      if (err == null) {
        cor.returnValue = msg
        pushEnd(cor)
      } else {
        handleError(cor, err)
      }
    })
  } else if (typeof first === 'function' && builtinFns.has(first)) {
    runBuiltin(cor, first, args)
  } else if (typeof first === 'function') {
    const gen = first(...args)
    if (looksLikePromise(gen)) {
      runPromise(cor, gen)
    } else if (typeof gen.next === 'function') {
      runGenerator(cor, gen)
    } else {
      console.error(`unknown first argument (type: ${typeof first}),`, first)
      throw new Error('unknown first argument')
    }
  } else if (looksLikePromise(first)) {
    runPromise(first, cor)
  } else {
    console.error(`unknown first argument (type: ${typeof first}),`, first)
    throw new Error('unknown first argument')
  }

}

function pushEnd(cor) {
  assertCor(cor)
  if (cor.done) {
    throw new Error('cannot end channel more than once')
  }
  cor.done = true
  for (let listener of cor.returnListeners) {
    listener()
  }
}

export function onReturn(cor, cb) {
  assertCor(cor)

  function _cb() {
    if ('error' in cor) {
      if ('returnValue' in cor) {
        cb(null, cor.returnValue)
      } else {
        if (cor.error == null) {
          console.error('Throwing null and undefined is not yet supported!')
        }
        cb(cor.error)
      }
    } else {
      cb(null, cor.returnValue)
    }
  }
  if (cor.done) {
    _cb()
  } else {
    cor.returnListeners.add(_cb)
  }
  return {dispose: () => {
    cor.returnListeners.delete(_cb)
  }}
}
