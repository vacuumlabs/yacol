import {assert} from 'chai'

const getTime = () => (new Date()).getTime()
let timeStart

export function resetTimer() {
  timeStart = getTime()
}

export function timeApprox(target) {
  const delta = getTime() - timeStart
  assert.approximately(delta, target, target / 10)
}
