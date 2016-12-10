import {run, runWithParent} from './cor'
import {prettyErrorLog} from './utils'
import {context} from './context'
import {createChannel} from './messaging'
import onHeaders from 'on-headers'

const middlewares = new WeakMap()

const channel = createChannel()

export function register(app, verb, pattern, reqHandler) {
  app[verb](pattern, (req, res, next) => {
    channel.put([req, res, next, reqHandler])
  })
}

export function* runApp() {
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
      if (which < midds.length) {
        yield midds[which]
      }
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
