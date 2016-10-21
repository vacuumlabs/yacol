import {pushMessage, assertChannel} from './messaging'
import {run} from './proc'

export const alts = function*(...args) {
  let channel = args[0]
  args = args.slice(1)
  assertChannel(channel)

  for (let i = 0; i < args.length; i++) {
    run(function*() {
      const res = yield args[i]
      pushMessage(channel, [i, res])
    })
  }

}

