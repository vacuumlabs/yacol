import {assert} from 'chai'
import Promise from 'bluebird'

export function getTime() {
  return (new Date()).getTime()
}

let timeStart

export function* delay(time) {
  yield Promise.delay(time)
}

export function resetTimer() {
  timeStart = getTime()
}

export function timeApprox(target) {
  const delta = getTime() - timeStart
  assert.approximately(delta, target, target * 0.2 + 20)
}

export function getTimeDelta() {
  return getTime() - timeStart
}

export function randomInt(n) {
  return Math.floor(Math.random() * n)
}
