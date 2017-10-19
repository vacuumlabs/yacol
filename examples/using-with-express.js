import express from 'express'
import Promise from 'bluebird'

const app = express()

async function hello(req, res) {
  await Promise.delay('100')
  res.send('hello!')
}

async function error(req, res) {
  await Promise.delay('100')
  throw new Error('whoops')
}

function catchErrorMiddleware(handler) {
  return async (req, res) => {
    try {
      await handler(req, res)
    } catch (err) {
      res.status(500)
      res.send('Something is broken!')
    }
  }
}

function greetingMiddleware(handler) {
  return async (req, res) => {
    console.log('howdy before request handle')
    await handler(req, res)
    console.log('hello after request handle')
  }
}

function generalApiMiddleware(handler) {
  return catchErrorMiddleware(greetingMiddleware(handler))
}

app.get('/hello', generalApiMiddleware(hello))
app.get('/error', catchErrorMiddleware(error))


app.listen(3000, () => {
  console.log('server started. Navigate to localhost:3000/hello, ' +
    'localhost:3000/world, or localhost:3000/context to see something')
})
