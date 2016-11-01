import {run, kill, killHandler} from 'yacol'
import Promise from 'bluebird'

run(function*() {
  const cor = run(function*() {
    run(function*() {
      yield Promise.delay('20000')
      console.log('This won\'t be printed')
    })
  // killing a coroutine produces TerminationError. We should catch it on the parent. `killHandler`
  // will rethrow any other Error than TerminationError.
  }).catch(killHandler)

  // let's wait for the cor and see how long will it take to finish. Without killing it, it would
  // take approx 20 seconds to finish; however, code below kills it after 1 second.
  run(function*() {
    yield cor
    console.log('cor finally ended!')
  })

  yield Promise.delay('1000')
  kill(cor)
})
