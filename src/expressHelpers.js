import {run, runWithParent} from './cor'
import {prettyErrorLog} from './utils'
import {context} from './context'
import {createChannel} from './messaging'
import onHeaders from 'on-headers'

const appToChan = new WeakMap()
const middlewares = new WeakMap()

export function register(app, verb, pattern, reqHandler) {
  if (!appToChan.has(app)) {
    appToChan.set(app, createChannel())
  }
  const reqChannel = appToChan.get(app)
  app[verb](pattern, (req, res, next) => {
    reqChannel.put([req, res, next, reqHandler])
  })
}

export function* runApp(app) {
  if (!appToChan.has(app)) {
    throw new Error('you should register at least one handler before running')
  }
  const channel = appToChan.get(app)
  while (true) {
    const [req, res, next, reqHandler] = yield channel.take()

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
      let cor
      if (!middlewares.has(req)) {
        middlewares.set(req, [])
      }
      const midds = middlewares.get(req)
      if (midds.length > 0) {
        cor = runWithParent(midds[midds.length - 1], reqHandler, req, res, myNext)
      } else {
        cor = run(reqHandler, req, res, myNext).catch(prettyErrorLog)
      }
      midds.push(cor)
    })
  }
}
