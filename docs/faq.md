# Q & A

Q: Can I create detached / dangling coroutines?

A: Yes, but you shouldn't. Check out .detached() for this.

Q: Can I mix standart Promises and Coroutines together?

A: Easily. Coroutine impements `.then` and `.catch` methods. Also, you can await plain Promises in async
methods. However, note that `.then` and `.catch` methods return new Promises and you lose Coroutine guarantees.

Q: If I schedule something for the next event loop (`setTimeout`) or create some separate Promise
chain, will this play nice with yacol's error-handling, coroutine termination, pretty stacktraces,
etc?

A: Sorry, no. Simply don't use `setTimeout`. Instead of

```javascript
setTimeout(() => {
  doThisLittleBitLater()
}, 10)
```

do:

```javascript
(async () => {
  await Promise.delay(10)
  doThisLittleBitLater()
})()
```

Also, normally you shouldn't convert Coroutines to Promises. Use Promises and promisified callbacks to integrate with 3rd
party APIs. Once 'on ramp', work with coroutines only.

Q: I've noticed you are using async functions with Mocha. Since async funtions now returns
Coroutines instead of Promises, how does this work? Don't you have to do some ugly Mocha-patching?

A: Since Coroutine is `.then` able and `.catch` able, all Promise-expecting libraries I've tried are OK with
Coroutines.

Q: I've noticed something about yacol providing custom CSP implementation (channels with blocking
syntax). Why is this? What's wrong about js-csp? And if you have the urge to reinvent the wheel, why
as a part of Yacol and not as a separate library?

A: Because it seems that CSP implementation and proper async function goes hand-in-hand. The proper
explanation is a little bit longer:

For example, take a simple pipe:

```
async function pipe() {
  while (true) {
    msg = await producer.take()
    consumer.put(msg)
  }
}

const pipeCoroutine = pipe()
```

Now imagine, you want to stop such pipe. How would you do that? Problem is that the pipe is 'stuck'
on awaiting current take. Since we don't controll, when the next message arives, we cannot do much
about it. Luckily, most CSP impementations provide 'race' function which basically is 'give me the
first message from any channel there is'. Using this, we can terminate the pipe such as:
```
while(true) {
  const msg = await race(producer, killSignalChannel)
  if (msg is kill signal) {
    break
  } else {
    consumer.put(msg)
  }
}
```
This would work but at what cost! We have to maintain a separate `killSignalChannel` for all pipes we want to
end! Terminating things is quite an issue with many CSPs implementations. Luckily, with yacol we can end the previous
pipe! It's as simple as:
```
kill(pipeCoroutine)
```
this will work, because, .take() is just another coroutine which knows how to terminate itself.
It's beautiful and clean, however it needs for channel.take() to integrate more deeply with the coroutine mechanism.
