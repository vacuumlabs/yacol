import express from 'express'
import {expressHelpers, run} from 'yacol'
import Promise from 'bluebird'

const {register, runApp} = expressHelpers
const app = express()

function* hello(req, res) {
  yield Promise.delay(1000)
  res.send('hello')
}

function* world(req, res) {
  yield Promise.delay(1000)
  res.send('world')
}

function* middleware1(req, res, next) {
  console.log('before req 1')
  yield Promise.delay(3000)
  yield run(next)
  console.log('after req 1')
  yield Promise.delay(3000)
}

function* middleware2(req, res, next) {
  console.log('before req 2')
  yield Promise.delay(3000)
  yield run(next)
  console.log('after req 2')
  yield Promise.delay(3000)
}

register(app, 'use', '*', middleware1)
register(app, 'use', '*', middleware2)
register(app, 'get', '/hello', hello)
register(app, 'get', '/world', world)

run(function* () {
  run(runApp, app)
  app.listen(3000, () => {
    console.log('server started')
  })
})
