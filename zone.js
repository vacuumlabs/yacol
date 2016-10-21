import {pidString} from './constants'

export function zoneGet(key) {
  let zone = global[pidString].zone
  while (true) {
    if (zone.public.has(key)) {
      return zone.public.get(key)
    } else {
      zone = zone.parentZone
      if (zone == null) {
        break
      }
    }
  }
}

export function zoneSet(key, val) {
  const zone = global[pidString].zone
  zone.public.set(key, val)
}

export const zone = {get: zoneGet, set: zoneSet}
