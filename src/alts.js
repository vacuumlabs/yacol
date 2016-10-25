import {pushMessage} from './messaging'
import {run} from './proc'
import {assertHandle, assertChannel} from './utils'

export const alts = function*(channel, ...args) {
  assertChannel(channel)
  for (let i = 0; i < args.length; i++) {
    run(function*() {
      assertHandle(args[i])
      const res = yield args[i]
      pushMessage(channel, [i, res])
    })
  }

}

