import {assert} from 'chai'
import Promise from 'bluebird'

const getTime = () => (new Date()).getTime()
let timeStart

export function* delay(time) {
  yield Promise.delay(time)
}

export function resetTimer() {
  timeStart = getTime()
}

export function timeApprox(target) {
  const delta = getTime() - timeStart
  assert.approximately(delta, target, target * 0.15)
}

export function randomInt(n) {
  return Math.floor(Math.random() * n)
}
