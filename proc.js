import {pushMessage, pushEnd, onReturn, createChannel} from './messaging'
import {pidString, handleType} from './constants'
import {runnableFromCb} from './utils'

let idSeq = 0
const zoneInfo = new WeakMap()

function zoneGet(key) {
  let zone = zoneInfo.get(global[pidString])
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
  const zone = zoneInfo.get(global[pidString])
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

  function step(val) {
    setTimeout(() => _step(val), 0)
  }

  function _step(val) {
    withPid(() => {
      let nxt
      try {
        nxt = gen.next(val)
      } catch (e) {
        throw e
      }
      if (nxt != null) {
        if (nxt.done) {
          const myZone = zoneInfo.get(handle)
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
    zoneInfo.get(handle).pendingSubProc += val
  }
}

function tryEnd(handle) {
  if (handle != null) {
    if (handle != null && zoneInfo.get(handle).pendingSubProc === 0) {
      if (zoneInfo.get(handle).done) {
        pushEnd(handle.channel)
      }
    }
  }
}

// implementation of run
const run = (runnable) => {
  let id = `${idSeq++}`

  let channel = createChannel()

  const parentHandle = global[pidString]

  let myZone
  if (parentHandle == null) {
    // creating main process
    myZone = {
      parent: null,
      parentZone: null,
      pendingSubProc: 0,
      done: false,
      error: false,
    }
  } else {
    myZone = {
      parent: parentHandle,
      parentZone: zoneInfo.get(parentHandle),
      pendingSubProc: 0,
      done: false,
      error: false,
    }
  }

  myZone.public = new Map()

  const handle = {
    type: handleType,
    id,
    channel,
  }

  zoneInfo.set(handle, myZone)

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
