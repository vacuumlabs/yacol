[![CircleCI](https://circleci.com/gh/vacuumlabs/yacol.svg?style=svg)](https://circleci.com/gh/vacuumlabs/yacol)

Yet Another COroutine Library with some unique features.

# Why this
"... Promises and Futures are sort of lightweight constructs, you know, that are one-night-stands,
right? They're just handoffs or call and return scenarios. They can't really model enduring
connections. And so they're not actually helpful for this. So it's sugar. I mean, it's good sugar,
but I felt like we should put it on a better cake."
<div align="right">
-- Rich Hickey --
</div>
<br />
<br />

Yacol is here to help you write better asynchronous code: without dangling promises, with proper
stacktraces and debug info in general, with the ability to (cleanly) terminate any operation you
need to, and with cool CSP-inspired built in messaging mechanism. The most important features which
make `yacol` much cooler than promises are:

<table>
<tr>
<th> Issue </th> <th> Promises </th> <th> Yacol </th>
</tr>

<tr>
<td> Stacktraces </td>
<td> captures only relevant info from the last asynchronous call </td>
<td> captures **all relevant info** from the whole chain of async calls. You even get arguments
with which the async calls were executed! </td>
</tr>

<tr>
<td> Messaging </td>
<td> A promise represents just one value. For messaging, promise users typically use streams, such as RxJS
streams. Some people say that if you hike along the long learning curve, it's eventually a great
thing to work with.
</td>
<td>
CSP-like messaging system is built in. It is easy, intuitive and you'll be productive when learning
just a few basic operations
</td>
</tr>

<tr>
<td> Error handling</td>
<td> .catch on promise (async function) catches errors from all promises that are awaited (.then-ed) in the current promise chain. There is no way how to get errors from the dangling promises (async functions)
</td>
<td>
No error (unless you use the library in a hackish way) get passed around .catch handler on the parent coroutine
</td>
</tr>

<tr>
<td> When things complete</td>
<td>
Asynchronous operation completes when all awaited / .then-ed promises finish. There is no way to
wait for dangling promises
</td>
<td>
Coroutine completes when all sub-coroutines (awaited or not) finish
</td>
</tr>

<tr>
<td> Forced termination</td>
<td>
If you want to kill a complex asynchronous operation (for example, your test timeouted and you want to dispose it cleanly before running next test), there is nothing you can do. Wait, actually there is: you can use semi-global signaling variable and if-else all the stuff. Gross.
</td>
<td>
With coroutines, killing coroutine is as easy as `kill(cor)`. No work will be done after `kill` is
called, feel free to move on to the next test in your suite.
</td>
</tr>

<tr>
<td> Testability</td>
<td>
If your async functions can be injected, you can create mocks / stubs / spies and inject them instead of
doing the real stuff. Finally, mocks (and co.) will help you to reason (and assert) what the code was trying to
do
</td>
<td>
When calling `.inspect()` on a coroutine, the coroutine will be telling you what it is trying to yield (instead
of running it). Moreover, you can pass fake responses to these operations.
</td>
</tr>

</table>

For the more detailed breakdown of individual features, see this
[section](https://github.com/vacuumlabs/yacol/blob/master/docs/features.md).
Apart from this goodness, `yacol` plays really nice with promises and can be easily integrated with Express server.

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
  // run(fn, ...args) creates coroutine from generator function fn; args are passed as arguments
  // to fn
  const two = yield run(slowSum, 1, 1)
  console.log(two)
  const three = yield run(slowSum, two, 1)
  console.log(three)
}

run(main)
```

# Basic design principles

Yacol is organized around the concept of a coroutine. This is created from a generator
function (and some arguments for it). Coroutines resemble processes from your operating system, but with
collaborative multitasking.

When coroutine successfully terminates, it produces a single return value. This value can be yielded
by other coroutines. Furthermore, coroutine is aware of its parent - the coroutine, during which
execution it was created. This way, complex parent-child coroutine hierarchy is created. This hierarchy is
used in many ways:

- A coroutine terminates only after its generator returns and all its children coroutines
  terminate
- If an error is thrown, it can be caught on parent, grandparent, etc.,  coroutine.
- `kill` will terminate all children, grandchildren, etc., of a coroutine
- If a coroutine get's into error state, all its running children are killed
- If a coroutine reads value from its context (`context.get`) and the value is not found, the read
  escalates to parent context, grandparent context, etc.

In the basic example above, coroutines created from `run(slowSum, 1, 1)` and `run(slowSum, two, 1)` are children
of `run(main)`. The parent-child relationship is important for handling the errors.

## Error handling in a nutshell

Coroutine can get into error state when:
- yielding (result from) another coroutine which gets into error state
- yielding from Promise which gets rejected
- throwing an Error synchronously

When an error is produced, also coroutine's parent, grandparent, etc. get to error state, until `.catch`
handler is found. It does not matter whether parent yielded from a coroutine or whether it just ran
it for its side-effects, the error will bubble anyways. Once the error handler is found, it is used to process
the error. Return value from the error handler is used as a return value for the coroutine that
caught the error. This coroutine appears to have ended "naturally" with this result to all outside world.

```javascript
import {run} from 'yacol'

let c1, c2, c3, c4

c1 = run(function*() {
  c2 = run(function*() {
    c3 = run(function*() {
      throw new Error()
    })
  })
}).catch((e) => 47)

c4 = run(function*() {
  console.log(yield c1) // will return 47
  yield c2 // will produce an error
  yield c3 // will also produce an error
})
```

If the handler throws, the error-bubbling process continues with the re-throwed error.

If coroutine `corA` yields the value from the coroutine `corB` and `corB` gets to error state, `corA` also gets to error state. Consistently with paragraphs above, if `corB` catches the error and error handler produces value `val`, `cor1` will yield `val` as a correct result of `corB`. For example, the following code will output 47:

```javascript
run(function*() {
  const res = yield run(function*() {
    return (yield run(function*() {throw new Error()}))
  }).catch((e) => 47)
  console.log(res)
})
```
When a coroutine gets to error state, all its running sub-coroutines are automatically killed. There is
obviously not much sense in letting these coroutines do their work any more.

When a coroutine gets killed, all its running sub-coroutines are automatically killed and are
supposed to be in error state. This means that if `corA` yields from `corB` and `corB` gets
killed, `corA` gets to error state. If `corA` just runs `corB` and is not yielding from it,
`corA` will continue normally, since the "KillError" does not bubble.

# Features
Check out more detailed [breakdown of individual features](https://github.com/vacuumlabs/yacol/blob/master/docs/features.md)

# API documentation
Available [here](https://github.com/vacuumlabs/yacol/blob/master/docs/api.md)

# FAQ
Available [here](https://github.com/vacuumlabs/yacol/blob/master/docs/faq.md)

# Examples
Clone the repo, `cd` to `examples` directory and run `npm install` (it is the standalone npm
package). use `npm run start examplename.js` to execute the example with the local version of
babel-node

# Contributing

Pullrequests are welcome. Things that would be great to have:

- More cool messaging utils (see js-csp for inspiration)
- Better tests on expresshelpers
- Performance optimization
- support response-describing objects as return values in expresshelpers. For example, handler
  should be able to return:
```
{
  headers: {timespent: "100ms"}
  body: "{name: "john", surname: "doe"}"
}
```
