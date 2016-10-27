import {pidString} from './constants'

export function contextGet(key) {
  let context = global[pidString].context
  while (true) {
    if (context.public.has(key)) {
      return context.public.get(key)
    } else {
      const parent = context.handle.parent
      if (parent == null) {
        break
      } else {
        context = parent.context
      }
    }
  }
}

export function contextSet(key, val) {
  const context = global[pidString].context
  context.public.set(key, val)
}

export const context = {get: contextGet, set: contextSet}
