import {kill} from 'yacol'
import Promise from 'bluebird'

async function main() {
  async function terminateAfter1Second() {
    async function looong() {
      await Promise.delay('20000')
      console.log('This won\'t be printed')
    }
    const looongPromise = looong()
    await Promise.delay(1000)
    kill(looongPromise)
  }
  await terminateAfter1Second()
  console.log('cor finally ended!')
}

main()
