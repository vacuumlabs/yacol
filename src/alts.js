import {run, onReturn} from './cor'
import {createChannel, pushMessage, getMessage} from './messaging'
import {assertCor} from './utils'

export const alts = function*(args) {
  const channel = createChannel()
  for (let key in args) {
    assertCor(args[key])
    onReturn(args[key], (err, res) => {
      if (err != null) {
        pushMessage(channel, {error: err})
      } else {
        pushMessage(channel, {result: [key, res]})
      }
    })
  }
  const res = yield run(getMessage, channel)
  if ('error' in res) {
    throw res.error
  } else {
    return res.result
  }
}
