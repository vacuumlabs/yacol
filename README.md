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

- [Install](https://github.com/vacuumlabs/yacol/blob/master/docs/install.md)
- [API docs](https://github.com/vacuumlabs/yacol/blob/master/docs/api.md)
- [FAQ](https://github.com/vacuumlabs/yacol/blob/master/docs/faq.md)
- see running [Examples](https://github.com/vacuumlabs/yacol/blob/master/examples)

Yacol is here to patch behavior of async and await keywords. Typically, your code written with async, await and standard Promisses should work seamlessly with Yacol. With Yacol, you are given better error handling, better termination of dangling promises; futhermore you can kill the asynchronous functions and use async functions' context - similar to (deprecated) domains in node.js. Let's see some examples. First, you can do beautiful error handling such as:


```javascript
try {
  await asyncFunctionIHaveNoTimeToReviewSoImAffraidOfAsyncErrors()
} catch (err) {
  // yup, all the errors will go here. Even those from not awaited asynchronous functions.
}
```

Yop, it's that easy. Full example:

```javascript
async function doThrow() {
  throw new Error('SAD')
}

async function fn() {
  // it doesn't matter, whether we await doThrow or not: when error is throwed, fn ends up errorneous
  doThrow()
}

async function main() {
  try {
    await fn() // only in try-catch block the await must not be forgotten
  } catch (e) {
    console.log('Unlike with standard promises, error will be caught')
  }
}

main()
```

This is, how kill works:

```javascript
import {Promise} from 'bluebird'

async function test() {
  const time = 2500 // feels like forever
  await Promise.delay(time)
  console.log('this will print if time < 1000')
}

async function runTestForAtMost1Sec() {
  const testCor = test(); // start async function, but don't wait for it
  (async () => { // start second coroutine with purpose only to kill the first one after given timeout
    await Promise.delay(1000)
    kill(testCor)
  })()
}
```

Context is namespace, which can be read and write by parent coroutine and read by child coroutines.
It's similar to node.js (deprecated) domains or Dart zones. You can use it as simple as:

```javascript
import {context} from 'yacol'

async function contextDemo() {
  context.set('hello', 'world');
  (async () => {
    console.log('if this prints "world", I can read a value from my parent context')
    console.log(context.get('hello'))
  })()
}

contextDemo()
```

Furthermore, check out examples to see more:
- how meaningful stacktraces can be
- how to use with Express
- messaging features!
