import {run, runDetached} from './cor'
import {getMessage, pushMessage, createChannel} from './messaging'
import {assertChannel} from './utils'

export function mult(source) {

  let subscribed = new Set()
  runDetached(function* () {
    while (true) {
      let what = yield run(getMessage, source)
      for (let chan of subscribed) {
        pushMessage(chan, what)
      }
    }
  })

  function subscribe(ch) {
    if (ch === undefined) {
      ch = createChannel()
    }
    subscribed.add(ch)
    return ch
  }

  function unsubscribe(ch) {
    subscribed.remove(ch)
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
      const msg = yield run(getMessage, inputs[key])
      pushMessage(output, [key, msg])
    })
  }

  return output
}

