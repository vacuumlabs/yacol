import {pushMessage, pushEnd, onReturn, createChannel} from './messaging'
import {pidString, handleType} from './constants'
import {runnableFromCb} from './utils'

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
      console.error('error caught in runFromCb')
      throw err
    }
    pushMessage(handle.channel, res)
    pushEnd(handle.channel)
  }, parentHandle == null ? null : parentHandle.channel)
}

const runCorroutine = (runnable, handle) => {

  const gen = runnable[0].apply(null, [...runnable].splice(1))

  /*
  function safeNext(iter, val) {
    try {
      const res = iter.next(val)
      return res
    } catch (e) {
      throw e
    }
  }
  */

  function withPid(what) {
    let oldPid = global[pidString]
    global[pidString] = handle
    what()
    global[pidString] = oldPid
  }

  function handleError(e, myZone) {
    let handler = myZone.options.onError
    let processed = false
    if (handler != null) {
      try {
        handler(e)
        processed = true
      } catch (errorCaught) {
        e = errorCaught
      }
    }
    if (processed) {

    } else {
      if (myZone.parentZone != null) {
        handleError(e, myZone.parentZone)
      }
    }
  }

  function step(val) {
    setTimeout(() => _step(val), 0)
  }

  function _step(val) {
    withPid(() => {
      const myZone = handle.zone
      let nxt
      try {
        nxt = gen.next(val)
      } catch (e) {
        //handleError(e)
        throw e
      }
      if (nxt != null) {
        if (nxt.done) {
          if (myZone.done) {
            throw new Error('myZone.done was already set to true')
          }
          if (nxt.value !== undefined) {
            pushMessage(handle.channel, nxt.value)
          }
          myZone.done = true
          tryEnd(handle)
        } else {
          nxt = nxt.value
          let childHandle = run(nxt, handle)
          onReturn(childHandle.channel, (ret) => {
            step(ret)
          })
        }
      }
    })
  }
  step(null)
}

function changeProcCnt(handle, val) {
  if (handle != null) {
    handle.zone.pendingSubProc += val
  }
}

function tryEnd(handle) {
  if (handle != null) {
    if (handle != null && handle.zone.pendingSubProc === 0) {
      if (handle.zone.done) {
        pushEnd(handle.channel)
      }
    }
  }
}

// implementation of run
const run = (runnable, options = {}) => {
  let id = `${idSeq++}`
  let channel = createChannel()

  let myZone = {
    options,
    public: new Map(),
    parent: null,
    parentZone: null,
    pendingSubProc: 0,
    done: false,
    error: false,
  }

  const parentHandle = global[pidString]
  if (parentHandle != null) {
    Object.assign(myZone, {
      parent: parentHandle,
      parentZone: parentHandle.zone,
    })
  }

  const handle = {
    type: handleType,
    id,
    channel,
    zone: myZone,
  }

  changeProcCnt(parentHandle, 1)
  onReturn(handle, () => {
    changeProcCnt(parentHandle, -1)
    tryEnd(parentHandle)
  })

  if (typeof runnable === 'object' && runnable.type === handleType) {
    onReturn(runnable.channel, (msg) => {
      pushMessage(handle.channel, msg)
      pushEnd(handle.channel)
    })
  } else if (typeof runnable === 'function') {
    runCorroutine([runnable], handle)
  } else if (Array.isArray(runnable)) {
    const first = runnable[0]
    if (typeof first === 'function') {
      runCorroutine(runnable, handle, myZone)
    } else if (typeof first === 'object' && first.type === 'RunnableFromCb') {
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

export const alts = runnableFromCb((args, cb) => {
  let returned = false
  for (let i = 0; i < args.length; i++) {
    let handle = run(args[i])
    onReturn(handle, (val) => {
      if (!returned) {
        returned = true
        cb(null, [i, val])
      }
    })
  }
})

/*
run(generatorFn)
  - same as array, but no args
run([generatorFn, ...args)
  - run generator
run(runnableFromCb)
  -
- returns handle
*/
