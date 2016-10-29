import {run, pushMessage, getMessage, createChannel, context} from './'
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
      let midds = middlewares.get(req)
      const which = midds.length
      next(route)
      yield onHeadersPromise
      if (which >= midds.length) {
        throw new Error('No non-middleware handler exists for this route')
      }
      yield midds[which]
    }

    run(function*() {
      context.set('request', req)
      const cor = run(reqHandler, req, res, myNext)
      if (!middlewares.has(req)) {
        middlewares.set(req, [])
      }
      const midds = middlewares.get(req)
      if (midds.length > 0) {
        // setting cor's parrent manually - kids, don't try this at home!
        cor.parent = midds[midds.length - 1]
      }
      midds.push(cor)
    }).catch((e) => {console.error(e)})
  }
}
