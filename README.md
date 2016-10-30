[![CircleCI](https://circleci.com/gh/vacuumlabs/yacol.svg?style=svg)](https://circleci.com/gh/vacuumlabs/yacol)

Yet Another COroutine Library with some unique features.

# Rationale
"Async and await is a great sugar, but we should put it on a better cake",

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; -- probably Rich Hickey, freely --

There are many issues, which you cannot solve by Promises. Yacol attempts to solve some of them:

### Proper notion of termination
No more dangling Promises! See example [here](#coroutine-termination)

### Awesome stacktraces
TLDR: Compared to crippled async stacktraces, yacol provides information that really helps you. Take a look at [here](#stacktraces)

### Messaging
In a promise-based code, your best friends for 'I want to produce some message from time to time'
are streams. However, without mastering RxJS-fu, streams will probably do you more harm then good.
CSP-based messaging of yacol is much more intuitive and surprisingly powerful even without the RxJS
stuff. Take a look at a simple messaging example [here](#messaging)

### Unhandled exceptions
This is related to the termination problem. Error thrown in a Promise without attached
`.then` or `.catch` (i.e. not `await`ed) cannot be handled. If you are using decent Promise
implementation such as Bluebird, you'll at least see some error (without proper stacktrace) in the
console. With default ES6 Promise, the error is silently swallowed. This is not cool! Check out
[Error handling](#error-handling) section.

### Forced termination
Imagine you created a long running computation and suddenly you realize, you are not interested in
its result any more. What can you do with Promises? At your best, you can terminate the main,
top-level promise. But what about other 'jobs' you created? With yacol, terminating the coroutine
and ALL it's sub-coroutines cleanly is as easy as `kill(cor)` [Find out more](#killing-coroutines)

### Great testability
You can test your asynchronous code without having to write a single mock! [See how it works](#inspect)

### Context awareness

All coroutines are aware of their context, can read and write from/to it. See [context](#context)

### Patch
Continuations in js? [You must be kidding me](#what-is-patch)

### Oh and BTW 
it plays [really nicely](#using-yacol-with-the-outside-world) with your existing code!

# Basic design principles

Yacol is organized around the concept of coroutine. This is created from a generator
function (and some arguments for it). Coroutines resembles processes from your operating system but with
collaborative multitasking.

When coroutine successfully terminates, it produces a single return value. This value can be yielded
by other coroutines. Furthermore, coroutine is aware of its parent - the coroutine it was created
within. This way, complex parent-child coroutine hierarchy is created. This is important (mainly)
for two most basic yacol's principles:

- Coroutine terminates only after it's generator returns and **all the children coroutines
  terminates**
- If error is thrown, it can be caught on parent, grandparent, etc..,  coroutine.

In both rules above it does not matter, if parent yielded the child's result or not.

# Simple example

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
... to be written

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
... to be written

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
being called and arguments with which those functions were called! The only thing necessary to have
such stacktraces is to attach `prettyErrorLog` as a top-level error handler.

# Q & A

Q: Most errors in Promise land happens because someone forgot to `await` or `.then` them. I believe,
that forgetting `yield` in yacol is harmless, but what happens if I forgot `run`, i.e.
instead of `yield run(fn, arg1, arg2)` I simply write `fn(arg1, arg2)` ?

A: With `fn` being a generator, nothing will happen. No work will be done and very soon you'll
discover, there is an error somewhere. It is similar as if instead of `array.pop()` you write
`array.pop;`. Not good, but you'll probably catch the error pretty soon.


Q: Can I create detached / dangling coroutines

A: Yes, but you shouldn't. For example you can do whatever you want in `setTimeout`'s callback, this
is completely separated dimension.


Q: So if I schedule something for a next event loop (`setTimeout`) or create some separate Promise
chain, yacol won't help me with its magic?

A: Sorry, no. Don't do that. Don't use `setTimeout`, don't use `.then`, don't use `await`. Unless connecting some 3rd party library to yacol environment, you probably never have to.


Q: I hate stupid `yield run(fn, arg1, arg2)` syntax.

A: The main reason why it is there are the awesome stacktraces. They are much cooler than the
basic node stacktraces and IMO worth the cost. By the way, yes, this is Lisp's revenge!

