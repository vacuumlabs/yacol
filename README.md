[![CircleCI](https://circleci.com/gh/vacuumlabs/yacol.svg?style=svg)](https://circleci.com/gh/vacuumlabs/yacol)

Yet Another COroutine Library with some unique features.

## Basic design principles

The whole yacol is organized around the concept of coroutine. This is created from a generator
function (and some argument for it). Coroutines resembles processes from your operating system but with
collaborative multitasking.

When coroutine successfully terminates, it produces single return value. This value can be yielded
by other coroutines. Furthermore, coroutine is aware of its parent - the coroutine it was created
within. This way, complex parent-child coroutine hierarchy is created. This is important (mainly)
for two most basic yacol's principles:

- Coroutine terminates only after it's generator returns and **all the children coroutines
  terminates**
- If error is thrown, it can be caught on parent, grandparent, etc..,  coroutine.

In both rules above it does not matter, if parent yielded the child's result or not.

## Simple example

```javascript
import Promise from 'bluebird'
import {run} from 'yacol'

// generator that can be used to create coroutine
function* slowSum(a, b) {
  // Promise object is yieldable
  yield Promise.delay(100)
  return a + b
}

function* main() {
  // run(fn, ...args) creates coroutine from generator function fn; args are passed as an arguments
  // to fn
  const two = yield run(slowSum, 1, 1)
  console.log(two)
  const three = yield run(slowSum, two, 1)
  console.log(three)
}

run(main)
```

In this case, coroutines created from `run(slowSum, 1, 1)` and `run(slowSum, two, 1)` are children
of `run(main)`. The parent-child relationship is important for handling the errors.

## Error handling

Coroutine (i.e. result of `run`) have `.catch` method that can be used such as:

```javascript
import {run} from 'yacol'

function* crash() {
  throw new Error('crash')
}

run(crash).catch((e) => {console.log('gotcha')}) // catches the error

```

If the error is not caught, it is propagated to parent, grandparent, etc... until coroutine with
registered `.catch` handler is found. This handler is than executed; if it ends normally with value
`x`, the error is considered to be handled. The coroutine that handled the error is stopped and is
considered successfully terminated with return value `x`. All other coroutines are stopped and
considered failed. Simple example demonstrating this:

```javascript
import {run} from 'yacol'

const cor1 = run(function*() {
  const cor2 = run(function*() {
    const cor3 = run(function*() {
      const cor4 = run(function*() {
        throw new Error('crash')
      })
    }).catch((e) => {throw e})
  }).catch((e) => 42)
  const val = yield cor2
  console.log(val) // 42
}).catch((e) => {console.log('This will not execute')})
```
After running this, `cor4` and `cor3` are failed (`cor3` caught the error, but rethrowed it), `cor2`
is ended successfully with result 42. Error handler of `cor1` is never executed.

## Coroutine Termination
Coroutine terminates only after it's generator returns and all the child coroutines terminates.
Simple example illustrating this:

```javascript
import {run} from 'yacol'
import Promise from 'bluebird'

const cor1 = run(function*() {
  const cor2 = run(function*() {
    const cor3 = run(function*() {
      yield Promise.delay(2000)
    })
    yield Promise.delay(1000)
  })
})
```
`cor3` terminates after 2 seconds. `cor2` runs `cor3` and Promise.delay in parallel (there is no
yield from `cor2`), so it also ends after 2 seconds. Finally `cor1` has no actual work to do, but
has to wait until its child `cor2` terminates, so it also terminate after 2 seconds.

## Working with Express
You can use coroutines as an express request handler and / or express middleware. With a little
boilerplate from yacol's expressHelpers, you can register your corouitne handler to the express app
as easy as:

```javascript
import {expressHelpers} from 'yacol'

const {register} = expressHelpers

function* hello(req, res) {
  yield Promise.delay('500')
  res.send('hello')
}

register(app, 'get', '/hello', hello)
```

Furthermore, this works nicely with other express middlewares / handlers which are used in a standard way, so you can combine `register` from above with standard approach:

```
app.use(bodyParser.urlencoded(options))
```

Check out 'examples/using-with-express.js ' for more details.

## Testing with Mocha
Coroutine returned from `run` is Promise-like object. This means, it can be returned from Mocha
test, Mocha will wait until the coroutine (and all spawned sub-coroutines) are terminated. If any of
these produce (unhandled) error, this goes to top-level `.catch` handler and therefore test is rejected.

## Messaging
Yacol implements simple CSP-inspired messaging system. Adding messages to channel happens instantly,
yielding messages can block (if the queue is empty). The example below illustrates simple
producer-consumer system:

```javascript
import {run, pushMessage, getMessage, createChannel} from 'yacol'
import Promise from 'bluebird'

const rep = 10
const chan = createChannel()

run(function*() {
  for (let i = 0; i < rep; i++) {
    yield Promise.delay(Math.random() * 500)
    pushMessage(chan, i)
  }
})

run(function*() {
  for (let i = 0; i < rep; i++) {
    yield Promise.delay(Math.random() * 500)
    const msg = yield run(getMessage, chan)
    console.log('got msg', msg)
  }
})

```

## Context
Every coroutine has its context - that's simple ES6 Map object.
`context.set(key, val)` sets `key` to `val` in the current coroutine context.
`context.get(key, val)` will look for the value first in current coroutine context, and if not
found, will try to read from parent's context, grandparent's context, etc.

## Work in progress
Several things I'd like to see implemented:
- force kill coroutine with all its children
- awesome stacktraces
- introspection generators
- context-aware monkey-patching of functions
