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

register(app, '/hello', hello)
register(app, '/world', world)

run(function* () {
  run([runApp, app])
  app.listen(3000, () => {
    console.log('server started')
  })
})
