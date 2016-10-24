import {pidString, handleType, channelType} from './constants'
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

export function isHandle(handle) {
  return (typeof handle === 'object' && handle != null && handle.type === handleType)
}

export function assertHandle(handle) {
  if (!isHandle(handle)) {
    throw new Error('argument expected to be a handle')
  }
}

export function isChannel(channel) {
  return (typeof channel === 'object' && channel != null && channel.type === channelType)
}

export function assertChannel(channel) {
  if (!isChannel(channel)) {
    throw new Error('argument expected to be a channel')
  }
}
