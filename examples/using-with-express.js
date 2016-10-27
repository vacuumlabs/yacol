import express from 'express'
import {expressHelpers, run, context} from 'yacol'
import Promise from 'bluebird'

const {register, runApp} = expressHelpers
const app = express()

function* hello(req, res) {
  yield Promise.delay('500')
  res.send('hello')
}

function* helloContext(req, res) {
  res.send(context.get('hello'))
}

function* world(req, res) {
  yield Promise.delay(1000)
  res.send('world')
}

function* greetingMiddleware(req, res, next) {
  console.log('Howdy, I\'m greeting middleware')
  context.set('hello', 'hi from context')
  yield run(next)
}

function* worldMiddleware1(req, res, next) {
  console.log('before req 1')
  yield Promise.delay(3000)
  yield run(next)
  console.log('after req 1')
  yield Promise.delay(3000)
}

function* worldMiddleware2(req, res, next) {
  console.log('before req 2')
  yield Promise.delay(3000)
  yield run(next)
  console.log('after req 2')
  yield Promise.delay(3000)
}

register(app, 'use', '*', greetingMiddleware)

register(app, 'get', '/hello', hello)
register(app, 'get', '/context', helloContext)

register(app, 'use', '/world', worldMiddleware1)
register(app, 'use', '/world', worldMiddleware2)
register(app, 'get', '/world', world)

run(function* () {
  run(runApp, app)
  app.listen(3000, () => {
    console.log('server started. Navigate to localhost:3000/hello, ' +
      'localhost:3000/world, or localhost:3000/context to see something')
  })
})
