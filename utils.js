import {pidString} from './constants'

export function runnableFromCb(cb) {
  return ({type: 'RunnableFromCb', cb})
}

export function randomInt(n) {
  return Math.random() * n
}

export function getCurrentCoroutine() {
  return global[pidString]
}

export const delay = runnableFromCb((time, cb) => setTimeout(() => cb(), time))

