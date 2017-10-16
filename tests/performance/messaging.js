import {createChannel} from '../../dist'
import {getTime} from '../utils'

(async function() {
  const startTime = getTime()
  await (async function() {
    const ch = createChannel();
    (async () => {
      for (let i = 0; i < 4000; i++) {
        ch.put(i)
      }
    })();
    (async function() {
      for (let i = 0; i < 4000; i++) {
        const msg = await ch.take()
        if (msg % 100 === 0) {
          console.log(msg)
        }
      }
    })()
  })()
  console.log(getTime() - startTime)
})()
