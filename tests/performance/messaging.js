import {run, createChannel} from '../../dist'
import {getTime} from '../utils'

run(function*() {
  const startTime = getTime()
  yield run(function*() {
    const ch = createChannel()
    run(function*() {
      for (let i = 0; i < 4000; i++) {
        ch.put(i)
        //yield Promise.resolve()
      }
    })
    run(function*() {
      for (let i = 0; i < 4000; i++) {
        const msg = yield ch.take()
        if (msg % 100 === 0) {
          console.log(msg)
        }
      }
    })
  })
  console.log(getTime() - startTime)
})
