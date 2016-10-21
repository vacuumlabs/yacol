import {pidString} from './constants'
import Promise from 'bluebird'

export function randomInt(n) {
  return Math.floor(Math.random() * n)
}

export function getCurrentCoroutine() {
  return global[pidString]
}

export function delay(time) {
  return Promise.delay(time)
}
