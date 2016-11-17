[![CircleCI](https://circleci.com/gh/vacuumlabs/yacol.svg?style=svg)](https://circleci.com/gh/vacuumlabs/yacol)

Yet Another COroutine Library with some unique features.

# Why this
"Async and await is a great sugar, but we should put it on a better cake",

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; -- probably Rich Hickey, freely --

These are the most important (and most cool) diferences from standard Promise - based approach. Note
that all issues are valid for old-school Promise + .then syntax as well as for the cooler Promise + async +
await approach.

<table>
<tr> 
<th> Issue </th> <th> Promises </th> <th> Yacol </th>
</tr>

<tr>
<td> Stacktraces </td>
<td> captures only relevant info from the last asynchronous call </td>
<td> captures **all relevant info** from the whole chain of async calls. You even see arguments
with what were the async calls executed! </td>
</tr>

<tr>
<td> Messaging </td>
<td> Promise represents just one value. For messaging, promise users typically use streams, such as RxJS
streams. Some people say that if you hike along the long learning curve, it's eventualy a great
thing to work with.
</td>
<td>
CSP-like messaging system is built in. It is easy, intuitive and you'll be productive when learning
just a few basic operations
</td>
</tr>

<tr>
<td> Error handling</td>
<td> .catch on promise (async function) catches errors from all promises that are awaited (.then-ed) in the current promise chain. There is no way how to get errors from the danglig promises (async functions)
</td>
<td>
No error (unless you use the library in a hackish way) get passed around .catch handler on the parent coroutine
</td>
</tr>

<tr>
<td> When things complete</td>
<td>
Asynchronous operation completes, when all awaited / .then-ed promises completes. There is no way to
wait for dangling promises
</td>
<td>
Coroutine completes when all sub-coroutines (awaited or not) have finished
</td>
</tr>

<tr>
<td> Forced termination</td>
<td>
If you want to kill a complex asynchronous operation (for example, your test timeouted and you want to dispose it cleanly before running next test), but there is nothing you can do. Wait, actually there is: you can use semi-global signalling variable and if-else all the stuff. Gross. 
</td>
<td>
With coroutines, killing coroutine is as easy as `kill(cor)`. No work will be done after `kill` is
called, feel free to move on the next test in your suite.
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
When calling `.inspect()` on a coroutine, the coroutine will tell you what it tries to do (instead
of doing it). Moreover you can pass fake responses to these operations.
</td>
</tr>

</table>

Apart from this, the library plays really nice with promises and can be easily integrated with
Express server. Check out [features]().

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

# Basic design principles

Yacol is organized around the concept of coroutine. This is created from a generator
function (and some arguments for it). Coroutines resembles processes from your operating system but with
collaborative multitasking.

When coroutine successfully terminates, it produces a single return value. This value can be yielded
by other coroutines. Furthermore, coroutine is aware of its parent - the coroutine, during which run
it was created. This way, complex parent-child coroutine hierarchy is created. This hierarchy is
used in many ways:

- Coroutine terminates only after it's generator returns and all the children coroutines
  terminates
- If error is thrown, it can be caught on parent, grandparent, etc..,  coroutine.
- `kill` will terminate all children, grandchildren, etc, of a coroutine
- if coroutine reads a value from its context (`context.get` and the value is not found, the read
  escalates to parent context, grandparent context, etc..)

In the basic exaple above, coroutines created from `run(slowSum, 1, 1)` and `run(slowSum, two, 1)` are children
of `run(main)`. The parent-child relationship is important for handling the errors.

# Contributing

Pullrequests are welcomed.
