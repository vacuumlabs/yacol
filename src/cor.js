import {pidString, corType, builtinFns, terminatedErrorType} from './constants'
import {createChannel, pushMessage, getMessage} from './messaging'
import {isCor, assertCor} from './utils'

let idSeq = 0

const runPromise = (cor, promise) => {
  if (cor.options.inspectMode) {
    pushMessage(cor.effects, {promise})
    return
  }
  promise.then((res) => {
    setDone(cor, {returnValue: res})
  }).catch((err) => {
    handleError(cor, err)
  })
}

const runBuiltin = (cor, runnable, args) => {
  const promise = new Promise((resolve, reject) => {
    runnable(...args, (err, res) => {
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

  // cor may already be ended for various reasons. In such a case, do nothing
  if (isDone(cor)) {
    return
  }

  // for logging purposes it's handy to remember, at what cor the error happened. However,
  // attaching this directly to err.cor would spam the console
  if (!('cor' in err)) {
    Object.defineProperty(err, 'cor', {value: cor})
  }

  function _handleError(cor, err) {
    if (isDone(cor)) {return}
    const options = {}
    let handler = cor.options.onError
    let processed
    if (handler != null) {
      try {
        options.returnValue = handler(err)
        processed = true
      } catch (errorCaught) {
        err = errorCaught
        options.error = err
        processed = false
      }
    } else {
      options.error = err
      processed = false
    }
    setDone(cor, options)
    for (let child of cor.children) {
      kill(child)
    }
    if (!processed) {
      if (cor.parent == null) {
        console.error('Uncaught error occured. It is a good ' +
          'practice to attach a global error handler to the top-level coroutine')
        console.error(err)
      } else {
        _handleError(cor.parent, err)
      }
    }
  }

  _handleError(cor, err)
}

const runGenerator = (cor, gen) => {

  if (cor.options.inspectMode) {
    cor.step = step
  }

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
    if (isDone(cor)) {return}
    withPid(() => {
      let nxt
      try {
        nxt = gen.next(val)
        if (cor.options.inspectMode) {
          if (nxt.done) {
            pushMessage(cor.effects, {returnValue: nxt.value, done: true})
            return
          } else if (isCor(nxt.value)) {
            pushMessage(cor.effects, {
              runnable: nxt.value.runnable,
              args: nxt.value.args,
            })
            return
          } else if (looksLikePromise(nxt.value)) {
            pushMessage(cor.effects, {promise: nxt.value})
          }
        }
      } catch (err) {
        if (cor.options.inspectMode) {
          pushMessage(cor.effects, {error: err, done: true})
          return
        }
        handleError(cor, err)
      }
      if (nxt != null) {
        if (nxt.done) {
          if (cor.locallyDone) {
            throw new Error('myZone.done was already set to true')
          }
          cor.returnValuePending = nxt.value
          cor.locallyDone = true
          tryEnd(cor)
        } else {
          nxt = nxt.value
          if (looksLikePromise(nxt)) {
            // We're repeating the logic from `runPromise` here. It would be nice just to `run` the
            // promise and cor it standard way, however, there is a bluebird-related problem with
            // such implementation: this way `runPromise` will start only in the next event loop and if the
            // (rejected) Promise does not have its error handler attached by that time, Bluebird will
            // mistakenly treat the error as unhandled
            nxt.catch((err) => {
              handleError(cor, err)
            }).then((res) => {step(res)})
          } else {
            let childHandle
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

function tryEnd(cor) {
  if (cor != null) {
    if (cor.children.size === 0 && cor.locallyDone && !isDone(cor)) {
      setDone(cor, {returnValue: cor.returnValuePending})
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

function makeLink(child, parent) {
  child.parent = parent
  parent.children.add(child)
}

function unLink(child) {
  const found = child.parent.children.delete(child)
  if (!found) {
    throw new Error('Internal yacol error: inconsistent child-parent tree')
  }
  delete child.parent
}

function isDone(corr) {
  return (('returnValue' in corr) || ('error' in corr))
}

function resolvePatched(cor, runnable) {
  while (true) {
    if (cor.patchData != null && cor.patchData.has(runnable)) {
      return cor.patchData.get(runnable)
    }
    cor = cor.parent
    if (cor == null) {
      break
    }
  }
  return runnable
}

export function run(runnable, ...args) {
  return runWithOptions({}, runnable, ...args)
}

export function runWithParent(parent, runnable, ...args) {
  return runWithOptions({parent}, runnable, ...args)
}

export function runDetached(runnable, ...args) {
  return runWithOptions({parent: null}, runnable, ...args)
}

// creates coroutine cor, and collects all the options which can be specified via .then, .catch,
// etc. Delagates the actual running to runLater

export function runWithOptions(options, runnable, ...args) {

  let id = `${idSeq++}`
  const parentCor = 'parent' in options ? options.parent : global[pidString]

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

  function inspect() {
    addToOptions('inspectMode', true)
    cor.effects = createChannel()
    cor.getEffect = () => run(getMessage, cor.effects)
    return cor
  }

  function patch(...args) {
    if (cor.patchData != null) {
      handleError(cor, new Error('patch: For your safety, you cannot patch single coroutine more than once'))
    }
    cor.patchData = new Map()
    for (let arg of args) {
      if (!(Array.isArray(arg) && arg.length === 2)) {
        handleError(cor, new Error('patch: all arguments of patch must be arrays of size 2'))
      }
      if (cor.patchData.has(arg)) {
        handleError(cor, new Error('patch: For your safety, you cannot patch single runnable more than once'))
      }
      cor.patchData.set(arg[0], arg[1])
    }
    return cor
  }

  const cor = {
    type: corType,
    id,
    context: myZone,
    locallyDone: false, // generator has returned
    configLocked: false, // .catch shouldn't be able to modify config after the corroutine started
    // .catch, .inspect, etc are used to populate this object with info customizing the run
    options: Object.assign({}, options),
    children: new Set(),
    runnable, // runnable, args and stacktrace are for introspection and debug purposes
    args: args,
    stacktrace: getStacktrace(),
    returnListeners: new Set(),
    then,
    catch: (errorHandler) => addToOptions('onError', errorHandler),
    patch,
    inspect,
    /*
     * in inspect mode:
     *   `step`: step function
     *   `effects`: channel for pushing the effects
     *
     * `returnValue`: The value that will be yielded from the coroutine. Can be specified by return
     * statement or error handler. Return value present is semanticaly equivalent to done = true
     *
     * `returnValuePending`: value returned from a generator, but not yet assigned to returnValue,
     * because children are still computing
     *
     * `error`: if present, the coroutine failed.
     *
     * `parent`: parent coroutine
    */
  }

  myZone.cor = cor
  if (parentCor != null) {
    if (options.killOnEnd) {
      cor.parent = parentCor
      onReturn(parentCor, (err, res) => {
        // if cor already terminated, killing do nothing
        kill(cor)
        delete cor.parent
      })
    } else {
      makeLink(cor, parentCor)
      onReturn(cor, (err, res) => {
        unLink(cor)
        tryEnd(parentCor)
      })
    }
  }

  // if parent in inspect mode, don't run the coroutine
  if (!(parentCor != null && parentCor.options.inspectMode)) {
    setTimeout(() => runLater(cor, runnable, ...args), 0)
  }

  return cor
}

function runLater(cor, runnable, ...args) {
  // the coroutine is to be started, so no more messing with config from now on
  cor.configLocked = true
  runnable = resolvePatched(cor, runnable)
  if (isCor(runnable)) {
    onReturn(runnable, (err, msg) => {
      if (err == null) {
        setDone(cor, {returnValue: msg})
      } else {
        handleError(cor, err)
      }
    })
  } else if (typeof runnable === 'function' && builtinFns.has(runnable)) {
    runBuiltin(cor, runnable, args)
  } else if (typeof runnable === 'function') {
    const gen = runnable(...args)
    if (looksLikePromise(gen)) {
      runPromise(cor, gen)
    } else if (typeof gen.next === 'function') {
      runGenerator(cor, gen)
    } else {
      console.error(`unknown first argument (type: ${typeof runnable}),`, runnable)
      handleError(cor, new Error('unknown first argument'))
    }
  } else if (looksLikePromise(runnable)) {
    runPromise(runnable, cor)
  } else {
    console.error(`unknown first argument (type: ${typeof runnable}),`, runnable)
    handleError(cor, new Error('unknown first argument'))
  }
}

function setDone(cor, options = {}) {
  assertCor(cor)
  if (isDone(cor)) {
    throw new Error('Internal yacol error: cannot end channel more than once')
  }
  let e = ('error' in options)
  let r = ('returnValue' in options)
  if (e && !r) {
    cor.error = options.error
  } else if (r && !e) {
    cor.returnValue = options.returnValue
  } else if (r && e) {
    throw new Error('Internal yacol error: both error and returnValue are specified')
  } else {
    throw new Error('Internal yacol error: either error or return value must be specified')
  }
  setTimeout(() => {
    for (let listener of cor.returnListeners) {
      listener()
    }
  }, 0)
}

export function onReturn(cor, cb) {
  assertCor(cor)

  function _cb() {
    if ('error' in cor) {
      if (cor.error == null) {
        console.error('Throwing null and undefined is not yet supported! Re-throwing empty error.')
        cor.error = new Error()
      }
      cb(cor.error)
    } else {
      cb(null, cor.returnValue)
    }
  }
  if (isDone(cor)) {
    _cb()
  } else {
    cor.returnListeners.add(_cb)
  }
  return {dispose: () => {
    cor.returnListeners.delete(_cb)
  }}
}

const terminatedError = new Error('Coroutine was terminated')
terminatedError.type = terminatedErrorType

export function kill(...args) {
  const cor = args[0]
  if (!isDone(cor)) {
    let options = {}
    if (args.length > 1) {
      options.returnValue = args[1]
    } else if (cor.options.onError != null) {
      try {
        options.returnValue = cor.options.onError(terminatedError)
      } catch (e) {
        handleError(cor, e)
      }
    } else {
      options.error = terminatedError
    }
    // if error handler throws
    if (!isDone(cor)) {
      setDone(cor, options)
    }
  }
  for (let child of cor.children) {
    kill(child)
  }
}
