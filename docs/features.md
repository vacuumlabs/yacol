# Error handling

Parent coroutine is responsible of handling errors thrown (and not handled) by all its children
(i.e. other coroutines it created) during the whole of their lifespan.

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
ended successfully with result 42. Error handler of `cor1` is never executed.

# Coroutine Termination

imagine you see in the code:
```javascript
await doSomeJob()
```
It would be a valuable property, if after `await` finishes, you could be sure, that all the work related to
`doSomeJob()` has (successfully) ended. Sadly, Promises do not guarantee this. If `doSomeWork()`
creates a dangling Promise (i.e. Promise with no `.then` and not `await`ed), this will continue running
even after `doSomeJob()` have 'officially' ended.

In Yacol, coroutine terminates only after it's generator returns and all the child coroutines terminates.
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

# Messaging
Yacol implements simple CSP-inspired messaging system. Adding messages to channel happens instantly,
yielding messages can block (if the queue is empty). The example below illustrates simple
producer-consumer system (`examples/messaging.js`)

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

# Killing coroutines

Simply call `kill(coroutine)` and that's it, coroutine will be synchronously ended. If you are in
the middle of some non-coroutine work i.e. you are waiting for yielded promise which is fetching some
data, the fetch will (naturally) continue, however:
- neither its result nor its error is accessible by anyone (we're trying to mimic that the work was
  terminated. Errors after `kill` moment do not matter)
- consequent operations (i.e. some other fetches) of the killed coroutine are not executed

Semantically, killing is equivalent to all coroutines (and its children) getting to the erroneous
state (as if all coroutines throw a TerminationError). This error has to be handled somewhere -
typically you want to check for this specific error type and rethrow other possible errors. For this
purpose, you can use simply `killHandler` already written in the `yacol`. Check out
`examples/kill.js` for more details.

# Context
Every coroutine has its context - that's simple ES6 Map object.
`context.set(key, val)` sets `key` to `val` in the current coroutine context.
`context.get(key, val)` will look for the value first in current coroutine context, and if not
found, will try to read from parent's context, grandparent's context, etc. Check out
`examples/context.js` for an example.

# What is patch
You can (re)define functionality of a given runnable (first argument you put to `run`) for the whole
coroutine sub-tree. You can for example `yield run('FETCH_WEATHER')` and let the parent coroutine
define meaning of 'FETCH_WEATHER' for you. Note that this has exactly the power of continuations of
OCaml - we can write continuations-like code without any babel transpilling! Check out
`examples/patch.js` to see, what weather is in my city right now!

# Inspect
If you call `.inspect()` on the coroutine, you can inspect, what effects the coroutine tries to
execute. Moreover you can pass fake responses to these effects. For example, having a coroutine such
as (notice the `.inspect()` call at its end):

``` javascript
const cor = run(function*() {
  const weatherBa = yield run(getWeather, 'Bratislava')
  const weatherVi = yield run(getWeather, 'Vienna')
  return `${weatherBa} in Bratislava, ${weatherVi} in Vienna`
}).inspect()

you can interact with the coroutine such as:

``` javascript
run(function*() {
  let effect
  effect = yield cor.getEffect()
  assert.deepEqual(effect, {runnable: getWeather, args: ['Bratislava']})
  cor.step('sunny')
  effect = yield cor.getEffect()
  assert.deepEqual(effect, {runnable: getWeather, args: ['Vienna']})
  cor.step('rainy')
  effect = yield cor.getEffect()
  assert.deepEqual(effect, {value: 'sunny in Bratislava, rainy in Vienna', done: true})
})
```
this way, we asserted what effects the coroutine tries to execute, and we did it without writing a
single mock!

# Using yacol with the outside world

### Every Promise is a yieldable
When yielded, yacol will hook on the promise `.then`, `.catch` callbacks and resumes execution only
after Promise finished. In other words, this is just as if you awaited the promise.

### Coroutine itself is Promise-like object
It has correctly implemented `.then` and `.catch` methods. For example, this means, it can be
returned from Mocha test, Mocha will wait until the coroutine (and all spawned sub-coroutines) are
terminated. If any of these produce (unhandled) error, this goes to top-level `.catch` handler and
therefore test is rejected.

### Working with Express
You can use coroutines as an express request handler and / or express middleware. With a little
boilerplate from yacol's expressHelpers, you can register your coroutine handler to the express app
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



# Stacktraces
Let me first illustrate the problem. Having a code like this (`examples/bad-stacktrace.js`):
```javascript
async function a() {
  throw new Error('yuck fou')
}

async function b() {
  const res = await a()
  return res + 1
}

async function c() {
  const res = await b()
  return res + 1
}

async function d() {
  const res = await c()
  return res + 1
}

async function main() {
  try {
    await d(1)
  } catch (e) {
    console.error(e)
  }
}

main()

```

the stacktrace looks such as:

```
Error: yuck fou
    at /path/to/this/file.js:2:9
    at next (native)
    at step (/path/to/this/file.js:60:191)
    at /path/to/this/file.js:60:437
    at new Promise (/home/mama/projo/yacol/node_modules/core-js/modules/es6.promise.js:191:7)
    at /path/to/this/file.js:60:99
    at a (/path/to/this/file.js:9:17)
    at /path/to/this/file.js:6:21
    at next (native)
    at step (/path/to/this/file.js:60:191)
```

Although, there is `file.js` mentioned multiple times, you won't find nothing useful at line 6 or
line 9. Line 60 does not even exists in this file! The only useful information in this long
stacktrace is, that the error is thrown at line 2. The mangled line numbering is clearly Babel's
work, but actually Babel is only part of the problem: the code, even if rewritten to plain Promise
language (so we don't need babel to transpile async / await) also produces stacktrace without much
meaningful information.

Let us see, what similar code in yacol gives us (`examples/awesome-stacktrace.js`)

```
--- ERROR ----
Error: yuck fou
    at a (/path/to/this/file.js:4:9)

runnable: a, args: [4]
    at b (/path/to/this/file.js:8:21)

runnable: b, args: [3]
    at c (/path/to/this/file.js:13:21)

runnable: c, args: [2]
    at d (/path/to/this/file.js:18:21)

runnable: d, args: [1]
    at /path/to/this/file.js:23:3

runnable: [Function], args: []
    at Object.<anonymous> (/path/to/this/file.js:22:1)
```

Not only you see all the relevant coroutines calling each other, you even see names of function
being called and arguments with which those functions were called!
