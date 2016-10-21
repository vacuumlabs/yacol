import express from 'express'
import {register, runApp} from '../expressHelpers'
import {delay} from '../utils'
import {run} from '../'

const app = express()

function* hello(req, res) {
  yield [delay, 1000]
  res.send('hello')
}

function* world(req, res) {
  yield [delay, 500]
  res.send('world')
}

function* middleware1(req, res, next) {
  console.log('before req 1')
  yield next
  console.log('after req 1')
}

function* middleware2(req, res, next) {
  console.log('before req 2')
  yield next
  console.log('after req 2')
}

register(app, 'use', '*', middleware1)
register(app, 'use', '*', middleware2)
register(app, 'get', '/hello', hello)
register(app, 'get', '/world', world)

run(function* () {
  run([runApp, app])
  app.listen(3000, () => {
    console.log('server started')
  })
})
