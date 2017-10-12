import {pidString, corType, terminatedErrorType} from './constants'
import {isCor, assertCor, prettyErrorLog} from './utils'

let idSeq = 0

function handleError(cor, err) {
  // for logging purposes it's handy to remember, at what cor the error happened. However,
  // attaching this directly to err.cor would spam the console
  if (!('cor' in err)) {
    Object.defineProperty(err, 'cor', {value: cor})
  }

  if (isDone(cor)) {return}
  let handler = cor.options.onError
  let processed
  const setDoneOptions = {}
  let errToProcess = err

  if (!processed && handler != null) {
    try {
      setDoneOptions.returnValue = handler(err)
      processed = true
    } catch (err) {
      errToProcess = err
    }
  }

  if (!processed) {
    setDoneOptions.error = errToProcess
  }

  setDone(cor, setDoneOptions)

  for (let child of cor.children) {
    kill(child)
  }

  if (!processed && err !== terminatedError) {
    if (cor.parent) {
      if (!cor.awaitedByParent) {
        handleError(cor.parent, errToProcess)
      } else {
        //pass
      }
    } else {
      prettyErrorLog(errToProcess, 'UNHANDLED ERROR')
      throw errToProcess
    }
  }
}

const runGenerator = (cor, gen) => {

  function withPid(what) {
    let oldPid = global[pidString]
    global[pidString] = cor
    what()
    global[pidString] = oldPid
  }

  function processNxt(nxt) {
    if (nxt.done) {
      if (cor.locallyDone) {
        throw new Error('yacol internal error: myZone.done was already set to true')
      }
      cor.returnValuePending = nxt.value
      cor.locallyDone = true
      tryEnd(cor)
    } else {
      nxt = nxt.value
      if (looksLikePromise(nxt)) {
        // .catch handler must be attached to promise in the current event loop tick. Otherwise, some
        // Promise implementations may complain
        nxt.catch((err) => {
          handleError(cor, err)
        }).then((res) => {step(res)})
      } else if (isCor(nxt)) {
        nxt.awaitedByParent = true
        onReturn(nxt, (err, ret) => {
          if (err == null) {
            step(ret)
          } else {
            try {
              const nxtNxt = gen.throw(err)
              processNxt(nxtNxt)
            } catch (nxtErr) {
              handleError(cor, err)
            }
          }
        })
      } else {
        throw new Error('Yacol internal error: unknow runnable')
      }
    }
  }

  function step(val) {
    if (isDone(cor)) {return}
    withPid(() => {
      try {
        let nxt
        nxt = gen.next(val)
        processNxt(nxt)
      } catch (err) {
        handleError(cor, err)
        return
      }
    })
  }
  // from the moment user calls run() we've already waited for the next event-loop cycle to get here. At
  // this point, the we can start execution immediately.
  step()
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

// see documentation
export function run(runnable, ...args) {
  return runWithOptions({}, runnable, ...args)
}

export function coroutine(fn) {
  return function(...args) {
    const res = run(fn, ...args)
    res.fn = fn
    return res
  }
}

/* `parent` is used as a parent for the newly created coroutine. This creates other-than-default
 * coroutine hierarchy and should be used with care */
export function runWithParent(parent, runnable, ...args) {
  return runWithOptions({parent}, runnable, ...args)
}

/* runs coroutine as a top-level one, i.e. the parent is null instead of currently running coroutine
 * */
export function runDetached(runnable, ...args) {
  return runWithOptions({parent: null}, runnable, ...args)
}

// perf tweaking: does not wait for the next event loop. All options should be availbale
// so let's start executing.
export function runImmediately(options, runnable, ...args) {
  return runWithOptions({...options, immediately: true}, runnable, ...args)
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

  // the coroutine type
  const cor = {
    type: corType,
    id,
    context: myZone,
    generator: null,
    locallyDone: false, // generator has returned
    configLocked: false, // .catch shouldn't be able to modify config after the corroutine started
    // .catch, .name, etc are used to populate this object with info customizing the run
    options: Object.assign({}, options),
    children: new Set(),
    runnable, // runnable, args and stacktrace are for introspection and debug purposes
    args: args,
    stacktrace: getStacktrace(),
    returnListeners: new Set(),
    then,
    catch: (errorHandler) => addToOptions('onError', errorHandler),
    name: (name) => addToOptions('name', name),
    onKill: (fn) => addToOptions('onKill', fn),
    /*
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

  setTimeout(() => runLater(cor, runnable, ...args), 0)

  return cor
}

function runLater(cor, runnable, ...args) {
  // it may happen that the coroutine was already killed
  if (isDone(cor)) {
    return
  }
  // the coroutine is to be started, so no more messing with config from now on
  cor.configLocked = true
  if (typeof runnable === 'function') {
    const gen = runnable(...args)
    if (gen != null && typeof gen.next === 'function') {
      cor.generator = gen
      runGenerator(cor, gen)
    } else {
      console.error(`unknown first argument (type: ${typeof runnable}),`, runnable)
      handleError(cor, new Error('unknown first argument'))
    }
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

/* kill(cor), or kill(cor, val). In the later case, kills the coroutine with the resulting value
 * instead of error. OnKill handlers will be runned before the coroutine is marked as done.
 */
export function kill(...args) {
  const cor = args[0]

  function maybeInvokeOnKill() {
    if (cor.options.onKill) {
      cor.options.onKill()
    }
  }

  if (!isDone(cor)) {
    if (args.length > 1) {
      maybeInvokeOnKill()
      setDone(cor, {returnValue: args[1]})
      // coroutine is already done -> killing children won't bubble up
      for (let child of cor.children) {
        kill(child)
      }
    } else {
      maybeInvokeOnKill()
      handleError(cor, terminatedError)
    }
  }
}
