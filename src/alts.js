import {pushMessage} from './messaging'
import {run} from './cor'
import {assertCor, assertChannel} from './utils'

export const alts = function*(channel, ...args) {
  assertChannel(channel)
  for (let i = 0; i < args.length; i++) {
    run(function*() {
      assertCor(args[i])
      const res = yield args[i]
      pushMessage(channel, [i, res])
    })
  }

}

