import {run, pushMessage, getMessage, createChannel} from './'

const appToChan = new WeakMap()

export function register(app, pattern, reqHandler) {
  if (!appToChan.has(app)) {
    appToChan.set(app, createChannel())
  }
  const reqChannel = appToChan.get(app)
  app.use(pattern, (req, res) => {
    pushMessage(reqChannel, [req, res, reqHandler])
  })
}

export function* runApp(app) {
  if (!appToChan.has(app)) {
    throw new Error('you should register at least one handler before running')
  }
  const channel = appToChan.get(app)
  while (true) {
    const [req, resp, reqHandler] = yield [getMessage, channel]
    run([reqHandler, req, resp])
  }
}