import {run, onReturn} from './cor'
import {createChannel} from './messaging'
import {assertCor} from './utils'

export const alts = (args) => run(function*() {
  const channel = createChannel()
  for (let key in args) {
    assertCor(args[key])
    onReturn(args[key], (err, res) => {
      if (err != null) {
        channel.put({error: err})
      } else {
        channel.put({result: [key, res]})
      }
    })
  }
  const res = yield channel.take()
  if ('error' in res) {
    throw res.error
  } else {
    return res.result
  }
})
