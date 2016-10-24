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

    if (!middlewares.has(req)) {
      middlewares.set(req, [])
    }

    const myNext = function* (route) {
      const midds = middlewares.get(req)
      midds.push(handle)
      next()
      yield onHeadersPromise
      // When processing nth middleware, last element of midds is handle of n+1-th middleware.
      // Last middleware does not need to wait for anyone else, it just estabilishes the above invariant.
      if (midds[midds.length - 1] !== handle) {
        yield midds[midds.length - 1]
        midds.pop()
      }
    }

    const handle = run(function*() {
      zone.set('req', req)
      run(reqHandler, req, res, myNext)
    })
  }
}
