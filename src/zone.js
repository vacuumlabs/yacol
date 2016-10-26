import {pidString} from './constants'

export function zoneGet(key) {
  let zone = global[pidString].zone
  while (true) {
    if (zone.public.has(key)) {
      return zone.public.get(key)
    } else {
      const parent = zone.handle.parent
      if (parent == null) {
        break
      } else {
        zone = parent.zone
      }
    }
  }
}

export function zoneSet(key, val) {
  const zone = global[pidString].zone
  zone.public.set(key, val)
}

export const zone = {get: zoneGet, set: zoneSet}
