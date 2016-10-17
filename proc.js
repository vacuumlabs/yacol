import {pushMessage, onReturn, createChannel} from './messaging'
import {pidString, corroutineEndMessage, handleType} from './constants'

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


const run = (runnable) => {
  let gen
  if (typeof runnable === 'function') {
    gen = runnable()
  } else {
    gen = runnable
    // console.error('run acceprs coroutine, got', typeof runnable, runnable)
    // throw new Error('run accepts coroutine (i.e. function)')
  }
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
    }
  } else {
    myZone = {
      parent: idToProc[parentId],
      parentId,
      parentZone: zoneInfo[parentId],
    }
  }

  myZone.public = new Map()
  zoneInfo[id] = myZone

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
      global[pidString] = id
      let nxt = safeNext(gen, val)
      if (nxt.done) {
        pushMessage(channel, corroutineEndMessage)
      } else {
        nxt = nxt.value
        //if (!Array.isArray(nxt)) {
        //  nxt = [nxt]
        //}
        let first = nxt[0]
        let args = [...nxt].splice(1)
        // TODO check if first is builtin fn
        if (typeof first === 'function') {
          let handle = run(first(...args))
          onReturn(handle.channel, (ret) => {
            step(ret)
          })
        } else if (typeof first === 'object' && first.type === 'RunnableFromCb') {
          first.cb(...args, (err, res) => step(res), channel)
        } else {
          console.error(`unknown yieldable (type: ${typeof first}),`, first)
          throw new Error('unknown yieldable')
        }
      }
    } finally {
      global[pidString] = oldPid
    }
  }
  step(null)
  const result = {
    type: handleType,
    id,
    step,
    channel,
  }
  idToProc[id] = result
  return result
}

const zone = {get: zoneGet, set: zoneSet}
export {run, zone}
