import {run, onReturn} from './cor'
import {createChannel, pushMessage, getMessage} from './messaging'
import {assertCor} from './utils'

export const alts = function*(...args) {
  const channel = createChannel()
  for (let i = 0; i < args.length; i++) {
    assertCor(args[i])
    onReturn(args[i], (err, res) => {
      if (err != null) {
        pushMessage(channel, {error: [i, res]})
      } else {
        pushMessage(channel, {result: [i, res]})
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
