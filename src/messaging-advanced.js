import {runDetached} from './cor'
import {createChannel} from './messaging'
import {isChannel, assertChannel} from './utils'
import t from 'transducers-js'

export function mult(source) {

  let subscribed = new Map()
  runDetached(function* () {
    while (true) {
      let what = yield source.take()
      for (let [chan, putFn] of subscribed) {
        putFn(chan, what)
      }
    }
  })

  function parseChannelAndTransducer(args) {
    const res = {}
    for (let arg of args) {
      if (isChannel(arg)) {
        res.channel = arg
      } else {
        res.transducer = arg
      }
    }
    if (res.channel == null) {
      res.channel = createChannel()
    }
    return res
  }

  function putToChannel(channel, msg) {
    channel.put(msg)
    return channel
  }

  function subscribe(...args) {
    const {channel, transducer = null} = parseChannelAndTransducer(args)
    let fn = putToChannel
    if (transducer != null) {
      fn = t.toFn(transducer, fn)
    }
    subscribed.set(channel, fn)
    return channel
  }

  function unsubscribe(ch) {
    subscribed.delete(ch)
  }

  return {subscribe, unsubscribe}

}

export function merge(inputs, output) {
  if (output == null) {
    output = createChannel()
  }
  assertChannel(output)
  for (let key in inputs) {
    assertChannel(inputs[key])
  }

  for (let key in inputs) {
    runDetached(function* () {
      const msg = yield inputs[key].take()
      output.put([key, msg])
    })
  }

  return output
}

