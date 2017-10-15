import {run, kill} from './cor'
import {createChannel, putToChannel} from './messaging'
import {isChannel, assertChannel, isIterable} from './utils'
import t from 'transducers-js'

function parseChannelAndTransducer(args) {
  const res = {}
  for (let arg of args) {
    if (isChannel(arg)) {
      res.channel = arg
    } else if (typeof arg === 'function') {
      res.transducer = arg
    } else {
      console.error('Expected channel or transducer here, got', arg, 'of type', typeof arg)
      throw new Error('Expected channel or transducer here')
    }
  }
  if (res.channel == null) {
    res.channel = createChannel()
  }
  return res
}

export function mult(source) {

  let subscribed = new Map()

  const multCoroutine = run(function* () {
    while (true) {
      let what = yield source.take()
      for (let [chan, putFn] of subscribed) {
        putFn(chan, what)
      }
    }
  }).detached()

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

  function stop() {
    kill(multCoroutine)
  }

  return {subscribe, unsubscribe, stop}

}

export function merge(inputs, ...args) {
  const chanToLabel = new Map()
  if (!isIterable(inputs)) {
    throw new Error('yacol.merge: first argument must be iterable of channels. Got no iterable')
  }
  for (let channel of inputs) {
    if (!isChannel(channel)) {
      console.error('Non-channel argument: ', channel, '\ntypeof: ', typeof channel)
      throw new Error('yacol.merge: first argument must be ' +
        'iterable of channels. Got something no-chanelish here.')
    }
    chanToLabel.set(channel, null)
  }
  const {channel, transducer = null} = parseChannelAndTransducer(args)
  const output = channel
  assertChannel(output)
  return _merge(chanToLabel, false, output, transducer)
}

export function mergeNamed(inputs, ...args) {
  const chanToLabel = new Map()
  if (typeof inputs !== 'object' || inputs == null) {
    console.error('yacol.mergeNamed: first argument must be no-nullish object. Got: ', inputs,
      '\ntypeof: ', typeof inputs)
    throw new Error('yacol.mergeNamed: first argument must be {name: channel} object')
  }
  for (let name in inputs) {
    let channel = inputs[name]
    if (!isChannel(channel)) {
      console.error('yacol.mergeNamed: Non-channel argument ', channel, '\ntypeof: ', typeof channel)
      throw new Error('yacol.mergeNamed: first argument must have channel values')
    }
    chanToLabel.set(channel, name)
  }
  const {channel, transducer = null} = parseChannelAndTransducer(args)
  const output = channel
  assertChannel(output)
  return _merge(chanToLabel, true, output, transducer)
}

function _merge(inputs, emitLabels, output, transducer) {
  let tPutToChannel = putToChannel

  if (transducer != null) {
    tPutToChannel = t.toFn(transducer, putToChannel)
  }

  for (let [channel, label] of inputs) {
    let ttPutToChannel = tPutToChannel
    if (emitLabels) {
      ttPutToChannel = t.toFn(t.map((msg) => [label, msg]), ttPutToChannel)
    }
    channel.merger = {
      channel: output,
      putToChannel: ttPutToChannel,
    }
  }
  return output
}

