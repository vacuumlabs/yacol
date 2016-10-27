/* eslint-disable no-unused-vars */
import {run} from 'yacol'

const cor1 = run(function*() {
  const cor2 = run(function*() {
    const cor3 = run(function*() {
      const cor4 = run(function*() {
        throw new Error('crash')
      })
    }).catch((e) => {throw e})
  }).catch((e) => 42)
  const val = yield cor2
  console.log(val) // 42
}).catch((e) => {console.log('This will not execute')})
