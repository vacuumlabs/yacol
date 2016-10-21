import {createChannel, getMessage, putMessage, pushMessage} from './messaging'
import {run} from './proc'

export const alts = function*(...args) {
  let resChannel = createChannel()
  for (let i = 0; i < args.length; i++) {
    run(function*() {
      const res = yield args[i]
      pushMessage(resChannel, [i, res])
    })
  }
  // take messages from resChannel as they come and emit them as my own
  for (;;) {
    const msg = yield [getMessage, resChannel]
    putMessage(msg)
  }
}
