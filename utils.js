import {pidString, runnableFromFunctionType} from './constants'

export function runnableFromFunction(fn) {
  return ({type: runnableFromFunctionType, cb: fn})
}

export function randomInt(n) {
  return Math.random() * n
}

export function getCurrentCoroutine() {
  return global[pidString]
}

export const delay = runnableFromFunction((time, cb) => setTimeout(() => cb(), time))

