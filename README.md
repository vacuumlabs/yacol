[![CircleCI](https://circleci.com/gh/vacuumlabs/yacol.svg?style=svg)](https://circleci.com/gh/vacuumlabs/yacol)

Yet Another COroutine Library with some unique features.

# Why this
"Async and await is a great sugar, but we should put it on a better cake",
<div align="right">
-- probably Rich Hickey, freely --
</div>
<br />
<br />

Yacol is here to help you write better asynchronous code: without dangling promises, with proper
stacktraces and debug info in general, with the ability to (cleanly) terminate any operation you
need to and with cool CSP-inspired, built in messaging mechanism. The most important features which
make `yacol` much cooler than promises are:

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
If you want to kill a complex asynchronous operation (for example, your test timeouted and you want to dispose it cleanly before running next test), but there is nothing you can do. Wait, actually there is: you can use semi-global signaling variable and if-else all the stuff. Gross.
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

For the more detailed breakdown of individual features, see this
[section](https://github.com/vacuumlabs/yacol/blob/master/docs/features.md).
Apart from this goodness, the library plays really nice with promises and can be easily integrated with Express server.

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

In the basic example above, coroutines created from `run(slowSum, 1, 1)` and `run(slowSum, two, 1)` are children
of `run(main)`. The parent-child relationship is important for handling the errors.

# API documentation
Available [here](https://github.com/vacuumlabs/yacol/blob/master/docs/api.md)

# FAQ
Available [here](https://github.com/vacuumlabs/yacol/blob/master/docs/faq.md)

# Examples
Clone the repo, `cd` to `examples` directory and run `npm install` (it is the standalone npm
package). use `npm run start examplename.js` to execute the example with the local version of
babel-node

# Contributing

Pullrequests are welcomed. Things that would be great to have:

- More cool messaging utils (see js-csp for inspiration)
- Better tests on expresshelpers
- Performance optimization
- support response-describing objects as a return values in expresshelpers. For example, handler
  should be able to return:
```
{
  headers: {timespent: "100ms"}
  body: "{name: "john", surname: "doe"}"
}
```
