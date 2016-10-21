import {run, pushMessage, getMessage, createChannel} from './'
import onHeaders from 'on-headers'

const appToChan = new WeakMap()

export function register(app, verb, pattern, reqHandler) {
  if (!appToChan.has(app)) {
    appToChan.set(app, createChannel())
  }
  const reqChannel = appToChan.get(app)
  app[verb](pattern, (req, res, next) => {
    pushMessage(reqChannel, [req, res, next, reqHandler])
  })
}

const middleware = new WeakMap()

export function* runApp(app) {
  if (!appToChan.has(app)) {
    throw new Error('you should register at least one handler before running')
  }
  const channel = appToChan.get(app)
  while (true) {
    const [req, res, next, reqHandler] = yield [getMessage, channel]

    if (!middleware.has(req)) {
      const headersChannel = createChannel()

      onHeaders(res, () => {
        pushMessage(headersChannel, null)
      })
      middleware.set(req, {cnt: 0, chan: headersChannel})
    }

    const myNext = function* () {
      middleware.get(req).cnt += 1
      const {cnt, chan} = middleware.get(req)
      let myIndex = cnt
      next()
      // wait for message pushed by onHeaders cb
      yield [getMessage, chan]
      // first middleware waits for n - 1 messages, second for n-2 messages, etc. Last liddleware
      // can run immediately
      for (let i = 0; i < middleware.get(req).cnt - myIndex; i++) {
        yield [getMessage, chan]
      }
      pushMessage(chan, null)
    }

    run([reqHandler, req, res, myNext])
  }
}
