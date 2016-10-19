import {pushMessage, pushEnd, onReturn, createChannel} from './messaging'
import {pidString, handleType} from './constants'
import {runnableFromCb} from './utils'

let idSeq = 0
const idToProc = {}
const zoneInfo = {}

function zoneGet(key) {
  let zone = zoneInfo[global[pidString]]
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
  const zone = zoneInfo[global[pidString]]
  zone.public.set(key, val)
}

const runFromCb = (runnable, handle, parentHandle) => {
  const rfc = runnable[0]
  const args = [...runnable].splice(1)
  rfc.cb(args, (err, res) => {
    if (err != null) {
      throw err
    }
    pushMessage(handle.channel, res)
    pushEnd(handle.channel)
  }, parentHandle == null ? null : parentHandle.channel)
}

const runCorroutine = (runnable, handle) => {

  const gen = runnable[0].apply(null, [...runnable].splice(1))

  function safeNext(iter, val) {
    try {
      const res = iter.next(val)
      return res
    } catch (e) {
      throw e
    }
  }

  function step(val) {
    let oldPid
    try {
      oldPid = global[pidString]
      global[pidString] = handle.id
      let nxt = safeNext(gen, val)
      if (nxt.done) {
        const myZone = zoneInfo[handle.id]
        if (myZone.done) {
          throw new Error('myZone.done was already set to true')
        }
        myZone.done = true
        tryEnd(handle.id)
      } else {
        nxt = nxt.value
        let childHandle = run(nxt, handle)
        onReturn(childHandle.channel, (ret) => {
          step(ret)
        })
      }
    } finally {
      global[pidString] = oldPid
    }
  }
  step(null)
}

function changeProcCnt(id, val) {
  if (id != null) {
    zoneInfo[id].pendingSubProc += val
  }
}

function tryEnd(id) {
  if (id != null) {
    if (id != null && zoneInfo[id].pendingSubProc === 0) {
      if (zoneInfo[id].done) {
        pushEnd(idToProc[id].channel)
      }
    }
  }
}

const run = (runnable, parentHandle = null) => {
  let id = `${idSeq++}`

  let channel = createChannel()

  const parentId = global[pidString]

  let myZone
  if (parentId == null) {
    // creating main process
    myZone = {
      parent: null,
      parentId: null,
      parentZone: null,
      pendingSubProc: 0,
      done: false,
    }
  } else {
    myZone = {
      parent: idToProc[parentId],
      parentId,
      parentZone: zoneInfo[parentId],
      pendingSubProc: 0,
      done: false,
    }
  }


  myZone.public = new Map()
  zoneInfo[id] = myZone

  const handle = {
    type: handleType,
    id,
    channel,
  }

  idToProc[id] = handle

  changeProcCnt(parentId, 1)
  onReturn(handle, () => {
    changeProcCnt(parentId, -1)
    tryEnd(parentId)
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
