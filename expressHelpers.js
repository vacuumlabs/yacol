import {run, pushMessage, getMessage, createChannel, zone} from './'
import onHeaders from 'on-headers'

const appToChan = new WeakMap()
const middlewares = new WeakMap()

export function register(app, verb, pattern, reqHandler) {
  if (!appToChan.has(app)) {
    appToChan.set(app, createChannel({discardRead: true}))
  }
  const reqChannel = appToChan.get(app)
  app[verb](pattern, (req, res, next) => {
    pushMessage(reqChannel, [req, res, next, reqHandler])
  })
}

export function* runApp(app) {
  if (!appToChan.has(app)) {
    throw new Error('you should register at least one handler before running')
  }
  const channel = appToChan.get(app)
  while (true) {
    const [req, res, next, reqHandler] = yield run(getMessage, channel)

    const onHeadersPromise = new Promise((resolve, reject) => {
      onHeaders(res, () => resolve())
    })

    const myNext = function* (route) {
      next(route)
      let midds = middlewares.get(req)
      const which = midds.length
      yield onHeadersPromise
      if (which >= midds.length) {
        throw new Error('No non-middleware handler exists for this route')
      }
      yield midds[which]
    }

    run(function*() {
      zone.set('request', req)
      const handle = run(reqHandler, req, res, myNext)
      if (!middlewares.has(req)) {
        middlewares.set(req, [])
      }
      const midds = middlewares.get(req)
      midds.push(handle)
    }).catch((e) => {console.error(e)})
  }
}
